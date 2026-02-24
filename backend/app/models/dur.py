import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from ..database import Base


class DURStatus(str, enum.Enum):
    open = "open"
    approved = "approved"
    rejected = "rejected"
    merged = "merged"


class DUR(Base):
    __tablename__ = "durs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    proposed_content = Column(Text, nullable=False)
    status = Column(SAEnum(DURStatus), nullable=False, default=DURStatus.open)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)

    # Relationships
    repository = relationship("DocRepository", back_populates="durs")
    document = relationship("Document", back_populates="durs")
    creator = relationship("User", back_populates="created_durs", foreign_keys=[created_by])
    reviewer = relationship("User", back_populates="reviewed_durs", foreign_keys=[reviewed_by])
    comments = relationship("DURComment", back_populates="dur", cascade="all, delete-orphan", order_by="DURComment.created_at")


class DURComment(Base):
    __tablename__ = "dur_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dur_id = Column(UUID(as_uuid=True), ForeignKey("durs.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    dur = relationship("DUR", back_populates="comments")
    user = relationship("User", back_populates="dur_comments")
