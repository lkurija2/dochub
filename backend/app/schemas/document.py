from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from .user import UserOut


class DocumentBase(BaseModel):
    title: str
    current_content: str = ""


class DocumentCreate(DocumentBase):
    slug: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    current_content: Optional[str] = None
    commit_message: Optional[str] = None


class DocumentOut(DocumentBase):
    id: UUID
    repo_id: UUID
    slug: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentWithCreator(DocumentOut):
    creator: UserOut

    model_config = {"from_attributes": True}


class DocumentVersionBase(BaseModel):
    content: str
    commit_message: Optional[str] = None


class DocumentVersionOut(DocumentVersionBase):
    id: UUID
    document_id: UUID
    version_number: int
    created_by: UUID
    created_at: datetime
    creator: UserOut

    model_config = {"from_attributes": True}
