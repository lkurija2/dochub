import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owned_repositories = relationship("DocRepository", back_populates="owner", foreign_keys="DocRepository.owner_id")
    memberships = relationship("RepositoryMember", back_populates="user")
    created_documents = relationship("Document", back_populates="creator", foreign_keys="Document.created_by")
    created_versions = relationship("DocumentVersion", back_populates="creator")
    created_durs = relationship("DUR", back_populates="creator", foreign_keys="DUR.created_by")
    reviewed_durs = relationship("DUR", back_populates="reviewer", foreign_keys="DUR.reviewed_by")
    dur_comments = relationship("DURComment", back_populates="user")
