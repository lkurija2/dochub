from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from ..models.dur import DURStatus
from .user import UserOut


class DURBase(BaseModel):
    title: str
    description: Optional[str] = None
    proposed_content: str


class DURCreate(DURBase):
    document_id: UUID


class DURReview(BaseModel):
    review_comment: Optional[str] = None


class DUROut(DURBase):
    id: UUID
    repo_id: UUID
    document_id: UUID
    status: DURStatus
    created_by: UUID
    reviewed_by: Optional[UUID] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None

    model_config = {"from_attributes": True}


class DURWithUsers(DUROut):
    creator: UserOut
    reviewer: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class DURCommentCreate(BaseModel):
    content: str


class DURCommentOut(BaseModel):
    id: UUID
    dur_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}
