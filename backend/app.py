"""FastAPI application serving Dropzone X backend-rendered lobby and APIs."""
from __future__ import annotations

import random
import time
from pathlib import Path
from typing import Dict, Optional

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import (
    create_access_token,
    get_current_user,
    hash_password,
    register_session_token,
    revoke_session_token,
    verify_password,
    oauth2_scheme,
)
from .cosmetics import CosmeticRepository
from .database import get_session, init_db, session_scope
from .matchmaker import Matchmaker
from .models import Friendship, Gift, OwnedCosmetic, User, ensure_default_user
from .progression import PlayerProgression

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "backend" / "static"
TEMPLATE_DIR = BASE_DIR / "backend" / "templates"

app = FastAPI(title="Dropzone X Backend", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterPayload(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginPayload(BaseModel):
    username: str
    password: str


class FriendPayload(BaseModel):
    username: str


class GiftPayload(BaseModel):
    recipient: str
    itemType: str
    itemId: str
    message: Optional[str] = None


templates = Jinja2Templates(directory=str(TEMPLATE_DIR))
cosmetics = CosmeticRepository()
progression = PlayerProgression(cosmetics)
matchmaker = Matchmaker(cosmetics=cosmetics)


@app.on_event("startup")
async def startup() -> None:
    init_db()
    with session_scope() as session:
        ensure_default_user(session)
    await matchmaker.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    await matchmaker.stop()


@app.get("/", response_class=HTMLResponse)
async def landing(request: Request, session: Session = Depends(get_session)) -> HTMLResponse:
    default_user = ensure_default_user(session)
    lobby_payload = await _build_lobby_payload(session, default_user)
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "lobby": lobby_payload,
            "active_view": request.query_params.get("view", "play"),
        },
    )


@app.post("/api/auth/register")
async def register(payload: RegisterPayload, session: Session = Depends(get_session)) -> Dict:
    if (
        session.query(User)
        .filter((User.username == payload.username) | (User.email == payload.email))
        .first()
    ):
        raise HTTPException(status_code=400, detail="Utente già esistente")
    user = User(username=payload.username, email=payload.email, password_hash=hash_password(payload.password))
    session.add(user)
    session.commit()
    token = create_access_token(subject=str(user.id))
    register_session_token(session, user, token)
    return {"accessToken": token, "profile": _serialise_user(user)}


@app.post("/api/auth/login")
async def login(payload: LoginPayload, session: Session = Depends(get_session)) -> Dict:
    user = session.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali non valide")
    token = create_access_token(subject=str(user.id))
    register_session_token(session, user, token)
    return {"accessToken": token, "profile": _serialise_user(user)}


@app.post("/api/auth/logout")
async def logout(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> Dict:
    revoke_session_token(session, token)
    return {"success": True}


@app.get("/api/auth/me")
async def current_profile(current_user: User = Depends(get_current_user)) -> Dict:
    return _serialise_user(current_user)


@app.get("/api/lobby")
async def lobby(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    return await _build_lobby_payload(session, current_user)


@app.get("/api/cosmetics/outfits")
async def outfits(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    overview = _apply_cosmetic_state(session, current_user)
    return {"outfits": overview["outfits"]}


@app.post("/api/cosmetics/outfits")
async def import_outfit(payload: Dict, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    overview = _apply_cosmetic_state(session, current_user)
    outfit = cosmetics.import_outfit(payload)
    session.add(
        OwnedCosmetic(
            user_id=current_user.id,
            cosmetic_id=outfit["id"],
            cosmetic_kind="outfit",
            rarity=outfit.get("rarity", "Non Comune"),
            source="import",
        )
    )
    session.commit()
    return outfit


@app.get("/api/cosmetics/weapon-skins")
async def weapon_skins(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    overview = _apply_cosmetic_state(session, current_user)
    return {"weaponSkins": overview["weaponSkins"]}


@app.post("/api/cosmetics/weapon-skins")
async def import_weapon_skin(payload: Dict, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    overview = _apply_cosmetic_state(session, current_user)
    skin = cosmetics.import_weapon_skin(payload)
    session.add(
        OwnedCosmetic(
            user_id=current_user.id,
            cosmetic_id=skin["id"],
            cosmetic_kind="weapon",
            rarity=skin.get("rarity", "Non Comune"),
            source="import",
        )
    )
    session.commit()
    return skin


@app.get("/api/animations")
async def animation_sets() -> Dict:
    return {"animationSets": cosmetics.list_animation_sets()}


@app.post("/api/locker/equip")
async def equip(payload: Dict, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    outfit_id = payload.get("outfitId")
    weapon_skin_id = payload.get("weaponSkinId")
    result: Dict[str, Dict] = {}
    _apply_cosmetic_state(session, current_user)
    try:
        if outfit_id:
            result["outfit"] = cosmetics.equip_outfit(outfit_id)
            current_user.equipped_outfit_id = outfit_id
        if weapon_skin_id:
            result["weaponSkin"] = cosmetics.equip_weapon_skin(weapon_skin_id)
            current_user.equipped_weapon_skin_id = weapon_skin_id
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    session.commit()
    return result or {"updated": False}


@app.post("/api/battle-pass/claim")
async def claim_battle_pass(payload: Dict, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    tier_id = payload.get("tierId")
    if not tier_id:
        raise HTTPException(status_code=400, detail="TierId mancante")
    allow_unlock = bool(payload.get("unlock"))
    try:
        result = progression.claim_battle_pass_tier(session, current_user, tier_id, allow_unlock=allow_unlock)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    session.commit()
    return result


@app.post("/api/shop/purchase")
async def purchase_shop_item(payload: Dict, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    item_id = payload.get("itemId")
    if not item_id:
        raise HTTPException(status_code=400, detail="ItemId mancante")
    try:
        result = progression.purchase_shop_item(session, current_user, item_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    session.commit()
    return result


@app.post("/api/queue")
async def queue_player(payload: Dict, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    overview = _apply_cosmetic_state(session, current_user)
    display_name = payload.get("displayName") or current_user.username
    mode = payload.get("mode")
    if not mode or not isinstance(mode, str):
        raise HTTPException(status_code=400, detail="Modalità non specificata")
    try:
        session_state = await matchmaker.enqueue(
            user_id=current_user.id,
            display_name=display_name,
            cosmetic_profile=cosmetics.player_agent_payload(),
            mode=mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    data = await matchmaker.serialize_session(session_state.session_id)
    return JSONResponse(data)


@app.get("/api/session/{session_id}")
async def session_status(session_id: str, current_user: User = Depends(get_current_user)) -> Dict:
    data = await matchmaker.serialize_session(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    if data.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Session non valida")
    return JSONResponse(data)


@app.post("/api/session/{session_id}/start")
async def acknowledge(session_id: str, current_user: User = Depends(get_current_user)) -> Dict:
    session_payload = await matchmaker.serialize_session(session_id)
    if not session_payload or session_payload.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Sessione non valida")
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
async def cancel(session_id: str, current_user: User = Depends(get_current_user)) -> Dict:
    session_payload = await matchmaker.serialize_session(session_id)
    if not session_payload or session_payload.get("userId") != current_user.id:
        raise HTTPException(status_code=403, detail="Sessione non valida")
    cancelled = await matchmaker.cancel(session_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"cancelled": True}


@app.websocket("/ws/matchmaking/{session_id}")
async def matchmaking_socket(websocket: WebSocket, session_id: str) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        from .auth import decode_token  # local import to avoid circular

        decode_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        return
    except Exception:
        await websocket.close(code=4401)
        return
    await matchmaker.register_websocket(session_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await matchmaker.unregister_websocket(session_id, websocket)


@app.get("/match/{match_id}", response_class=HTMLResponse)
async def match_view(request: Request, match_id: str, session: Optional[str] = None) -> HTMLResponse:
    match_payload = await matchmaker.serialize_match(match_id)
    if not match_payload:
        raise HTTPException(status_code=404, detail="Match not found")

    if session:
        session_payload = await matchmaker.serialize_session(session)
        if session_payload and session_payload.get("match"):
            match_payload = session_payload["match"]
        elif session_payload:
            contextual_match = await matchmaker.serialize_match_for_session(match_id, session)
            if contextual_match:
                match_payload = contextual_match
    else:
        session_payload = None
    return templates.TemplateResponse(
        "match.html",
        {
            "request": request,
            "match": match_payload,
            "session": session_payload,
        },
    )


@app.post("/api/friends")
async def add_friend(payload: FriendPayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    target = session.query(User).filter(User.username == payload.username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Non puoi aggiungerti")
    existing = next((f for f in current_user.friendships if f.friend_id == target.id), None)
    if existing:
        raise HTTPException(status_code=400, detail="Richiesta già presente")
    friendship = Friendship(user_id=current_user.id, friend_id=target.id, status="pending")
    session.add(friendship)
    session.commit()
    return {"status": "pending", "friend": target.username}


@app.delete("/api/friends/{username}")
async def remove_friend(username: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    friendship = (
        session.query(Friendship)
        .filter(Friendship.user_id == current_user.id)
        .join(User, Friendship.friend_id == User.id)
        .filter(User.username == username)
        .first()
    )
    if not friendship:
        raise HTTPException(status_code=404, detail="Amico non trovato")
    session.delete(friendship)
    session.commit()
    return {"removed": username}


@app.post("/api/gifts")
async def send_gift(payload: GiftPayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> Dict:
    recipient = session.query(User).filter(User.username == payload.recipient).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinatario non trovato")
    gift = Gift(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        item_type=payload.itemType,
        item_id=payload.itemId,
        message=payload.message,
        currency_spent=0,
    )
    session.add(gift)
    session.commit()
    return {"sent": True, "recipient": recipient.username}


async def _build_lobby_payload(session: Session, user: User) -> Dict:
    progression.ensure_profile(session, user)
    cosmetics_overview = _apply_cosmetic_state(session, user)
    battle_pass = progression.battle_pass_overview(session, user)
    shop = progression.storefront(session, user)
    stats = _profile_stats(session, user)
    friend_rows = (
        session.query(User.id, User.username, Friendship.status)
        .join(Friendship, Friendship.friend_id == User.id)
        .filter(Friendship.user_id == user.id)
        .all()
    )
    presence = await matchmaker.presence_snapshot()
    friends = []
    for friend_id, username, status in friend_rows:
        presence_state = presence.get(friend_id)
        online = presence_state in {"waiting", "matched", "playing"}
        friends.append(
            {
                "username": username,
                "status": status,
                "online": online,
                "presence": presence_state or "offline",
            }
        )
    return {
        "hero": {
            "displayName": user.username,
            "level": user.level,
            "xpProgress": (user.battle_pass_xp or 0) / 1000,
            "title": "Operatore di Apex Squadron",
            "outfit": cosmetics_overview["equippedOutfit"],
            "weaponSkin": cosmetics_overview["equippedWeaponSkin"],
            "loadout": {
                "primary": "Fucile a impulsi VX-9",
                "secondary": "Pistola plasma Viper",
                "gadget": "Drone di ricognizione",
            },
            "cosmetics": cosmetics_overview,
        },
        "currencies": progression.currencies_snapshot(user),
        "battlePass": battle_pass,
        "activity": await matchmaker.lobby_snapshot(),
        "dailyHighlight": {
            "mode": random.choice(["Assalto Orbitale", "Corsa ai Dati", "Dominio"]),
            "map": random.choice(["Nova Prime", "Cittadella Sospesa", "Canyon Elettrico"]),
        },
        "news": {
            "headline": "Operazione Nebula in arrivo",
            "blurb": "Nuovi obiettivi dinamici e ricompense a tempo limitato ogni settimana.",
        },
        "locker": progression.locker_overview(user, cosmetics_overview),
        "shop": shop,
        "profile": stats,
        "cosmetics": cosmetics_overview,
        "friends": friends,
        "settings": {
            "email": user.email,
            "twoFactor": False,
            "newsletters": True,
        },
    }


def _apply_cosmetic_state(session: Session, user: User) -> Dict:
    owned_outfits = [item.cosmetic_id for item in user.owned_cosmetics if item.cosmetic_kind == "outfit"]
    owned_weapon_skins = [item.cosmetic_id for item in user.owned_cosmetics if item.cosmetic_kind == "weapon"]
    cosmetics.apply_player_state(
        owned_outfits=owned_outfits,
        owned_weapon_skins=owned_weapon_skins,
        equipped_outfit=user.equipped_outfit_id,
        equipped_weapon_skin=user.equipped_weapon_skin_id,
    )
    return cosmetics.lobby_overview()


def _serialise_user(user: User) -> Dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "level": user.level,
        "credits": user.credits,
        "flux": user.flux,
        "tokens": user.tokens,
        "equippedOutfitId": user.equipped_outfit_id,
        "equippedWeaponSkinId": user.equipped_weapon_skin_id,
    }


def _profile_stats(session: Session, user: User) -> Dict:
    from .models import MatchRecord

    total_matches = session.query(func.count(MatchRecord.id)).filter(MatchRecord.user_id == user.id).scalar() or 0
    total_wins = session.query(func.count(MatchRecord.id)).filter(MatchRecord.user_id == user.id, MatchRecord.placement == 1).scalar() or 0
    total_kills = session.query(func.coalesce(func.sum(MatchRecord.kills), 0)).filter(MatchRecord.user_id == user.id).scalar() or 0
    total_time = session.query(func.coalesce(func.sum(MatchRecord.survived_time), 0)).filter(MatchRecord.user_id == user.id).scalar() or 0
    win_rate = (total_wins / total_matches * 100) if total_matches else 0.0
    kdr = (total_kills / max(1, total_matches)) if total_matches else 0.0
    return {
        "matchesPlayed": total_matches,
        "wins": total_wins,
        "winRate": round(win_rate, 1),
        "kdr": round(kdr, 2),
        "timePlayedMinutes": total_time,
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
