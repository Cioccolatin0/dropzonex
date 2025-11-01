"""FastAPI application serving Dropzone X backend-rendered lobby and APIs."""
from __future__ import annotations

import random
import time
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .matchmaker import Matchmaker

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "backend" / "static"
TEMPLATE_DIR = BASE_DIR / "backend" / "templates"

app = FastAPI(title="Dropzone X Backend", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory=str(TEMPLATE_DIR))
matchmaker = Matchmaker()


@app.on_event("startup")
async def startup() -> None:
    await matchmaker.start()


@app.get("/", response_class=HTMLResponse)
async def landing(request: Request) -> HTMLResponse:
    lobby_payload = await _build_lobby_payload()
    active_view = request.query_params.get("view", "play")
    if active_view not in {"play", "pass", "locker", "shop", "profile"}:
        active_view = "play"
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "lobby": lobby_payload,
            "active_view": active_view,
        },
    )


@app.get("/api/lobby")
async def lobby() -> Dict:
    return await _build_lobby_payload()


@app.post("/api/queue")
async def queue_player(payload: Dict) -> Dict:
    display_name = payload.get("displayName") or _random_pilot_name()
    session = await matchmaker.enqueue(display_name)
    data = await matchmaker.serialize_session(session.session_id)
    return JSONResponse(data)


@app.get("/api/session/{session_id}")
async def session_status(session_id: str) -> Dict:
    data = await matchmaker.serialize_session(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(data)


@app.post("/api/session/{session_id}/start")
async def acknowledge(session_id: str) -> Dict:
    match = await matchmaker.acknowledge_match(session_id)
    if not match:
        raise HTTPException(status_code=404, detail="Session not ready")
    serialized = await matchmaker.serialize_match(match.match_id)
    match_url = f"/match/{match.match_id}?session={session_id}"
    return {
        "matchId": match.match_id,
        "startedAt": match.started_at,
        "match": serialized,
        "matchUrl": match_url,
    }


@app.post("/api/session/{session_id}/cancel")
async def cancel(session_id: str) -> Dict:
    cancelled = await matchmaker.cancel(session_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"cancelled": True}


@app.get("/match/{match_id}", response_class=HTMLResponse)
async def match_view(request: Request, match_id: str, session: Optional[str] = None) -> HTMLResponse:
    match_payload = await matchmaker.serialize_match(match_id)
    if not match_payload:
        raise HTTPException(status_code=404, detail="Match not found")

    session_payload = None
    if session:
        session_payload = await matchmaker.serialize_session(session)
    return templates.TemplateResponse(
        "match.html",
        {
            "request": request,
            "match": match_payload,
            "session": session_payload,
        },
    )


def _random_pilot_name() -> str:
    suffix = random.randint(1000, 9999)
    return f"Pilota-{suffix}"


async def _build_lobby_payload() -> Dict:
    snapshot = await matchmaker.lobby_snapshot()
    return {
        "hero": {
            "displayName": "Pilota Zenith",
            "level": 58,
            "xpProgress": 0.54,
            "title": "Operatore di Apex Squadron",
            "loadout": {
                "primary": "Fucile a impulsi VX-9",
                "secondary": "Pistola plasma Viper",
                "gadget": "Drone di ricognizione",
            },
        },
        "currencies": {
            "credits": 1250,
            "flux": 460,
            "tokens": 12,
        },
        "battlePass": {
            "level": 27,
            "progress": 0.54,
            "rewards": [
                {"tier": 28, "reward": "Skin arma - Aurora"},
                {"tier": 29, "reward": "Spray - Onda Quantum"},
                {"tier": 30, "reward": "Emote - Drop dinamico"},
            ],
        },
        "activity": snapshot,
        "dailyHighlight": {
            "mode": random.choice(["Assalto Orbitale", "Corsa ai Dati", "Dominio"]),
            "map": random.choice(["Nova Prime", "Cittadella Sospesa", "Canyon Elettrico"]),
        },
        "news": {
            "headline": "Operazione Nebula in arrivo",
            "blurb": "Nuovi obiettivi dinamici e ricompense a tempo limitato ogni settimana.",
        },
        "locker": {
            "outfit": "Sentinella Prisma",
            "backbling": "Nucleo Orbitale",
            "pickaxe": "Falce Ionica",
            "glider": "Ala Luminosa",
            "wrap": "Circuito Neon",
            "emotes": ["Scia Nova", "Cadenza Zero"],
        },
        "shop": {
            "featured": [
                {"name": "Bundle Eclissi", "price": 2400, "rarity": "Leggendario"},
                {"name": "Sentinella Prisma", "price": 2000, "rarity": "Epico"},
            ],
            "daily": [
                {"name": "Scia Holo", "price": 800, "rarity": "Raro"},
                {"name": "Emote Drift", "price": 500, "rarity": "Non Comune"},
                {"name": "Avvolgimento Ion", "price": 300, "rarity": "Comune"},
            ],
        },
        "profile": {
            "matchesPlayed": 326,
            "wins": 47,
            "winRate": 14.4,
            "kdr": 3.2,
            "timePlayedMinutes": 5420,
        },
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
