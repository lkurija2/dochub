import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from ..database import Base


class MemberRole(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


class DocRepository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_repositories", foreign_keys=[owner_id])
    members = relationship("RepositoryMember", back_populates="repository", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="repository", cascade="all, delete-orphan")
    durs = relationship("DUR", back_populates="repository", cascade="all, delete-orphan")


class RepositoryMember(Base):
    __tablename__ = "repository_members"

    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role = Column(SAEnum(MemberRole), nullable=False, default=MemberRole.viewer)

    # Relationships
    repository = relationship("DocRepository", back_populates="members")
    user = relationship("User", back_populates="memberships")
