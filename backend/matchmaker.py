"""Matchmaking and session management for Dropzone X."""
from __future__ import annotations

import asyncio
import contextlib
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .cosmetics import CosmeticRepository


BOT_NAMES = [
    "Specter-09",
    "NovaWarden",
    "PulseShade",
    "Vector Lynx",
    "Iris Vanguard",
    "EchoMancer",
    "Zephyr Fang",
    "Atlas Ronin",
    "Sable Riot",
    "Quantum Viper",
]

GAME_MODES = [
    ("Assalto Orbitale", "Stazione Nova Prime"),
    ("Corsa ai Dati", "Cittadella Sospesa"),
    ("Dominio", "Canyon Elettrico"),
]


@dataclass
class PlayerSession:
    session_id: str
    player_id: str
    display_name: str
    joined_at: float
    status: str = "waiting"
    match_id: Optional[str] = None
    squad_id: Optional[str] = None
    last_update: float = field(default_factory=lambda: time.time())
    match_payload: Optional[Dict] = None
    cosmetic_profile: Dict = field(default_factory=dict)


@dataclass
class Match:
    match_id: str
    squads: List[Dict]
    mode: str
    map_name: str
    created_at: float
    capacity: int
    started_at: Optional[float] = None


class Matchmaker:
    """In-memory matchmaking service with bot fallback."""

    def __init__(
        self,
        cosmetics: CosmeticRepository,
        *,
        team_size: int = 3,
        players_per_match: int = 60,
        max_wait_time: float = 15.0,
    ) -> None:
        self.cosmetics = cosmetics
        self.team_size = max(1, team_size)
        self.players_per_match = max(self.team_size, players_per_match)
        self.max_wait_time = max_wait_time
        self._sessions: Dict[str, PlayerSession] = {}
        self._waiting_order: List[str] = []
        self._matches: Dict[str, Match] = {}
        self._lock = asyncio.Lock()
        self._ticker: Optional[asyncio.Task] = None

    async def start(self) -> None:
        if self._ticker is None:
            self._ticker = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._ticker is not None:
            self._ticker.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._ticker
            self._ticker = None

    async def enqueue(self, display_name: str) -> PlayerSession:
        session = PlayerSession(
            session_id=str(uuid.uuid4()),
            player_id=str(uuid.uuid4()),
            display_name=display_name,
            joined_at=time.time(),
            cosmetic_profile=self.cosmetics.player_agent_payload(),
        )
        async with self._lock:
            self._sessions[session.session_id] = session
            self._waiting_order.append(session.session_id)
        return session

    async def get_session(self, session_id: str) -> Optional[PlayerSession]:
        async with self._lock:
            return self._sessions.get(session_id)

    async def acknowledge_match(self, session_id: str) -> Optional[Match]:
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or not session.match_id:
                return None
            match = self._matches.get(session.match_id)
            if match and match.started_at is None:
                match.started_at = time.time()
            if not match:
                return None

            payload = self._serialize_match_locked(match, include_estimate=False, perspective=session)

            for other in self._sessions.values():
                if other.match_id == match.match_id:
                    if other.session_id == session_id:
                        other.status = "playing"
                        other.match_payload = payload
                    else:
                        other.match_payload = self._serialize_match_locked(
                            match,
                            include_estimate=False,
                            perspective=other,
                        )
                    other.last_update = time.time()

            return match

    async def cancel(self, session_id: str) -> bool:
        async with self._lock:
            session = self._sessions.pop(session_id, None)
            if not session:
                return False
            with contextlib.suppress(ValueError):
                self._waiting_order.remove(session_id)
            return True

    async def _run(self) -> None:
        try:
            while True:
                await asyncio.sleep(0.5)
                await self._tick()
        except asyncio.CancelledError:
            pass

    async def _tick(self) -> None:
        now = time.time()
        async with self._lock:
            self._waiting_order = [sid for sid in self._waiting_order if self._sessions.get(sid)]
            ready_sessions = [self._sessions[sid] for sid in self._waiting_order if self._sessions[sid].status == "waiting"]

            full_capacity = self.players_per_match
            while len(ready_sessions) >= full_capacity:
                batch = ready_sessions[:full_capacity]
                await self._create_match(batch)
                ready_sessions = [s for s in ready_sessions if s.status == "waiting"]

            if ready_sessions:
                oldest = ready_sessions[0]
                if now - oldest.joined_at >= self.max_wait_time:
                    await self._create_match(ready_sessions)

    async def _create_match(self, participants: List[PlayerSession]) -> None:
        match_id = str(uuid.uuid4())
        mode, map_name = random.choice(GAME_MODES)
        human_sessions = list(participants)
        capacity = self.players_per_match
        squads: List[Dict] = []

        def ensure_squad(index: int) -> Dict:
            if index < len(squads):
                return squads[index]
            squad = {
                "squadId": f"squad-{uuid.uuid4().hex[:6]}",
                "members": [],
                "isBotSquad": True,
                "teamColor": self._team_color(len(squads)),
            }
            squads.append(squad)
            return squad

        for idx, session in enumerate(human_sessions):
            squad_index = idx // self.team_size
            squad = ensure_squad(squad_index)
            member = self._build_member_entry(
                display_name=session.display_name,
                is_bot=False,
                player_id=session.player_id,
                cosmetic=session.cosmetic_profile,
            )
            squad["members"].append(member)
            squad["isBotSquad"] = False
            session.status = "matched"
            session.match_id = match_id
            session.squad_id = squad["squadId"]
            session.last_update = time.time()
            if session.session_id in self._waiting_order:
                self._waiting_order.remove(session.session_id)

        current_players = len(human_sessions)
        if current_players < capacity:
            slots_remaining = capacity - current_players
            random.shuffle(BOT_NAMES)
            for slot in range(slots_remaining):
                squad_index = (current_players + slot) // self.team_size
                squad = ensure_squad(squad_index)
                bot_profile = self.cosmetics.random_outfit()
                bot_member = self._build_member_entry(
                    display_name=BOT_NAMES[slot % len(BOT_NAMES)],
                    is_bot=True,
                    player_id=f"bot-{uuid.uuid4()}",
                    cosmetic=bot_profile,
                )
                bot_member["behavior"] = random.choice(["aggressive", "balanced", "defensive"])
                squad["members"].append(bot_member)

        match = Match(
            match_id=match_id,
            squads=squads,
            mode=mode,
            map_name=map_name,
            created_at=time.time(),
            capacity=capacity,
        )
        self._matches[match_id] = match

        for session in human_sessions:
            session.match_payload = self._serialize_match_locked(
                match,
                include_estimate=True,
                perspective=session,
            )

    async def serialize_session(self, session_id: str) -> Optional[Dict]:
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None
            payload = {
                "sessionId": session.session_id,
                "status": session.status,
                "playerId": session.player_id,
                "displayName": session.display_name,
                "squadId": session.squad_id,
                "cosmetics": session.cosmetic_profile,
            }
            if session.status == "waiting":
                position = self._waiting_order.index(session_id) + 1 if session_id in self._waiting_order else 1
                payload["queuePosition"] = position
                payload["playersSearching"] = len(self._waiting_order)
            if session.match_payload:
                payload["match"] = session.match_payload
            return payload

    async def serialize_match(self, match_id: str) -> Optional[Dict]:
        async with self._lock:
            match = self._matches.get(match_id)
            if not match:
                return None
            return self._serialize_match_locked(match, include_estimate=False)

    async def serialize_match_for_session(self, match_id: str, session_id: str) -> Optional[Dict]:
        async with self._lock:
            match = self._matches.get(match_id)
            if not match:
                return None
            session = self._sessions.get(session_id)
            return self._serialize_match_locked(match, include_estimate=False, perspective=session)

    async def lobby_snapshot(self) -> Dict:
        async with self._lock:
            active_matches = len([m for m in self._matches.values() if m.started_at and (time.time() - m.started_at) < 900])
            return {
                "onlinePlayers": max(len(self._sessions), len(self._waiting_order) + active_matches * self.players_per_match),
                "searching": len(self._waiting_order),
                "activeMatches": active_matches,
            }

    def _serialize_match_locked(
        self,
        match: Match,
        *,
        include_estimate: bool,
        perspective: Optional[PlayerSession] = None,
    ) -> Dict:
        total_members = sum(len(squad["members"]) for squad in match.squads)
        payload = {
            "matchId": match.match_id,
            "mode": match.mode,
            "map": match.map_name,
            "squads": match.squads,
            "capacity": match.capacity,
            "startedAt": match.started_at,
            "playerCount": total_members,
        }
        if perspective and perspective.squad_id:
            payload["playerSquadId"] = perspective.squad_id
            squad = next((s for s in match.squads if s["squadId"] == perspective.squad_id), None)
            if squad:
                payload["playerSquad"] = squad
        if perspective and perspective.cosmetic_profile:
            payload["playerAgent"] = perspective.cosmetic_profile
        else:
            payload["playerAgent"] = self.cosmetics.player_agent_payload()
        if include_estimate:
            payload["estimatedStart"] = time.time() + 3
        return payload

    def _build_member_entry(self, *, display_name: str, is_bot: bool, player_id: str, cosmetic: Dict) -> Dict:
        entry = {
            "playerId": player_id,
            "displayName": display_name,
            "isBot": is_bot,
            "cosmetics": cosmetic,
        }
        return entry

    def _team_color(self, index: int) -> str:
        palette = ["#5ffff1", "#ff6ad5", "#ffd166", "#7b8bff", "#50fa7b", "#ff5555"]
        return palette[index % len(palette)]
