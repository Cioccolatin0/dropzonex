"""FastAPI application serving Dropzone X backend-rendered lobby and APIs."""
from __future__ import annotations

import random
import time
from pathlib import Path
from typing import Dict

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
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "lobby": lobby_payload},
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
    return {
        "matchId": match.match_id,
        "startedAt": time.time(),
    }


@app.post("/api/session/{session_id}/cancel")
async def cancel(session_id: str) -> Dict:
    cancelled = await matchmaker.cancel(session_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"cancelled": True}


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
        },
        "currencies": {
            "credits": 1250,
            "flux": 460,
            "tokens": 12,
        },
        "battlePass": {
            "level": 27,
            "progress": 0.54,
        },
        "activity": snapshot,
        "dailyHighlight": {
            "mode": random.choice(["Assalto Orbitale", "Corsa ai Dati", "Dominio"]),
            "map": random.choice(["Nova Prime", "Cittadella Sospesa", "Canyon Elettrico"]),
        },
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
