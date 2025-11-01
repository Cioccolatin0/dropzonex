"""Matchmaking and session management for Dropzone X."""
from __future__ import annotations

import asyncio
import contextlib
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional


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
    last_update: float = field(default_factory=lambda: time.time())
    match_payload: Optional[Dict] = None


@dataclass
class Match:
    match_id: str
    players: List[Dict]
    bots: List[Dict]
    mode: str
    map_name: str
    created_at: float
    started_at: Optional[float] = None


class Matchmaker:
    """In-memory matchmaking service with bot fallback."""

    def __init__(self, party_size: int = 4, max_wait_time: float = 12.0) -> None:
        self.party_size = party_size
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

            payload = self._serialize_match_locked(match, include_estimate=False)

            for other in self._sessions.values():
                if other.match_id == match.match_id:
                    if other.session_id == session_id:
                        other.status = "playing"
                    other.match_payload = payload
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

            while len(ready_sessions) >= self.party_size:
                batch = ready_sessions[: self.party_size]
                await self._create_match(batch)
                ready_sessions = ready_sessions[self.party_size :]

            if ready_sessions:
                oldest = ready_sessions[0]
                if now - oldest.joined_at >= self.max_wait_time:
                    await self._create_match(ready_sessions)

    async def _create_match(self, participants: List[PlayerSession]) -> None:
        match_id = str(uuid.uuid4())
        mode, map_name = random.choice(GAME_MODES)
        player_entries: List[Dict] = []
        bots: List[Dict] = []

        for session in participants:
            player_entry = {
                "playerId": session.player_id,
                "displayName": session.display_name,
                "isBot": False,
            }
            player_entries.append(player_entry)

        spots_left = max(0, self.party_size - len(player_entries))
        random.shuffle(BOT_NAMES)
        for i in range(spots_left):
            bot_name = BOT_NAMES[i % len(BOT_NAMES)]
            bots.append(
                {
                    "playerId": f"bot-{uuid.uuid4()}",
                    "displayName": bot_name,
                    "isBot": True,
                    "behavior": random.choice(["aggressive", "balanced", "defensive"]),
                }
            )

        match = Match(
            match_id=match_id,
            players=player_entries,
            bots=bots,
            mode=mode,
            map_name=map_name,
            created_at=time.time(),
        )
        self._matches[match_id] = match

        for session in participants:
            session.status = "matched"
            session.match_id = match_id
            session.match_payload = self._serialize_match_locked(match, include_estimate=True)
            session.last_update = time.time()
            if session.session_id in self._waiting_order:
                self._waiting_order.remove(session.session_id)

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

    async def lobby_snapshot(self) -> Dict:
        async with self._lock:
            active_matches = len([m for m in self._matches.values() if m.started_at and (time.time() - m.started_at) < 900])
            return {
                "onlinePlayers": max(len(self._sessions), len(self._waiting_order) + active_matches * self.party_size),
                "searching": len(self._waiting_order),
                "activeMatches": active_matches,
            }

    def _serialize_match_locked(self, match: Match, *, include_estimate: bool) -> Dict:
        payload = {
            "matchId": match.match_id,
            "mode": match.mode,
            "map": match.map_name,
            "squad": match.players + match.bots,
            "startedAt": match.started_at,
        }
        if include_estimate:
            payload["estimatedStart"] = time.time() + 3
        return payload
