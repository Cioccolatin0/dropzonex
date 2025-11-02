"""SQLAlchemy models describing Dropzone X persistent data."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(40), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    battle_pass_level = Column(Integer, default=1)
    battle_pass_xp = Column(Integer, default=0)
    credits = Column(Integer, default=1500)
    flux = Column(Integer, default=500)
    tokens = Column(Integer, default=10)
    equipped_outfit_id = Column(String(120))
    equipped_weapon_skin_id = Column(String(120))
    created_at = Column(DateTime, default=datetime.utcnow)

    owned_cosmetics = relationship("OwnedCosmetic", back_populates="user", cascade="all, delete-orphan")
    battle_pass_progress = relationship(
        "BattlePassProgress", back_populates="user", cascade="all, delete-orphan"
    )
    friendships = relationship(
        "Friendship",
        foreign_keys="Friendship.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    gifts_sent = relationship("Gift", back_populates="sender", foreign_keys="Gift.sender_id")
    gifts_received = relationship("Gift", back_populates="recipient", foreign_keys="Gift.recipient_id")


class OwnedCosmetic(Base):
    __tablename__ = "owned_cosmetics"
    __table_args__ = (UniqueConstraint("user_id", "cosmetic_id", name="uq_cosmetic_owner"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cosmetic_id = Column(String(120), nullable=False)
    cosmetic_kind = Column(String(40), nullable=False)
    rarity = Column(String(32), nullable=False)
    source = Column(String(64), default="unlock")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="owned_cosmetics")


class BattlePassProgress(Base):
    __tablename__ = "battle_pass_progress"
    __table_args__ = (UniqueConstraint("user_id", "tier_id", name="uq_pass_tier"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tier_id = Column(String(40), nullable=False)
    claimed = Column(Boolean, default=False)
    unlocked = Column(Boolean, default=False)
    claimed_at = Column(DateTime)

    user = relationship("User", back_populates="battle_pass_progress")


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("user_id", "friend_id", name="uq_friend_pair"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    friend_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(16), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="friendships")
    friend = relationship("User", foreign_keys=[friend_id])


class Gift(Base):
    __tablename__ = "gifts"

    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(32), nullable=False)
    item_id = Column(String(120), nullable=False)
    message = Column(String(255))
    currency_spent = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="gifts_sent")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="gifts_received")


class MatchRecord(Base):
    __tablename__ = "match_records"

    id = Column(Integer, primary_key=True)
    match_id = Column(String(64), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    placement = Column(Integer, nullable=False)
    kills = Column(Integer, default=0)
    damage = Column(Integer, default=0)
    survived_time = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


def ensure_default_user(session) -> User:
    existing: Optional[User] = session.query(User).filter_by(username="pilota").first()
    if existing:
        return existing
    user = User(
        username="pilota",
        email="pilota@dropzonex.gg",
        password_hash="$2b$12$cU0uhcHNY4ToQgn6lqlQ3ekFQZbA6MItNhbbX6YsJhBKt3vnDnNNa",  # "dropzonex"
        level=58,
        xp=158450,
        battle_pass_level=27,
        battle_pass_xp=540,
        credits=2250,
        flux=660,
        tokens=18,
        equipped_outfit_id="outfit-sentinel",
        equipped_weapon_skin_id="wrap-ion",
    )
    session.add(user)
    session.flush()
    return user
