"""FastAPI application serving Dropzone X frontend and backend services."""
from __future__ import annotations

import random
import time
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .matchmaker import Matchmaker

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="Dropzone X API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

matchmaker = Matchmaker()


@app.on_event("startup")
async def startup() -> None:
    await matchmaker.start()


@app.get("/api/lobby")
async def lobby() -> Dict:
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


def _random_pilot_name() -> str:
    suffix = random.randint(1000, 9999)
    return f"Pilota-{suffix}"


app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
