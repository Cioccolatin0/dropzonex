"""Player progression, battle pass and storefront management."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy.orm import Session

from .cosmetics import CosmeticRepository
from .models import BattlePassProgress, OwnedCosmetic, User


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
    power_modifier: Optional[float] = None
    attachments: Optional[Dict[str, str]] = None


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
    power_modifier: Optional[float] = None


class PlayerProgression:
    """Service responsible for permanent rewards and currency bookkeeping."""

    def __init__(self, cosmetics: CosmeticRepository) -> None:
        self._cosmetics = cosmetics
        self._battle_pass_tiers = _build_battle_pass(cosmetics)
        self._shop_items, self._shop_sections = _build_shop(cosmetics)

    # ------------------------------------------------------------------
    # Battle pass lifecycle
    # ------------------------------------------------------------------
    def battle_pass_overview(self, session: Session, user: User) -> Dict:
        self.ensure_profile(session, user)
        progress_map = {entry.tier_id: entry for entry in user.battle_pass_progress}
        owned_outfits = {item.cosmetic_id for item in user.owned_cosmetics if item.cosmetic_kind == "outfit"}
        owned_weapons = {item.cosmetic_id for item in user.owned_cosmetics if item.cosmetic_kind == "weapon"}

        tiers_payload: List[Dict] = []
        for tier in sorted(self._battle_pass_tiers.values(), key=lambda t: t.tier):
            progress = progress_map.get(tier.id)
            claimed = bool(progress.claimed) if progress else False
            unlocked = bool(progress.unlocked) if progress else tier.tier <= user.battle_pass_level
            owned = False
            if tier.cosmetic_kind == "outfit" and tier.cosmetic_id:
                owned = tier.cosmetic_id in owned_outfits
            elif tier.cosmetic_kind == "weapon" and tier.cosmetic_id:
                owned = tier.cosmetic_id in owned_weapons
            tiers_payload.append(
                {
                    "id": tier.id,
                    "tier": tier.tier,
                    "name": tier.name,
                    "description": tier.description,
                    "rarity": tier.rarity,
                    "thumbnailUrl": tier.thumbnail_url,
                    "premium": tier.premium,
                    "claimed": claimed,
                    "unlocked": unlocked,
                    "owned": owned,
                    "unlockCost": tier.unlock_cost if not unlocked else None,
                    "unlockCurrency": tier.unlock_currency if not unlocked else None,
                    "reward": {
                        "type": tier.reward_type,
                        "cosmeticKind": tier.cosmetic_kind,
                        "cosmeticId": tier.cosmetic_id,
                        "amount": tier.amount,
                        "currency": tier.currency,
                        "powerModifier": tier.power_modifier,
                        "attachments": tier.attachments,
                    },
                }
            )

        return {
            "level": user.battle_pass_level,
            "progress": (user.battle_pass_xp or 0) / 1000,
            "totalTiers": len(tiers_payload),
            "tiers": tiers_payload,
        }

    def claim_battle_pass_tier(
        self,
        session: Session,
        user: User,
        tier_id: str,
        *,
        allow_unlock: bool = False,
    ) -> Dict:
        if tier_id not in self._battle_pass_tiers:
            raise KeyError("Tier non trovato")
        tier = self._battle_pass_tiers[tier_id]
        progress = (
            session.query(BattlePassProgress)
            .filter(BattlePassProgress.user_id == user.id, BattlePassProgress.tier_id == tier.id)
            .first()
        )

        claimed = progress.claimed if progress else False
        if claimed:
            raise ValueError("Ricompensa già riscattata")

        unlocked = progress.unlocked if progress else tier.tier <= user.battle_pass_level
        if not unlocked:
            if not allow_unlock or not tier.unlock_cost or not tier.unlock_currency:
                raise ValueError("Tier non ancora sbloccato")
            self._spend_currency(user, tier.unlock_currency, tier.unlock_cost)
            if not progress:
                progress = BattlePassProgress(user_id=user.id, tier_id=tier.id)
                session.add(progress)
            progress.unlocked = True
            session.flush()

        reward = self._grant_reward(session, user, tier.reward_type, tier)

        if not progress:
            progress = BattlePassProgress(user_id=user.id, tier_id=tier.id)
            session.add(progress)
        progress.claimed = True
        progress.claimed_at = datetime.utcnow()
        progress.unlocked = True
        session.flush()

        return {
            "tier": tier_id,
            "reward": reward,
            "currencies": self.currencies_snapshot(user),
        }

    # ------------------------------------------------------------------
    # Shop
    # ------------------------------------------------------------------
    def storefront(self, session: Session, user: User) -> Dict:
        owned_ids = {item.cosmetic_id for item in user.owned_cosmetics}
        inventory = {}
        for section, ids in self._shop_sections.items():
            inventory[section] = [self._shop_payload(self._shop_items[item_id], owned_ids) for item_id in ids]
        return inventory

    def purchase_shop_item(self, session: Session, user: User, item_id: str) -> Dict:
        if item_id not in self._shop_items:
            raise KeyError("Articolo non trovato")
        item = self._shop_items[item_id]
        self._spend_currency(user, item.currency, item.price)
        reward = self._grant_reward(session, user, item.reward_type, item)
        session.flush()
        return {"itemId": item.id, "reward": reward, "currencies": self.currencies_snapshot(user)}

    # ------------------------------------------------------------------
    # Locker & profile helpers
    # ------------------------------------------------------------------
    def locker_overview(self, user: User, cosmetics_overview: Dict) -> Dict:
        outfit = cosmetics_overview.get("equippedOutfit", {})
        weapon = cosmetics_overview.get("equippedWeaponSkin", {})
        return {
            "outfit": outfit.get("name", ""),
            "backbling": "Modulo Vettore Zenith",
            "pickaxe": "Lancia a Flusso",  # definitive gear name
            "glider": "Ala Prisma",  # final glider name
            "wrap": weapon.get("name", ""),
            "emotes": sorted({item.cosmetic_id for item in user.owned_cosmetics if item.cosmetic_kind == "emote"}),
        }

    def currencies_snapshot(self, user: User) -> Dict[str, int]:
        return {"credits": user.credits, "flux": user.flux, "tokens": user.tokens}

    def ensure_profile(self, session: Session, user: User) -> None:
        """Guarantee that the user owns starter cosmetics and equipment."""

        owned_ids = {
            cosmetic_id
            for (cosmetic_id,) in session.query(OwnedCosmetic.cosmetic_id)
            .filter(OwnedCosmetic.user_id == user.id)
            .all()
        }
        starter_outfits = ["outfit-sentinel"]
        starter_wraps = ["wrap-ion"]
        changed = False
        for outfit_id in starter_outfits:
            if outfit_id not in owned_ids:
                session.add(
                    OwnedCosmetic(
                        user_id=user.id,
                        cosmetic_id=outfit_id,
                        cosmetic_kind="outfit",
                        rarity="Epico",
                        source="starter",
                    )
                )
                changed = True
                owned_ids.add(outfit_id)
        for wrap_id in starter_wraps:
            if wrap_id not in owned_ids:
                session.add(
                    OwnedCosmetic(
                        user_id=user.id,
                        cosmetic_id=wrap_id,
                        cosmetic_kind="weapon",
                        rarity="Raro",
                        source="starter",
                    )
                )
                changed = True
                owned_ids.add(wrap_id)
        if changed:
            session.flush()
        if not user.equipped_outfit_id:
            user.equipped_outfit_id = starter_outfits[0]
        if not user.equipped_weapon_skin_id:
            user.equipped_weapon_skin_id = starter_wraps[0]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _grant_reward(
        self,
        session: Session,
        user: User,
        reward_type: str,
        source,
    ) -> Dict:
        reward: Dict[str, object] = {"type": reward_type, "name": getattr(source, "name", "Ricompensa")}
        if reward_type == "currency" and source.currency and source.amount:
            self._add_currency(user, source.currency, source.amount)
            reward.update({"currency": source.currency, "amount": source.amount})
        elif reward_type == "outfit" and source.cosmetic_id:
            data = self._cosmetics.ensure_outfit_registered(
                {
                    "id": source.cosmetic_id,
                    "name": source.name,
                    "rarity": source.rarity,
                    "description": source.description,
                    "modelUrl": self._cosmetics.get_outfit(source.cosmetic_id).model_url
                    if self._cosmetics.get_outfit(source.cosmetic_id)
                    else "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
                    "thumbnailUrl": source.thumbnail_url,
                    "animationSetId": self._cosmetics.equipped_outfit().animation_set_id,
                },
                owned=True,
            )
            self._record_cosmetic(session, user, source.cosmetic_id, "outfit", source.rarity)
            reward.update({"cosmeticKind": "outfit", "cosmetic": data})
        elif reward_type == "weapon" and source.cosmetic_id:
            texture_url = self._cosmetics.get_weapon_skin(source.cosmetic_id).texture_url if self._cosmetics.get_weapon_skin(source.cosmetic_id) else "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60"
            data = self._cosmetics.ensure_weapon_skin_registered(
                {
                    "id": source.cosmetic_id,
                    "name": source.name,
                    "rarity": source.rarity,
                    "description": source.description,
                    "textureUrl": texture_url,
                    "thumbnailUrl": source.thumbnail_url,
                    "powerModifier": source.power_modifier or 0.02,
                },
                owned=True,
            )
            self._record_cosmetic(session, user, source.cosmetic_id, "weapon", source.rarity)
            reward.update(
                {
                    "cosmeticKind": "weapon",
                    "cosmetic": data,
                    "powerModifier": source.power_modifier or 0.02,
                    "attachments": source.attachments,
                }
            )
        elif reward_type == "emote":
            self._record_cosmetic(session, user, source.name, "emote", source.rarity)
        return reward

    def _record_cosmetic(self, session: Session, user: User, cosmetic_id: str, kind: str, rarity: str) -> None:
        exists = (
            session.query(OwnedCosmetic)
            .filter(
                OwnedCosmetic.user_id == user.id,
                OwnedCosmetic.cosmetic_id == cosmetic_id,
            )
            .first()
        )
        if exists:
            return
        session.add(
            OwnedCosmetic(
                user_id=user.id,
                cosmetic_id=cosmetic_id,
                cosmetic_kind=kind,
                rarity=rarity,
                source="reward",
            )
        )

    def _spend_currency(self, user: User, currency: str, amount: int) -> None:
        wallet = self._resolve_wallet(user)
        if wallet.get(currency, 0) < amount:
            raise ValueError("Fondi insufficienti")
        wallet[currency] -= amount
        self._apply_wallet(user, wallet)

    def _add_currency(self, user: User, currency: str, amount: int) -> None:
        wallet = self._resolve_wallet(user)
        wallet[currency] = wallet.get(currency, 0) + amount
        self._apply_wallet(user, wallet)

    def _resolve_wallet(self, user: User) -> Dict[str, int]:
        return {"credits": user.credits, "flux": user.flux, "tokens": user.tokens}

    def _apply_wallet(self, user: User, wallet: Dict[str, int]) -> None:
        user.credits = wallet.get("credits", user.credits)
        user.flux = wallet.get("flux", user.flux)
        user.tokens = wallet.get("tokens", user.tokens)

    def _shop_payload(self, item: ShopItem, owned_ids: Iterable[str]) -> Dict:
        return {
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
            "powerModifier": item.power_modifier,
            "owned": item.cosmetic_id in owned_ids if item.cosmetic_id else False,
        }


def _build_battle_pass(cosmetics: CosmeticRepository) -> Dict[str, BattlePassTier]:
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
            power_modifier=0.022,
        ),
        BattlePassTier(
            id="tier-3",
            tier=3,
            name="Boost Flux",
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
            description="Un'animazione esclusiva a tempo rallentato.",
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
            premium=False,
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
            description="Rivestimento epico a impulsi viola con mirino olografico.",
            rarity="Epico",
            thumbnail_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=60",
            reward_type="weapon",
            cosmetic_kind="weapon",
            cosmetic_id="wrap-nova",
            premium=True,
            unlock_cost=250,
            unlock_currency="flux",
            power_modifier=0.024,
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
            name="Bonus Crediti",
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

    rotating_rewards: List[BattlePassTier] = [
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
            power_modifier=0.026,
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
            name="Boost Flux",
            description="Ricevi 120 unità di Flux raffinato.",
            rarity="Non Comune",
            thumbnail_url="https://images.unsplash.com/photo-1545239351-ef35f43d514b?auto=format&fit=crop&w=400&q=60",
            reward_type="currency",
            currency="flux",
            amount=120,
        ),
    ]

    for index in range(11, 50):
        template = rotating_rewards[(index - 11) % len(rotating_rewards)]
        tiers.append(
            BattlePassTier(
                id=f"tier-{index}",
                tier=index,
                name=template.name,
                description=template.description,
                rarity=template.rarity,
                thumbnail_url=template.thumbnail_url,
                reward_type=template.reward_type,
                cosmetic_kind=template.cosmetic_kind,
                cosmetic_id=f"{template.cosmetic_id}-{index}" if template.cosmetic_id else template.cosmetic_id,
                amount=template.amount,
                currency=template.currency,
                premium=template.premium or index % 5 == 0,
                unlock_cost=template.unlock_cost,
                unlock_currency=template.unlock_currency,
                power_modifier=template.power_modifier,
            )
        )

    tiers.append(
        BattlePassTier(
            id="tier-50",
            tier=50,
            name="Fucile Zenith Prime",
            description="Arma finale full kit con mirino termico, laser e caricatore esteso.",
            rarity="Leggendario",
            thumbnail_url="https://images.unsplash.com/photo-1526481280695-3c469ed2b6c5?auto=format&fit=crop&w=400&q=60",
            reward_type="weapon",
            cosmetic_kind="weapon",
            cosmetic_id="weapon-zenith-prime",
            premium=True,
            power_modifier=0.03,
            attachments={
                "scope": "Mirino termico VX-8",
                "laser": "Laser ad alta frequenza",
                "mag": "Caricatore esteso 40 colpi",
            },
        )
    )

    battle_pass: Dict[str, BattlePassTier] = {}
    for tier in tiers:
        if tier.cosmetic_kind == "outfit" and tier.cosmetic_id:
            cosmetics.ensure_outfit_registered(
                {
                    "id": tier.cosmetic_id,
                    "name": tier.name,
                    "rarity": tier.rarity,
                    "description": tier.description,
                    "modelUrl": cosmetics.get_outfit(tier.cosmetic_id).model_url
                    if cosmetics.get_outfit(tier.cosmetic_id)
                    else "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
                    "thumbnailUrl": tier.thumbnail_url,
                    "animationSetId": cosmetics.equipped_outfit().animation_set_id,
                },
                owned=False,
            )
        if tier.cosmetic_kind == "weapon" and tier.cosmetic_id:
            texture_url = cosmetics.get_weapon_skin(tier.cosmetic_id).texture_url if cosmetics.get_weapon_skin(tier.cosmetic_id) else "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60"
            cosmetics.ensure_weapon_skin_registered(
                {
                    "id": tier.cosmetic_id,
                    "name": tier.name,
                    "rarity": tier.rarity,
                    "description": tier.description,
                    "textureUrl": texture_url,
                    "thumbnailUrl": tier.thumbnail_url,
                    "powerModifier": tier.power_modifier or 0.02,
                },
                owned=False,
            )
        battle_pass[tier.id] = tier
    return battle_pass


def _build_shop(cosmetics: CosmeticRepository) -> Tuple[Dict[str, ShopItem], Dict[str, List[str]]]:
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
            power_modifier=0.027,
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
            power_modifier=0.023,
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

    inventory: Dict[str, ShopItem] = {}
    sections: Dict[str, List[str]] = {"featured": [], "daily": []}
    for item in items:
        inventory[item.id] = item
        sections.setdefault(item.tag, []).append(item.id)
        if item.cosmetic_kind == "outfit" and item.cosmetic_id:
            cosmetics.ensure_outfit_registered(
                {
                    "id": item.cosmetic_id,
                    "name": item.name,
                    "rarity": item.rarity,
                    "description": item.description,
                    "modelUrl": cosmetics.get_outfit(item.cosmetic_id).model_url
                    if cosmetics.get_outfit(item.cosmetic_id)
                    else "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.glb",
                    "thumbnailUrl": item.thumbnail_url,
                    "animationSetId": cosmetics.equipped_outfit().animation_set_id,
                },
                owned=False,
            )
        if item.cosmetic_kind == "weapon" and item.cosmetic_id:
            texture_url = cosmetics.get_weapon_skin(item.cosmetic_id).texture_url if cosmetics.get_weapon_skin(item.cosmetic_id) else "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=600&q=60"
            cosmetics.ensure_weapon_skin_registered(
                {
                    "id": item.cosmetic_id,
                    "name": item.name,
                    "rarity": item.rarity,
                    "description": item.description,
                    "textureUrl": texture_url,
                    "thumbnailUrl": item.thumbnail_url,
                    "powerModifier": item.power_modifier or 0.02,
                },
                owned=False,
            )
    return inventory, sections
