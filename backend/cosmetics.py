"""Cosmetic and animation repository for Dropzone X."""
from __future__ import annotations

import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class AnimationSet:
    """Defines a reusable collection of animation clip bindings."""

    id: str
    name: str
    description: str
    clips: Dict[str, str]


@dataclass
class Outfit:
    """Represents a playable outfit/skin."""

    id: str
    name: str
    rarity: str
    description: str
    model_url: str
    thumbnail_url: str
    animation_set_id: str
    created_at: float = field(default_factory=lambda: time.time())
    tags: List[str] = field(default_factory=list)


@dataclass
class WeaponSkin:
    """Represents a weapon wrap/skin."""

    id: str
    name: str
    rarity: str
    description: str
    texture_url: str
    thumbnail_url: str
    created_at: float = field(default_factory=lambda: time.time())
    power_modifier: float = 0.0


class CosmeticRepository:
    """In-memory store for outfits, weapon skins, and animation sets."""

    def __init__(self) -> None:
        self._animation_sets: Dict[str, AnimationSet] = {}
        self._outfits: Dict[str, Outfit] = {}
        self._weapon_skins: Dict[str, WeaponSkin] = {}
        self._equipped_outfit_id: Optional[str] = None
        self._equipped_weapon_skin_id: Optional[str] = None
        self._seed_defaults()

    # ------------------------------------------------------------------
    # Default data
    # ------------------------------------------------------------------
    def _seed_defaults(self) -> None:
        tactical_set = AnimationSet(
            id="anim-tactical",
            name="Tattico Avanzato",
            description="Set completo con idle, corsa e animazioni di fuoco del soldato glTF.",
            clips={
                "idle": "Idle",
                "run": "Run",
                "sprint": "Run",
                "aim": "Aim",
                "fire": "Aim_Shoot",
                "hit": "HitReact",
            },
        )
        recon_set = AnimationSet(
            id="anim-recon",
            name="Ricognitore",
            description="Animazioni fluide orientate allo stealth con scivolate e posizionamento.",
            clips={
                "idle": "Idle",
                "run": "Walk",
                "sprint": "Run",
                "aim": "Aim",
                "fire": "Aim_Shoot",
                "hit": "HitReact",
            },
        )
        self._animation_sets[tactical_set.id] = tactical_set
        self._animation_sets[recon_set.id] = recon_set

        default_outfit = Outfit(
            id="outfit-sentinel",
            name="Sentinella Prisma",
            rarity="Epico",
            description="Operatore della Dropzone con armatura prisma reattiva.",
            model_url="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
            thumbnail_url="https://images.unsplash.com/photo-1589578527966-74fb14d25666?auto=format&fit=crop&w=400&q=60",
            animation_set_id=tactical_set.id,
            tags=["default", "battle-pass"],
        )
        striker_outfit = Outfit(
            id="outfit-striker",
            name="Striker Eclipse",
            rarity="Leggendario",
            description="Assaltatore speciale con armatura riflettente e visore quantico.",
            model_url="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/RiggedSimple/glTF/RiggedSimple.gltf",
            thumbnail_url="https://images.unsplash.com/photo-1520975928316-7da62370b0e1?auto=format&fit=crop&w=400&q=60",
            animation_set_id=recon_set.id,
            tags=["featured", "shop"],
        )
        self._outfits[default_outfit.id] = default_outfit
        self._outfits[striker_outfit.id] = striker_outfit

        default_weapon = WeaponSkin(
            id="wrap-ion",
            name="Circuito Ion",
            rarity="Raro",
            description="Rivestimento per armi con bagliore ionico.",
            texture_url="https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60",
            thumbnail_url="https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=400&q=60",
            power_modifier=0.02,
        )
        elite_weapon = WeaponSkin(
            id="wrap-aurora",
            name="Aurora Pulse",
            rarity="Leggendario",
            description="Skin completa con mirino e laser integrati.",
            texture_url="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=600&q=60",
            thumbnail_url="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=400&q=60",
            power_modifier=0.03,
        )
        self._weapon_skins[default_weapon.id] = default_weapon
        self._weapon_skins[elite_weapon.id] = elite_weapon

        self._equipped_outfit_id = default_outfit.id
        self._equipped_weapon_skin_id = default_weapon.id

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------
    def list_outfits(self) -> List[Dict]:
        return [self._serialise_outfit(outfit) for outfit in self._outfits.values()]

    def list_weapon_skins(self) -> List[Dict]:
        return [self._serialise_weapon_skin(skin) for skin in self._weapon_skins.values()]

    def list_animation_sets(self) -> List[Dict]:
        return [self._serialise_animation_set(animation) for animation in self._animation_sets.values()]

    def get_outfit(self, outfit_id: str) -> Optional[Outfit]:
        return self._outfits.get(outfit_id)

    def get_weapon_skin(self, weapon_skin_id: str) -> Optional[WeaponSkin]:
        return self._weapon_skins.get(weapon_skin_id)

    def get_animation_set(self, animation_id: str) -> Optional[AnimationSet]:
        return self._animation_sets.get(animation_id)

    def equipped_outfit(self) -> Outfit:
        assert self._equipped_outfit_id, "No outfit equipped"
        return self._outfits[self._equipped_outfit_id]

    def equipped_weapon_skin(self) -> WeaponSkin:
        assert self._equipped_weapon_skin_id, "No weapon skin equipped"
        return self._weapon_skins[self._equipped_weapon_skin_id]

    def lobby_overview(self) -> Dict:
        outfit = self.equipped_outfit()
        weapon_skin = self.equipped_weapon_skin()
        return {
            "equippedOutfit": self._serialise_outfit(outfit),
            "equippedWeaponSkin": self._serialise_weapon_skin(weapon_skin),
            "outfits": self.list_outfits(),
            "weaponSkins": self.list_weapon_skins(),
            "animationSets": self.list_animation_sets(),
        }

    def player_agent_payload(self) -> Dict:
        outfit = self.equipped_outfit()
        animation = self.get_animation_set(outfit.animation_set_id)
        return {
            "outfitId": outfit.id,
            "name": outfit.name,
            "modelUrl": outfit.model_url,
            "thumbnailUrl": outfit.thumbnail_url,
            "animationSetId": outfit.animation_set_id,
            "animationBindings": animation.clips if animation else {},
        }

    def random_outfit(self) -> Dict:
        outfit = random.choice(list(self._outfits.values()))
        animation = self.get_animation_set(outfit.animation_set_id)
        return {
            "outfitId": outfit.id,
            "name": outfit.name,
            "modelUrl": outfit.model_url,
            "thumbnailUrl": outfit.thumbnail_url,
            "animationSetId": outfit.animation_set_id,
            "animationBindings": animation.clips if animation else {},
        }

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------
    def import_outfit(self, data: Dict) -> Dict:
        outfit = Outfit(
            id=data.get("id") or f"outfit-{uuid.uuid4().hex[:8]}",
            name=data["name"],
            rarity=data.get("rarity", "Non comune"),
            description=data.get("description", ""),
            model_url=data["modelUrl"],
            thumbnail_url=data.get("thumbnailUrl", data["modelUrl"]),
            animation_set_id=data.get("animationSetId", self._equipped_animation_id()),
            tags=data.get("tags", []),
        )
        if outfit.animation_set_id not in self._animation_sets:
            raise ValueError("Animation set non valido")
        self._outfits[outfit.id] = outfit
        return self._serialise_outfit(outfit)

    def import_weapon_skin(self, data: Dict) -> Dict:
        skin = WeaponSkin(
            id=data.get("id") or f"wrap-{uuid.uuid4().hex[:8]}",
            name=data["name"],
            rarity=data.get("rarity", "Non comune"),
            description=data.get("description", ""),
            texture_url=data["textureUrl"],
            thumbnail_url=data.get("thumbnailUrl", data["textureUrl"]),
            power_modifier=float(data.get("powerModifier", 0.0)),
        )
        self._weapon_skins[skin.id] = skin
        return self._serialise_weapon_skin(skin)

    def equip_outfit(self, outfit_id: str) -> Dict:
        if outfit_id not in self._outfits:
            raise KeyError("Outfit non trovato")
        self._equipped_outfit_id = outfit_id
        return self._serialise_outfit(self._outfits[outfit_id])

    def equip_weapon_skin(self, weapon_skin_id: str) -> Dict:
        if weapon_skin_id not in self._weapon_skins:
            raise KeyError("Skin arma non trovata")
        self._equipped_weapon_skin_id = weapon_skin_id
        return self._serialise_weapon_skin(self._weapon_skins[weapon_skin_id])

    # ------------------------------------------------------------------
    # Serialisers
    # ------------------------------------------------------------------
    def _serialise_outfit(self, outfit: Outfit) -> Dict:
        return {
            "id": outfit.id,
            "name": outfit.name,
            "rarity": outfit.rarity,
            "description": outfit.description,
            "modelUrl": outfit.model_url,
            "thumbnailUrl": outfit.thumbnail_url,
            "animationSetId": outfit.animation_set_id,
            "tags": outfit.tags,
            "createdAt": outfit.created_at,
        }

    def _serialise_weapon_skin(self, skin: WeaponSkin) -> Dict:
        return {
            "id": skin.id,
            "name": skin.name,
            "rarity": skin.rarity,
            "description": skin.description,
            "textureUrl": skin.texture_url,
            "thumbnailUrl": skin.thumbnail_url,
            "powerModifier": skin.power_modifier,
            "createdAt": skin.created_at,
        }

    def _serialise_animation_set(self, animation: AnimationSet) -> Dict:
        return {
            "id": animation.id,
            "name": animation.name,
            "description": animation.description,
            "clips": animation.clips,
        }

    def _equipped_animation_id(self) -> str:
        if self._equipped_outfit_id:
            return self._outfits[self._equipped_outfit_id].animation_set_id
        if self._animation_sets:
            return next(iter(self._animation_sets))
        raise ValueError("Nessun set di animazioni disponibile")
