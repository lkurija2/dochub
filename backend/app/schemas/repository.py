from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional
from ..models.repository import MemberRole
from .user import UserOut


class RepositoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class RepositoryCreate(RepositoryBase):
    slug: Optional[str] = None


class RepositoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class RepositoryOut(RepositoryBase):
    id: UUID
    slug: str
    owner_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class RepositoryWithOwner(RepositoryOut):
    owner: UserOut

    model_config = {"from_attributes": True}


class MemberAdd(BaseModel):
    user_id: UUID
    role: MemberRole = MemberRole.viewer


class MemberOut(BaseModel):
    user_id: UUID
    repo_id: UUID
    role: MemberRole
    user: UserOut

    model_config = {"from_attributes": True}
