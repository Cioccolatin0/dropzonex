import random
import random
import time
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Set


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
    model_url: Optional[str] = None
    accent_color: Optional[str] = None
    preview_blueprint: Optional[Dict[str, object]] = None


ION_RIFLE_BLUEPRINT = {
    "spinSpeed": 0.65,
    "parts": [
        {
            "type": "box",
            "size": [1.45, 0.2, 0.28],
            "position": [0.0, 0.0, 0.0],
            "color": "#0c162d",
            "metalness": 0.68,
            "roughness": 0.32,
        },
        {
            "type": "box",
            "size": [0.46, 0.2, 0.24],
            "position": [0.34, 0.16, 0.0],
            "color": "#2af0ff",
            "emissive": "#1da8ff",
            "emissiveIntensity": 0.75,
            "metalness": 0.45,
            "roughness": 0.28,
        },
        {
            "type": "cylinder",
            "radius": 0.055,
            "height": 1.15,
            "position": [-0.36, 0.04, 0.0],
            "rotation": [0.0, 0.0, 1.5708],
            "color": "#27d0ff",
            "metalness": 0.58,
            "roughness": 0.22,
        },
        {
            "type": "box",
            "size": [0.32, 0.16, 0.22],
            "position": [-0.52, -0.05, 0.0],
            "color": "#14243c",
            "metalness": 0.52,
            "roughness": 0.4,
        },
        {
            "type": "box",
            "size": [0.24, 0.1, 0.18],
            "position": [0.12, -0.12, 0.0],
            "color": "#1f6ef2",
            "metalness": 0.42,
            "roughness": 0.35,
        },
        {
            "type": "cylinder",
            "radius": 0.035,
            "height": 0.55,
            "position": [0.68, 0.07, 0.0],
            "rotation": [0.0, 0.0, 1.5708],
            "color": "#5fe9ff",
            "metalness": 0.5,
            "roughness": 0.28,
        },
    ],
}


AURORA_RIFLE_BLUEPRINT = {
    "spinSpeed": 0.75,
    "parts": [
        {
            "type": "box",
            "size": [1.5, 0.22, 0.3],
            "position": [0.0, 0.0, 0.0],
            "color": "#170b33",
            "metalness": 0.74,
            "roughness": 0.26,
        },
        {
            "type": "box",
            "size": [0.5, 0.18, 0.26],
            "position": [0.38, 0.18, 0.0],
            "color": "#ff4df8",
            "emissive": "#ff7bff",
            "emissiveIntensity": 0.82,
            "metalness": 0.55,
            "roughness": 0.22,
        },
        {
            "type": "box",
            "size": [0.18, 0.18, 0.18],
            "position": [-0.1, 0.12, 0.12],
            "color": "#42e9ff",
            "metalness": 0.6,
            "roughness": 0.3,
        },
        {
            "type": "box",
            "size": [0.18, 0.18, 0.18],
            "position": [-0.1, 0.12, -0.12],
            "color": "#42e9ff",
            "metalness": 0.6,
            "roughness": 0.3,
        },
        {
            "type": "cylinder",
            "radius": 0.07,
            "height": 1.2,
            "position": [-0.42, 0.05, 0.0],
            "rotation": [0.0, 0.0, 1.5708],
            "color": "#2d0f53",
            "metalness": 0.7,
            "roughness": 0.28,
        },
        {
            "type": "box",
            "size": [0.22, 0.24, 0.14],
            "position": [0.05, -0.15, 0.0],
            "color": "#31104f",
            "metalness": 0.52,
            "roughness": 0.38,
        },
        {
            "type": "box",
            "size": [0.34, 0.12, 0.22],
            "position": [0.62, 0.04, 0.0],
            "color": "#ff9dff",
            "emissive": "#ff44ff",
            "emissiveIntensity": 0.9,
            "metalness": 0.48,
            "roughness": 0.24,
        },
        {
            "type": "cylinder",
            "radius": 0.03,
            "height": 0.45,
            "position": [0.74, -0.02, 0.12],
            "rotation": [1.5708, 0.0, 0.0],
            "color": "#f045ff",
            "emissive": "#ff55ff",
            "emissiveIntensity": 1.0,
        },
        {
            "type": "cylinder",
            "radius": 0.03,
            "height": 0.45,
            "position": [0.74, -0.02, -0.12],
            "rotation": [1.5708, 0.0, 0.0],
            "color": "#f045ff",
            "emissive": "#ff55ff",
            "emissiveIntensity": 1.0,
        },
    ],
}


NOVA_RIFLE_BLUEPRINT = {
    "spinSpeed": 0.7,
    "parts": [
        {
            "type": "box",
            "size": [1.35, 0.2, 0.26],
            "position": [0.0, 0.0, 0.0],
            "color": "#120b28",
            "metalness": 0.62,
            "roughness": 0.3,
        },
        {
            "type": "box",
            "size": [0.44, 0.18, 0.22],
            "position": [0.28, 0.15, 0.0],
            "color": "#b889ff",
            "emissive": "#7440ff",
            "emissiveIntensity": 0.75,
            "metalness": 0.5,
            "roughness": 0.28,
        },
        {
            "type": "box",
            "size": [0.2, 0.12, 0.18],
            "position": [-0.26, -0.1, 0.0],
            "color": "#201336",
            "metalness": 0.45,
            "roughness": 0.36,
        },
        {
            "type": "cylinder",
            "radius": 0.05,
            "height": 1.05,
            "position": [-0.34, 0.05, 0.0],
            "rotation": [0.0, 0.0, 1.5708],
            "color": "#7a3cff",
            "metalness": 0.64,
            "roughness": 0.26,
        },
        {
            "type": "cylinder",
            "radius": 0.03,
            "height": 0.4,
            "position": [0.54, 0.12, 0.0],
            "rotation": [1.5708, 0.0, 0.0],
            "color": "#d4b5ff",
            "emissive": "#905cff",
            "emissiveIntensity": 0.6,
        },
        {
            "type": "box",
            "size": [0.28, 0.1, 0.2],
            "position": [0.12, 0.08, 0.0],
            "color": "#321c57",
            "metalness": 0.48,
            "roughness": 0.32,
        },
    ],
}


PULSE_SMG_BLUEPRINT = {
    "spinSpeed": 0.78,
    "parts": [
        {
            "type": "box",
            "size": [1.05, 0.18, 0.22],
            "position": [0.0, 0.0, 0.0],
            "color": "#091b2e",
            "metalness": 0.58,
            "roughness": 0.3,
        },
        {
            "type": "box",
            "size": [0.32, 0.16, 0.2],
            "position": [0.2, 0.14, 0.0],
            "color": "#3bf0c9",
            "emissive": "#29c7ff",
            "emissiveIntensity": 0.68,
            "metalness": 0.46,
            "roughness": 0.24,
        },
        {
            "type": "cylinder",
            "radius": 0.045,
            "height": 0.9,
            "position": [-0.22, 0.04, 0.0],
            "rotation": [0.0, 0.0, 1.5708],
            "color": "#20bafc",
            "metalness": 0.55,
            "roughness": 0.27,
        },
        {
            "type": "box",
            "size": [0.18, 0.12, 0.18],
            "position": [-0.18, -0.09, 0.0],
            "color": "#0f304c",
            "metalness": 0.5,
            "roughness": 0.35,
        },
        {
            "type": "box",
            "size": [0.22, 0.09, 0.16],
            "position": [0.48, 0.05, 0.0],
            "color": "#5afddc",
            "metalness": 0.4,
            "roughness": 0.25,
        },
    ],
}


ZENITH_PRIME_BLUEPRINT = {
    "spinSpeed": 0.85,
    "parts": [
        {
            "type": "box",
            "size": [1.6, 0.24, 0.32],
            "position": [0.0, 0.02, 0.0],
            "color": "#110722",
            "metalness": 0.78,
            "roughness": 0.24,
        },
        {
            "type": "box",
            "size": [0.58, 0.22, 0.28],
            "position": [0.42, 0.2, 0.0],
            "color": "#ff58ff",
            "emissive": "#ff4dff",
            "emissiveIntensity": 0.95,
            "metalness": 0.52,
            "roughness": 0.2,
        },
        {
            "type": "cylinder",
            "radius": 0.08,
            "height": 1.3,
            "position": [-0.5, 0.08, 0.0],
            "rotation": [0.0, 0.0, 1.5708],
            "color": "#36144f",
            "metalness": 0.7,
            "roughness": 0.26,
        },
        {
            "type": "box",
            "size": [0.3, 0.28, 0.18],
            "position": [0.0, -0.16, 0.0],
            "color": "#1b0f32",
            "metalness": 0.58,
            "roughness": 0.34,
        },
        {
            "type": "cylinder",
            "radius": 0.035,
            "height": 0.6,
            "position": [0.78, 0.12, 0.0],
            "rotation": [1.5708, 0.0, 0.0],
            "color": "#ff75ff",
            "emissive": "#ff66ff",
            "emissiveIntensity": 1.0,
        },
        {
            "type": "box",
            "size": [0.24, 0.12, 0.22],
            "position": [0.66, -0.02, 0.0],
            "color": "#2e0f48",
            "metalness": 0.6,
            "roughness": 0.28,
        },
        {
            "type": "cylinder",
            "radius": 0.05,
            "height": 0.4,
            "position": [-0.12, 0.18, 0.14],
            "rotation": [0.0, 0.0, 0.0],
            "color": "#44f0ff",
            "emissive": "#2feaff",
            "emissiveIntensity": 0.75,
        },
        {
            "type": "cylinder",
            "radius": 0.05,
            "height": 0.4,
            "position": [-0.12, 0.18, -0.14],
            "rotation": [0.0, 0.0, 0.0],
            "color": "#44f0ff",
            "emissive": "#2feaff",
            "emissiveIntensity": 0.75,
        },
    ],
}


class CosmeticRepository:
    """In-memory store for outfits, weapon skins, and animation sets."""

    def __init__(self) -> None:
        self._animation_sets: Dict[str, AnimationSet] = {}
        self._outfits: Dict[str, Outfit] = {}
        self._weapon_skins: Dict[str, WeaponSkin] = {}
        self._owned_outfit_ids: Set[str] = set()
        self._owned_weapon_skin_ids: Set[str] = set()
        self._equipped_outfit_id: Optional[str] = None
        self._equipped_weapon_skin_id: Optional[str] = None
        self._seed_defaults()

    # ------------------------------------------------------------------
    # Player state synchronisation
    # ------------------------------------------------------------------
    def apply_player_state(
        self,
        *,
        owned_outfits: Iterable[str],
        owned_weapon_skins: Iterable[str],
        equipped_outfit: Optional[str] = None,
        equipped_weapon_skin: Optional[str] = None,
    ) -> None:
        """Synchronise repository ownership with persisted player state."""

        self._owned_outfit_ids = {oid for oid in owned_outfits if oid in self._outfits}
        self._owned_weapon_skin_ids = {wid for wid in owned_weapon_skins if wid in self._weapon_skins}

        if equipped_outfit and equipped_outfit in self._outfits:
            self._equipped_outfit_id = equipped_outfit
        elif self._owned_outfit_ids:
            self._equipped_outfit_id = next(iter(self._owned_outfit_ids))
        else:
            self._equipped_outfit_id = next(iter(self._outfits))

        if equipped_weapon_skin and equipped_weapon_skin in self._weapon_skins:
            self._equipped_weapon_skin_id = equipped_weapon_skin
        elif self._owned_weapon_skin_ids:
            self._equipped_weapon_skin_id = next(iter(self._owned_weapon_skin_ids))
        else:
            self._equipped_weapon_skin_id = next(iter(self._weapon_skins))

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

        self._register_outfit(
            Outfit(
                id="outfit-sentinel",
                name="Sentinella Prisma",
                rarity="Epico",
                description="Operatore della Dropzone con armatura prisma reattiva.",
                model_url="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
                thumbnail_url="https://images.unsplash.com/photo-1589578527966-74fb14d25666?auto=format&fit=crop&w=400&q=60",
                animation_set_id=tactical_set.id,
                tags=["default", "battle-pass"],
            ),
            owned=True,
        )
        self._register_outfit(
            Outfit(
                id="outfit-striker",
                name="Striker Eclipse",
                rarity="Leggendario",
                description="Assaltatore speciale con armatura riflettente e visore quantico.",
                model_url="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/RiggedSimple/glTF/RiggedSimple.gltf",
                thumbnail_url="https://images.unsplash.com/photo-1520975928316-7da62370b0e1?auto=format&fit=crop&w=400&q=60",
                animation_set_id=recon_set.id,
                tags=["featured", "shop"],
            ),
            owned=False,
        )
        self._register_outfit(
            Outfit(
                id="outfit-vanguard",
                name="Vanguard Polaris",
                rarity="Epico",
                description="Battagliero con piastre luminose e motori dorsali.",
                model_url="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMan/glTF/CesiumMan.gltf",
                thumbnail_url="https://images.unsplash.com/photo-1535905496755-26ae35d0ae54?auto=format&fit=crop&w=400&q=60",
                animation_set_id=tactical_set.id,
                tags=["battle-pass", "premium"],
            ),
            owned=False,
        )
        self._register_outfit(
            Outfit(
                id="outfit-stealth",
                name="Shade Operative",
                rarity="Raro",
                description="Operativa furtiva con mantello adattivo.",
                model_url="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Fox/glTF/Fox.gltf",
                thumbnail_url="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=60",
                animation_set_id=recon_set.id,
                tags=["shop", "daily"],
            ),
            owned=False,
        )

        self._register_weapon_skin(
            WeaponSkin(
                id="wrap-ion",
                name="Circuito Ion",
                rarity="Raro",
                description="Rivestimento per armi con bagliore ionico.",
                texture_url="https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60",
                thumbnail_url="https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=400&q=60",
                power_modifier=0.02,
                accent_color="#2af0ff",
                preview_blueprint=deepcopy(ION_RIFLE_BLUEPRINT),
            ),
            owned=True,
        )
        self._register_weapon_skin(
            WeaponSkin(
                id="wrap-aurora",
                name="Aurora Pulse",
                rarity="Leggendario",
                description="Skin completa con mirino e laser integrati.",
                texture_url="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=600&q=60",
                thumbnail_url="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=400&q=60",
                power_modifier=0.03,
                accent_color="#ff58ff",
                preview_blueprint=deepcopy(AURORA_RIFLE_BLUEPRINT),
            ),
            owned=False,
        )
        self._register_weapon_skin(
            WeaponSkin(
                id="wrap-nova",
                name="Nova Circuit",
                rarity="Epico",
                description="Rivestimento a impulsi con riflessi viola.",
                texture_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=60",
                thumbnail_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=60",
                power_modifier=0.025,
                accent_color="#925dff",
                preview_blueprint=deepcopy(NOVA_RIFLE_BLUEPRINT),
            ),
            owned=False,
        )
        self._register_weapon_skin(
            WeaponSkin(
                id="wrap-pulse",
                name="Pulse Vector",
                rarity="Raro",
                description="Texture sintetica con onde dinamiche.",
                texture_url="https://images.unsplash.com/photo-1529421308361-1d3d421c8f97?auto=format&fit=crop&w=600&q=60",
                thumbnail_url="https://images.unsplash.com/photo-1529421308361-1d3d421c8f97?auto=format&fit=crop&w=400&q=60",
                power_modifier=0.018,
                accent_color="#33e8d5",
                preview_blueprint=deepcopy(PULSE_SMG_BLUEPRINT),
            ),
            owned=False,
        )
        self._register_weapon_skin(
            WeaponSkin(
                id="weapon-zenith-prime",
                name="Zenith Prime",
                rarity="Leggendario",
                description="Prototipo Zenith con assetto completo di accessori reattivi.",
                texture_url="https://images.unsplash.com/photo-1526481280695-3c469ed2b6c5?auto=format&fit=crop&w=600&q=60",
                thumbnail_url="https://images.unsplash.com/photo-1526481280695-3c469ed2b6c5?auto=format&fit=crop&w=400&q=60",
                power_modifier=0.03,
                accent_color="#ff58ff",
                preview_blueprint=deepcopy(ZENITH_PRIME_BLUEPRINT),
            ),
            owned=False,
        )

        self._equipped_outfit_id = "outfit-sentinel"
        self._equipped_weapon_skin_id = "wrap-ion"

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
            "ownedOutfits": sorted(self._owned_outfit_ids),
            "ownedWeaponSkins": sorted(self._owned_weapon_skin_ids),
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

    def random_weapon_skin(self) -> Dict:
        skin = random.choice(list(self._weapon_skins.values()))
        return self._serialise_weapon_skin(skin)

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
        self._register_outfit(outfit, owned=True)
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
            model_url=data.get("modelUrl"),
            accent_color=data.get("accentColor"),
            preview_blueprint=deepcopy(data.get("previewBlueprint")) if data.get("previewBlueprint") else None,
        )
        self._register_weapon_skin(skin, owned=True)
        return self._serialise_weapon_skin(skin)

    def equip_outfit(self, outfit_id: str) -> Dict:
        if outfit_id not in self._outfits:
            raise KeyError("Outfit non trovato")
        if outfit_id not in self._owned_outfit_ids:
            raise ValueError("Outfit non posseduto")
        self._equipped_outfit_id = outfit_id
        return self._serialise_outfit(self._outfits[outfit_id])

    def equip_weapon_skin(self, weapon_skin_id: str) -> Dict:
        if weapon_skin_id not in self._weapon_skins:
            raise KeyError("Skin arma non trovata")
        if weapon_skin_id not in self._owned_weapon_skin_ids:
            raise ValueError("Skin arma non posseduta")
        self._equipped_weapon_skin_id = weapon_skin_id
        return self._serialise_weapon_skin(self._weapon_skins[weapon_skin_id])

    def unlock_outfit(self, outfit_id: str) -> Dict:
        if outfit_id not in self._outfits:
            raise KeyError("Outfit non trovato")
        self._owned_outfit_ids.add(outfit_id)
        return self._serialise_outfit(self._outfits[outfit_id])

    def unlock_weapon_skin(self, weapon_skin_id: str) -> Dict:
        if weapon_skin_id not in self._weapon_skins:
            raise KeyError("Skin arma non trovata")
        self._owned_weapon_skin_ids.add(weapon_skin_id)
        return self._serialise_weapon_skin(self._weapon_skins[weapon_skin_id])

    def ensure_outfit_registered(self, data: Dict, *, owned: bool = False) -> Dict:
        outfit_id = data["id"]
        if outfit_id not in self._outfits:
            outfit = Outfit(
                id=outfit_id,
                name=data["name"],
                rarity=data.get("rarity", "Non comune"),
                description=data.get("description", ""),
                model_url=data["modelUrl"],
                thumbnail_url=data.get("thumbnailUrl", data["modelUrl"]),
                animation_set_id=data.get("animationSetId", self._equipped_animation_id()),
                tags=data.get("tags", []),
            )
            self._register_outfit(outfit, owned=owned)
        elif owned:
            self._owned_outfit_ids.add(outfit_id)
        return self._serialise_outfit(self._outfits[outfit_id])

    def ensure_weapon_skin_registered(self, data: Dict, *, owned: bool = False) -> Dict:
        skin_id = data["id"]
        if skin_id not in self._weapon_skins:
            skin = WeaponSkin(
                id=skin_id,
                name=data["name"],
                rarity=data.get("rarity", "Non comune"),
                description=data.get("description", ""),
                texture_url=data["textureUrl"],
                thumbnail_url=data.get("thumbnailUrl", data["textureUrl"]),
                power_modifier=float(data.get("powerModifier", 0.0)),
                model_url=data.get("modelUrl"),
                accent_color=data.get("accentColor"),
                preview_blueprint=deepcopy(data.get("previewBlueprint")) if data.get("previewBlueprint") else None,
            )
            self._register_weapon_skin(skin, owned=owned)
        elif owned:
            self._owned_weapon_skin_ids.add(skin_id)
        return self._serialise_weapon_skin(self._weapon_skins[skin_id])

    def is_outfit_owned(self, outfit_id: str) -> bool:
        return outfit_id in self._owned_outfit_ids

    def is_weapon_skin_owned(self, weapon_skin_id: str) -> bool:
        return weapon_skin_id in self._owned_weapon_skin_ids

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
            "owned": outfit.id in self._owned_outfit_ids,
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
            "modelUrl": skin.model_url,
            "accentColor": skin.accent_color,
            "previewBlueprint": deepcopy(skin.preview_blueprint) if skin.preview_blueprint else None,
            "owned": skin.id in self._owned_weapon_skin_ids,
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

    def _register_outfit(self, outfit: Outfit, *, owned: bool) -> None:
        self._outfits[outfit.id] = outfit
        if owned:
            self._owned_outfit_ids.add(outfit.id)

    def _register_weapon_skin(self, skin: WeaponSkin, *, owned: bool) -> None:
        self._weapon_skins[skin.id] = skin
        if owned:
            self._owned_weapon_skin_ids.add(skin.id)
