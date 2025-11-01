"""Matchmaking and session management for Dropzone X."""
from __future__ import annotations

import asyncio
import contextlib
import math
import random
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Set

from starlette.websockets import WebSocket

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
    user_id: int
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
    map_layout: Optional[Dict] = None


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
        self._subscribers: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def start(self) -> None:
        if self._ticker is None:
            self._ticker = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._ticker is not None:
            self._ticker.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._ticker
            self._ticker = None

    async def enqueue(self, *, user_id: int, display_name: str, cosmetic_profile: Dict) -> PlayerSession:
        session = PlayerSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            player_id=str(uuid.uuid4()),
            display_name=display_name,
            joined_at=time.time(),
            cosmetic_profile=cosmetic_profile,
        )
        async with self._lock:
            self._sessions[session.session_id] = session
            self._waiting_order.append(session.session_id)
        await self._notify_sessions(self._waiting_order)
        return session

    async def register_websocket(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            if session_id not in self._sessions:
                payload = {"sessionId": session_id, "status": "closed"}
                subscribers: List[WebSocket] = []
            else:
                self._subscribers[session_id].add(websocket)
                payload = self._session_payload(self._sessions[session_id])
                subscribers = [websocket]
        if payload and subscribers:
            await self._fanout(session_id, subscribers, payload)
        elif payload:
            await websocket.send_json(payload)
            await websocket.close()

    async def unregister_websocket(self, session_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            if session_id in self._subscribers and websocket in self._subscribers[session_id]:
                self._subscribers[session_id].remove(websocket)

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

            affected_sessions: List[str] = []
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
                    affected_sessions.append(other.session_id)

            return match
        await self._notify_sessions(affected_sessions)

    async def cancel(self, session_id: str) -> bool:
        async with self._lock:
            session = self._sessions.pop(session_id, None)
            if not session:
                return False
            with contextlib.suppress(ValueError):
                self._waiting_order.remove(session_id)
        await self._notify_sessions([session_id])
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
        await self._notify_sessions(self._waiting_order)

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

        map_layout = self._generate_battlefield(len(squads), capacity)
        match = Match(
            match_id=match_id,
            squads=squads,
            mode=mode,
            map_name=map_name,
            created_at=time.time(),
            capacity=capacity,
            map_layout=map_layout,
        )
        self._matches[match_id] = match

        for session in human_sessions:
            session.match_payload = self._serialize_match_locked(
                match,
                include_estimate=True,
                perspective=session,
            )
        await self._notify_sessions([s.session_id for s in human_sessions])

    async def serialize_session(self, session_id: str) -> Optional[Dict]:
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None
            return self._session_payload(session)

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

    def _session_payload(self, session: PlayerSession) -> Dict:
        payload = {
            "sessionId": session.session_id,
            "status": session.status,
            "playerId": session.player_id,
            "displayName": session.display_name,
            "userId": session.user_id,
            "squadId": session.squad_id,
            "cosmetics": session.cosmetic_profile,
        }
        if session.status == "waiting":
            position = self._waiting_order.index(session.session_id) + 1 if session.session_id in self._waiting_order else 1
            payload["queuePosition"] = position
            payload["playersSearching"] = len(self._waiting_order)
        if session.match_payload:
            payload["match"] = session.match_payload
        return payload

    async def lobby_snapshot(self) -> Dict:
        async with self._lock:
            active_matches = len([m for m in self._matches.values() if m.started_at and (time.time() - m.started_at) < 900])
            return {
                "onlinePlayers": max(len(self._sessions), len(self._waiting_order) + active_matches * self.players_per_match),
                "searching": len(self._waiting_order),
                "activeMatches": active_matches,
            }

    async def _notify_sessions(self, session_ids: Iterable[str]) -> None:
        unique_ids = list(dict.fromkeys(session_ids))
        if not unique_ids:
            return
        payloads: List[tuple[str, List[WebSocket], Dict]] = []
        async with self._lock:
            for session_id in unique_ids:
                session = self._sessions.get(session_id)
                payload = self._session_payload(session) if session else {"sessionId": session_id, "status": "closed"}
                subscribers = list(self._subscribers.get(session_id, []))
                if subscribers:
                    payloads.append((session_id, subscribers, payload))
        for session_id, subscribers, payload in payloads:
            await self._fanout(session_id, subscribers, payload)

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
        if match.map_layout:
            payload["mapLayout"] = match.map_layout
        return payload

    async def _fanout(self, session_id: str, subscribers: List[WebSocket], payload: Dict) -> None:
        stale: List[WebSocket] = []
        for socket in subscribers:
            try:
                await socket.send_json(payload)
            except Exception:
                stale.append(socket)
        if stale:
            async with self._lock:
                for socket in stale:
                    if session_id in self._subscribers:
                        self._subscribers[session_id].discard(socket)

    def _generate_battlefield(self, squad_count: int, capacity: int) -> Dict:
        radius = 950.0
        spawn_points: List[Dict] = []
        for index in range(capacity):
            angle = (2 * math.pi * index) / capacity
            spawn_points.append(
                {
                    "id": f"spawn-{index}",
                    "position": [round(math.cos(angle) * radius, 2), 0.0, round(math.sin(angle) * radius, 2)],
                    "rotation": [0.0, round(-angle, 3), 0.0],
                    "squad": index % max(1, squad_count),
                }
            )

        loot_zones = [
            {
                "name": "Cupola Zenith",
                "position": [0.0, 0.0, 0.0],
                "radius": 140.0,
                "rarity": "legendary",
            },
            {
                "name": "Mercato Orbitale",
                "position": [420.0, 0.0, -260.0],
                "radius": 110.0,
                "rarity": "rare",
            },
            {
                "name": "Hangar Prisma",
                "position": [-360.0, 0.0, 340.0],
                "radius": 130.0,
                "rarity": "epic",
            },
        ]

        safe_phases = []
        base_radius = 1100.0
        center = [0.0, 0.0]
        for phase in range(1, 6):
            shrink_radius = round(base_radius - phase * 160, 2)
            center_offset_x = round(center[0] + random.uniform(-120, 120), 2)
            center_offset_z = round(center[1] + random.uniform(-120, 120), 2)
            safe_phases.append(
                {
                    "phase": phase,
                    "radius": max(220.0, shrink_radius),
                    "duration": 120 + phase * 30,
                    "center": [center_offset_x, 0.0, center_offset_z],
                }
            )

        return {
            "spawnPoints": spawn_points,
            "lootZones": loot_zones,
            "safePhases": safe_phases,
            "biome": "Apex Expanse",
        }

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
