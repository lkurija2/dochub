from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import re
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.repository import DocRepository, RepositoryMember, MemberRole
from ..models.document import Document, DocumentVersion
from ..schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentOut, DocumentWithCreator,
    DocumentVersionOut
)
from ..core.deps import get_current_user, get_optional_user
from .repositories import get_repo_or_404, check_repo_access, require_repo_role

router = APIRouter(prefix="/repos", tags=["documents"])


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')


def get_doc_or_404(repo_id: UUID, doc_slug: str, db: Session) -> Document:
    doc = db.query(Document).filter(
        Document.repo_id == repo_id,
        Document.slug == doc_slug,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{slug}/docs", response_model=List[DocumentWithCreator])
def list_docs(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)
    return db.query(Document).filter(Document.repo_id == repo.id).all()


@router.post("/{slug}/docs", response_model=DocumentOut, status_code=201)
def create_doc(
    slug: str,
    data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.editor)

    doc_slug = data.slug or slugify(data.title)
    base_slug = doc_slug
    counter = 1
    while db.query(Document).filter(Document.repo_id == repo.id, Document.slug == doc_slug).first():
        doc_slug = f"{base_slug}-{counter}"
        counter += 1

    doc = Document(
        repo_id=repo.id,
        title=data.title,
        slug=doc_slug,
        current_content=data.current_content,
        created_by=current_user.id,
    )
    db.add(doc)
    db.flush()

    # Create initial version
    version = DocumentVersion(
        document_id=doc.id,
        content=data.current_content,
        version_number=1,
        commit_message="Initial version",
        created_by=current_user.id,
    )
    db.add(version)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{slug}/docs/{doc_slug}", response_model=DocumentWithCreator)
def get_doc(
    slug: str,
    doc_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)
    return get_doc_or_404(repo.id, doc_slug, db)


@router.put("/{slug}/docs/{doc_slug}", response_model=DocumentOut)
def update_doc(
    slug: str,
    doc_slug: str,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.editor)
    doc = get_doc_or_404(repo.id, doc_slug, db)

    if data.title is not None:
        doc.title = data.title

    if data.current_content is not None:
        doc.current_content = data.current_content
        doc.updated_at = datetime.utcnow()

        # Get latest version number
        latest = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == doc.id
        ).order_by(DocumentVersion.version_number.desc()).first()
        next_version = (latest.version_number + 1) if latest else 1

        version = DocumentVersion(
            document_id=doc.id,
            content=data.current_content,
            version_number=next_version,
            commit_message=data.commit_message or f"Update version {next_version}",
            created_by=current_user.id,
        )
        db.add(version)

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{slug}/docs/{doc_slug}", status_code=204)
def delete_doc(
    slug: str,
    doc_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.admin)
    doc = get_doc_or_404(repo.id, doc_slug, db)
    db.delete(doc)
    db.commit()


@router.get("/{slug}/docs/{doc_slug}/versions", response_model=List[DocumentVersionOut])
def get_versions(
    slug: str,
    doc_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)
    doc = get_doc_or_404(repo.id, doc_slug, db)
    return db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc.id
    ).order_by(DocumentVersion.version_number.desc()).all()


@router.get("/{slug}/docs/{doc_slug}/versions/{version_number}", response_model=DocumentVersionOut)
def get_version(
    slug: str,
    doc_slug: str,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)
    doc = get_doc_or_404(repo.id, doc_slug, db)
    version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc.id,
        DocumentVersion.version_number == version_number,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version
