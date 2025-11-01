import random
import random
import time
import uuid
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
