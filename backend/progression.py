from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from .cosmetics import CosmeticRepository


@dataclass
class BattlePassTier:
    id: str
    tier: int
    name: str
    description: str
    rarity: str
    thumbnail_url: str
    reward_type: str
    cosmetic_kind: Optional[str] = None
    cosmetic_id: Optional[str] = None
    amount: Optional[int] = None
    currency: Optional[str] = None
    premium: bool = False
    unlock_cost: Optional[int] = None
    unlock_currency: Optional[str] = None
    claimed: bool = False


@dataclass
class ShopItem:
    id: str
    name: str
    description: str
    rarity: str
    thumbnail_url: str
    price: int
    currency: str
    reward_type: str
    cosmetic_kind: Optional[str] = None
    cosmetic_id: Optional[str] = None
    tag: str = "daily"
    owned: bool = False


class PlayerProgression:
    """Tracks player-facing progression, currencies, and purchasable content."""

    def __init__(self, cosmetics: CosmeticRepository) -> None:
        self._cosmetics = cosmetics
        self.currencies: Dict[str, int] = {"credits": 1250, "flux": 460, "tokens": 12}
        self.battle_pass_level: int = 27
        self.battle_pass_progress: float = 0.54
        self._battle_pass_tiers: Dict[str, BattlePassTier] = {}
        self._battle_pass_claimed: Set[str] = set()
        self._battle_pass_unlocked: Set[str] = set()
        self._shop_items: Dict[str, ShopItem] = {}
        self._shop_sections: Dict[str, List[str]] = {"featured": [], "daily": []}
        self._owned_emotes: List[str] = ["Scia Nova", "Cadenza Zero"]
        self.premium_pass: bool = True
        self._seed_battle_pass()
        self._seed_shop()

    # ------------------------------------------------------------------
    # Battle pass handling
    # ------------------------------------------------------------------
    def _seed_battle_pass(self) -> None:
        """Initialise 50 tiers with cosmetic and currency rewards."""

        tiers: List[BattlePassTier] = [
            BattlePassTier(
                id="tier-1",
                tier=1,
                name="Pacchetto Crediti",
                description="Ottieni 150 crediti Dropzone per potenziare il tuo equipaggiamento.",
                rarity="Comune",
                thumbnail_url="https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=400&q=60",
                reward_type="currency",
                currency="credits",
                amount=150,
            ),
            BattlePassTier(
                id="tier-2",
                tier=2,
                name="Wrap Pulse Vector",
                description="Mimetica dinamica con onde pulsanti.",
                rarity="Raro",
                thumbnail_url="https://images.unsplash.com/photo-1529421308361-1d3d421c8f97?auto=format&fit=crop&w=400&q=60",
                reward_type="weapon",
                cosmetic_kind="weapon",
                cosmetic_id="wrap-pulse",
                premium=False,
            ),
            BattlePassTier(
                id="tier-3",
                tier=3,
                name="Boost XP Flux",
                description="Potenziamento di 100 unità di Flux per acquistare livelli del pass.",
                rarity="Non Comune",
                thumbnail_url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=400&q=60",
                reward_type="currency",
                currency="flux",
                amount=100,
            ),
            BattlePassTier(
                id="tier-4",
                tier=4,
                name="Emote Onda Quantica",
                description="Un'animazione emote esclusiva a tempo rallentato.",
                rarity="Raro",
                thumbnail_url="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=60",
                reward_type="emote",
            ),
            BattlePassTier(
                id="tier-5",
                tier=5,
                name="Skin Shade Operative",
                description="Operatrice stealth con mantello adattivo.",
                rarity="Raro",
                thumbnail_url="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=60",
                reward_type="outfit",
                cosmetic_kind="outfit",
                cosmetic_id="outfit-stealth",
            ),
            BattlePassTier(
                id="tier-6",
                tier=6,
                name="Pacchetto Token",
                description="Ricevi 4 token Dropzone per acquisti premium.",
                rarity="Non Comune",
                thumbnail_url="https://images.unsplash.com/photo-1523294587484-bae6cc870010?auto=format&fit=crop&w=400&q=60",
                reward_type="currency",
                currency="tokens",
                amount=4,
            ),
            BattlePassTier(
                id="tier-7",
                tier=7,
                name="Wrap Nova Circuit",
                description="Rivestimento epico a impulsi viola.",
                rarity="Epico",
                thumbnail_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=60",
                reward_type="weapon",
                cosmetic_kind="weapon",
                cosmetic_id="wrap-nova",
                premium=True,
                unlock_cost=250,
                unlock_currency="flux",
            ),
            BattlePassTier(
                id="tier-8",
                tier=8,
                name="Banner Dropzone",
                description="Stendardo dinamico per il profilo.",
                rarity="Comune",
                thumbnail_url="https://images.unsplash.com/photo-1520975918316-302a23b60c71?auto=format&fit=crop&w=400&q=60",
                reward_type="profile",
            ),
            BattlePassTier(
                id="tier-9",
                tier=9,
                name="Boost XP",
                description="Guadagna 250 crediti extra per il pass.",
                rarity="Non Comune",
                thumbnail_url="https://images.unsplash.com/photo-1518544889280-39fef12fb6f4?auto=format&fit=crop&w=400&q=60",
                reward_type="currency",
                currency="credits",
                amount=250,
            ),
            BattlePassTier(
                id="tier-10",
                tier=10,
                name="Skin Vanguard Polaris",
                description="Armatura tattica con piastre luminose.",
                rarity="Epico",
                thumbnail_url="https://images.unsplash.com/photo-1535905496755-26ae35d0ae54?auto=format&fit=crop&w=400&q=60",
                reward_type="outfit",
                cosmetic_kind="outfit",
                cosmetic_id="outfit-vanguard",
                premium=True,
                unlock_cost=400,
                unlock_currency="flux",
            ),
        ]

        # Generate tiers 11-50 with rotating rewards
        rotating_rewards = [
            BattlePassTier(
                id="tier-template-wrap",
                tier=0,
                name="Wrap Aurora Pulse",
                description="Skin leggendaria con accessori completi.",
                rarity="Leggendario",
                thumbnail_url="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=400&q=60",
                reward_type="weapon",
                cosmetic_kind="weapon",
                cosmetic_id="wrap-aurora",
                premium=True,
                unlock_cost=450,
                unlock_currency="flux",
            ),
            BattlePassTier(
                id="tier-template-credits",
                tier=0,
                name="Deposito Crediti",
                description="Bonus di 300 crediti per acquisti nel negozio.",
                rarity="Raro",
                thumbnail_url="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=60",
                reward_type="currency",
                currency="credits",
                amount=300,
            ),
            BattlePassTier(
                id="tier-template-emote",
                tier=0,
                name="Emote Victory Spin",
                description="Una rotazione acrobatica celebrativa.",
                rarity="Epico",
                thumbnail_url="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=60",
                reward_type="emote",
            ),
            BattlePassTier(
                id="tier-template-token",
                tier=0,
                name="Token Flux",
                description="Ricevi 6 unità di Flux.",
                rarity="Non Comune",
                thumbnail_url="https://images.unsplash.com/photo-1545239351-ef35f43d514b?auto=format&fit=crop&w=400&q=60",
                reward_type="currency",
                currency="flux",
                amount=120,
            ),
        ]

        for index in range(11, 51):
            template = rotating_rewards[(index - 11) % len(rotating_rewards)]
            tier = BattlePassTier(
                id=f"tier-{index}",
                tier=index,
                name=template.name,
                description=template.description,
                rarity=template.rarity,
                thumbnail_url=template.thumbnail_url,
                reward_type=template.reward_type,
                cosmetic_kind=template.cosmetic_kind,
                cosmetic_id=template.cosmetic_id,
                amount=template.amount,
                currency=template.currency,
                premium=template.premium or index % 5 == 0,
                unlock_cost=template.unlock_cost,
                unlock_currency=template.unlock_currency,
            )
            tiers.append(tier)

        for tier in tiers:
            if tier.cosmetic_kind == "outfit" and tier.cosmetic_id:
                self._cosmetics.ensure_outfit_registered(
                    {
                        "id": tier.cosmetic_id,
                        "name": tier.name,
                        "rarity": tier.rarity,
                        "description": tier.description,
                        "modelUrl": self._cosmetics.get_outfit(tier.cosmetic_id).model_url
                        if self._cosmetics.get_outfit(tier.cosmetic_id)
                        else "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
                        "thumbnailUrl": tier.thumbnail_url,
                        "animationSetId": self._cosmetics.equipped_outfit().animation_set_id,
                    },
                    owned=self._cosmetics.is_outfit_owned(tier.cosmetic_id),
                )
            if tier.cosmetic_kind == "weapon" and tier.cosmetic_id:
                existing = self._cosmetics.get_weapon_skin(tier.cosmetic_id)
                texture_url = (
                    existing.texture_url
                    if existing
                    else "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60"
                )
                self._cosmetics.ensure_weapon_skin_registered(
                    {
                        "id": tier.cosmetic_id,
                        "name": tier.name,
                        "rarity": tier.rarity,
                        "description": tier.description,
                        "textureUrl": texture_url,
                        "thumbnailUrl": tier.thumbnail_url,
                        "powerModifier": existing.power_modifier if existing else 0.02,
                    },
                    owned=self._cosmetics.is_weapon_skin_owned(tier.cosmetic_id),
                )
            self._battle_pass_tiers[tier.id] = tier

    def battle_pass_overview(self) -> Dict:
        tiers_payload = [self._tier_payload(tier) for tier in self._battle_pass_tiers.values()]
        tiers_payload.sort(key=lambda entry: entry["tier"])
        return {
            "level": self.battle_pass_level,
            "progress": self.battle_pass_progress,
            "totalTiers": len(tiers_payload),
            "tiers": tiers_payload,
        }

    def claim_battle_pass_tier(self, tier_id: str, allow_unlock: bool = False) -> Dict:
        if tier_id not in self._battle_pass_tiers:
            raise KeyError("Tier non trovato")
        tier = self._battle_pass_tiers[tier_id]
        if tier.claimed:
            raise ValueError("Ricompensa già riscattata")
        unlocked = self._is_tier_unlocked(tier)
        if not unlocked:
            if not allow_unlock or not tier.unlock_cost or not tier.unlock_currency:
                raise ValueError("Tier non ancora sbloccato")
            self._spend_currency(tier.unlock_currency, tier.unlock_cost)
            self._battle_pass_unlocked.add(tier_id)
            unlocked = True
        if tier.premium and not self.premium_pass:
            raise ValueError("Tier premium non disponibile")
        reward = self._grant_reward(tier)
        tier.claimed = True
        self._battle_pass_claimed.add(tier_id)
        return {
            "tier": self._tier_payload(tier),
            "reward": reward,
            "currencies": dict(self.currencies),
        }

    def _is_tier_unlocked(self, tier: BattlePassTier) -> bool:
        return tier.tier <= self.battle_pass_level or tier.id in self._battle_pass_unlocked

    def _tier_payload(self, tier: BattlePassTier) -> Dict:
        unlocked = self._is_tier_unlocked(tier)
        owned = False
        if tier.reward_type == "outfit" and tier.cosmetic_id:
            owned = self._cosmetics.is_outfit_owned(tier.cosmetic_id)
        elif tier.reward_type == "weapon" and tier.cosmetic_id:
            owned = self._cosmetics.is_weapon_skin_owned(tier.cosmetic_id)
        reward_details = {
            "type": tier.reward_type,
            "cosmeticKind": tier.cosmetic_kind,
            "cosmeticId": tier.cosmetic_id,
            "amount": tier.amount,
            "currency": tier.currency,
        }
        return {
            "id": tier.id,
            "tier": tier.tier,
            "name": tier.name,
            "description": tier.description,
            "rarity": tier.rarity,
            "thumbnailUrl": tier.thumbnail_url,
            "premium": tier.premium,
            "claimed": tier.claimed,
            "unlocked": unlocked,
            "owned": owned,
            "unlockCost": tier.unlock_cost if not unlocked else None,
            "unlockCurrency": tier.unlock_currency if not unlocked else None,
            "reward": reward_details,
        }

    def _grant_reward(self, tier: BattlePassTier) -> Dict:
        reward_info = {"type": tier.reward_type, "name": tier.name}
        if tier.reward_type == "currency" and tier.currency and tier.amount:
            self.currencies[tier.currency] = self.currencies.get(tier.currency, 0) + tier.amount
            reward_info.update({"currency": tier.currency, "amount": tier.amount})
        elif tier.reward_type == "outfit" and tier.cosmetic_id:
            outfit = self._cosmetics.unlock_outfit(tier.cosmetic_id)
            reward_info.update({"cosmeticKind": "outfit", "cosmetic": outfit})
        elif tier.reward_type == "weapon" and tier.cosmetic_id:
            skin = self._cosmetics.unlock_weapon_skin(tier.cosmetic_id)
            reward_info.update({"cosmeticKind": "weapon", "cosmetic": skin})
        elif tier.reward_type == "emote":
            if tier.name not in self._owned_emotes:
                self._owned_emotes.append(tier.name)
        return reward_info

    # ------------------------------------------------------------------
    # Shop handling
    # ------------------------------------------------------------------
    def _seed_shop(self) -> None:
        items = [
            ShopItem(
                id="shop-outfit-striker",
                name="Striker Eclipse",
                description="Skin leggendaria con visore quantico.",
                rarity="Leggendario",
                thumbnail_url="https://images.unsplash.com/photo-1520975928316-7da62370b0e1?auto=format&fit=crop&w=400&q=60",
                price=2000,
                currency="credits",
                reward_type="outfit",
                cosmetic_kind="outfit",
                cosmetic_id="outfit-striker",
                tag="featured",
            ),
            ShopItem(
                id="shop-wrap-aurora",
                name="Aurora Pulse",
                description="Wrap leggendario con mirino e laser.",
                rarity="Leggendario",
                thumbnail_url="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=400&q=60",
                price=2400,
                currency="credits",
                reward_type="weapon",
                cosmetic_kind="weapon",
                cosmetic_id="wrap-aurora",
                tag="featured",
            ),
            ShopItem(
                id="shop-outfit-stealth",
                name="Shade Operative",
                description="Skin rara con mantello adattivo.",
                rarity="Raro",
                thumbnail_url="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=60",
                price=950,
                currency="flux",
                reward_type="outfit",
                cosmetic_kind="outfit",
                cosmetic_id="outfit-stealth",
                tag="daily",
            ),
            ShopItem(
                id="shop-wrap-nova",
                name="Nova Circuit",
                description="Wrap epico con bagliori viola.",
                rarity="Epico",
                thumbnail_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=60",
                price=1200,
                currency="credits",
                reward_type="weapon",
                cosmetic_kind="weapon",
                cosmetic_id="wrap-nova",
                tag="daily",
            ),
            ShopItem(
                id="shop-emote-drift",
                name="Emote Drift",
                description="Movimento stiloso per il tuo operatore.",
                rarity="Non Comune",
                thumbnail_url="https://images.unsplash.com/photo-1529158062015-cad636e69505?auto=format&fit=crop&w=400&q=60",
                price=6,
                currency="tokens",
                reward_type="emote",
                tag="daily",
            ),
        ]

        for item in items:
            if item.cosmetic_kind == "outfit" and item.cosmetic_id:
                self._cosmetics.ensure_outfit_registered(
                    {
                        "id": item.cosmetic_id,
                        "name": item.name,
                        "rarity": item.rarity,
                        "description": item.description,
                        "modelUrl": self._cosmetics.get_outfit(item.cosmetic_id).model_url
                        if self._cosmetics.get_outfit(item.cosmetic_id)
                        else "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
                        "thumbnailUrl": item.thumbnail_url,
                        "animationSetId": self._cosmetics.equipped_outfit().animation_set_id,
                    },
                    owned=self._cosmetics.is_outfit_owned(item.cosmetic_id),
                )
            if item.cosmetic_kind == "weapon" and item.cosmetic_id:
                existing = self._cosmetics.get_weapon_skin(item.cosmetic_id)
                texture_url = (
                    existing.texture_url
                    if existing
                    else "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60"
                )
                self._cosmetics.ensure_weapon_skin_registered(
                    {
                        "id": item.cosmetic_id,
                        "name": item.name,
                        "rarity": item.rarity,
                        "description": item.description,
                        "textureUrl": texture_url,
                        "thumbnailUrl": item.thumbnail_url,
                        "powerModifier": existing.power_modifier if existing else 0.02,
                    },
                    owned=self._cosmetics.is_weapon_skin_owned(item.cosmetic_id),
                )
            self._shop_items[item.id] = item
            self._shop_sections[item.tag].append(item.id)

    def shop_overview(self) -> Dict:
        return {
            section: [self._shop_item_payload(self._shop_items[item_id]) for item_id in ids]
            for section, ids in self._shop_sections.items()
        }

    def purchase_shop_item(self, item_id: str) -> Dict:
        if item_id not in self._shop_items:
            raise KeyError("Oggetto non trovato")
        item = self._shop_items[item_id]
        if item.owned:
            raise ValueError("Oggetto già posseduto")
        self._spend_currency(item.currency, item.price)
        reward = self._apply_shop_reward(item)
        item.owned = True
        return {
            "item": self._shop_item_payload(item),
            "reward": reward,
            "currencies": dict(self.currencies),
        }

    def _shop_item_payload(self, item: ShopItem) -> Dict:
        payload = {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "rarity": item.rarity,
            "thumbnailUrl": item.thumbnail_url,
            "price": item.price,
            "currency": item.currency,
            "rewardType": item.reward_type,
            "cosmeticKind": item.cosmetic_kind,
            "cosmeticId": item.cosmetic_id,
            "owned": item.owned,
        }
        return payload

    def _apply_shop_reward(self, item: ShopItem) -> Dict:
        reward_info = {"type": item.reward_type, "name": item.name}
        if item.reward_type == "outfit" and item.cosmetic_id:
            outfit = self._cosmetics.unlock_outfit(item.cosmetic_id)
            reward_info.update({"cosmeticKind": "outfit", "cosmetic": outfit})
        elif item.reward_type == "weapon" and item.cosmetic_id:
            skin = self._cosmetics.unlock_weapon_skin(item.cosmetic_id)
            reward_info.update({"cosmeticKind": "weapon", "cosmetic": skin})
        elif item.reward_type == "emote":
            if item.name not in self._owned_emotes:
                self._owned_emotes.append(item.name)
        return reward_info

    def _spend_currency(self, currency: str, amount: int) -> None:
        balance = self.currencies.get(currency, 0)
        if balance < amount:
            raise ValueError("Fondi insufficienti")
        self.currencies[currency] = balance - amount

    # ------------------------------------------------------------------
    # Lobby helpers
    # ------------------------------------------------------------------
    @property
    def owned_emotes(self) -> List[str]:
        return list(self._owned_emotes)

    def locker_overview(self, cosmetics_overview: Dict) -> Dict:
        equipped_outfit = cosmetics_overview["equippedOutfit"]
        equipped_weapon = cosmetics_overview["equippedWeaponSkin"]
        return {
            "outfit": equipped_outfit["name"],
            "backbling": "Nucleo Orbitale",
            "pickaxe": "Falce Ionica",
            "glider": "Ala Luminosa",
            "wrap": equipped_weapon["name"],
            "emotes": self.owned_emotes,
        }

    def _shop_items_payload(self, section: str) -> List[Dict]:
        return [self._shop_item_payload(self._shop_items[item_id]) for item_id in self._shop_sections.get(section, [])]

    def storefront(self) -> Dict:
        return {
            "featured": self._shop_items_payload("featured"),
            "daily": self._shop_items_payload("daily"),
        }
