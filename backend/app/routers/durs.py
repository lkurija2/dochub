from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.repository import MemberRole
from ..models.document import Document, DocumentVersion
from ..models.dur import DUR, DURComment, DURStatus
from ..schemas.dur import (
    DURCreate, DUROut, DURWithUsers, DURReview, DURCommentCreate, DURCommentOut
)
from ..core.deps import get_current_user, get_optional_user
from .repositories import get_repo_or_404, check_repo_access, require_repo_role
from .documents import get_doc_or_404

router = APIRouter(prefix="/repos", tags=["durs"])


@router.get("/{slug}/durs", response_model=List[DURWithUsers])
def list_durs(
    slug: str,
    status: Optional[DURStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)

    query = db.query(DUR).filter(DUR.repo_id == repo.id)
    if status:
        query = query.filter(DUR.status == status)
    return query.order_by(DUR.created_at.desc()).all()


@router.post("/{slug}/durs", response_model=DUROut, status_code=201)
def create_dur(
    slug: str,
    data: DURCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)

    # Verify document exists in this repo
    doc = db.query(Document).filter(
        Document.id == data.document_id,
        Document.repo_id == repo.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found in this repository")

    dur = DUR(
        repo_id=repo.id,
        document_id=data.document_id,
        title=data.title,
        description=data.description,
        proposed_content=data.proposed_content,
        created_by=current_user.id,
        status=DURStatus.open,
    )
    db.add(dur)
    db.commit()
    db.refresh(dur)
    return dur


@router.get("/{slug}/durs/{dur_id}", response_model=DURWithUsers)
def get_dur(
    slug: str,
    dur_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)

    dur = db.query(DUR).filter(DUR.id == dur_id, DUR.repo_id == repo.id).first()
    if not dur:
        raise HTTPException(status_code=404, detail="DUR not found")
    return dur


@router.post("/{slug}/durs/{dur_id}/approve", response_model=DUROut)
def approve_dur(
    slug: str,
    dur_id: UUID,
    data: DURReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.editor)

    dur = db.query(DUR).filter(DUR.id == dur_id, DUR.repo_id == repo.id).first()
    if not dur:
        raise HTTPException(status_code=404, detail="DUR not found")
    if dur.status != DURStatus.open:
        raise HTTPException(status_code=400, detail="DUR is not open")

    doc = db.query(Document).filter(Document.id == dur.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update document content
    doc.current_content = dur.proposed_content
    doc.updated_at = datetime.utcnow()

    # Get latest version number
    latest = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc.id
    ).order_by(DocumentVersion.version_number.desc()).first()
    next_version = (latest.version_number + 1) if latest else 1

    # Create new version
    version = DocumentVersion(
        document_id=doc.id,
        content=dur.proposed_content,
        version_number=next_version,
        commit_message=f"Merged DUR: {dur.title}",
        created_by=current_user.id,
    )
    db.add(version)

    # Update DUR status
    dur.status = DURStatus.merged
    dur.reviewed_by = current_user.id
    dur.reviewed_at = datetime.utcnow()
    dur.review_comment = data.review_comment

    db.commit()
    db.refresh(dur)
    return dur


@router.post("/{slug}/durs/{dur_id}/reject", response_model=DUROut)
def reject_dur(
    slug: str,
    dur_id: UUID,
    data: DURReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.editor)

    dur = db.query(DUR).filter(DUR.id == dur_id, DUR.repo_id == repo.id).first()
    if not dur:
        raise HTTPException(status_code=404, detail="DUR not found")
    if dur.status != DURStatus.open:
        raise HTTPException(status_code=400, detail="DUR is not open")

    dur.status = DURStatus.rejected
    dur.reviewed_by = current_user.id
    dur.reviewed_at = datetime.utcnow()
    dur.review_comment = data.review_comment

    db.commit()
    db.refresh(dur)
    return dur


@router.post("/{slug}/durs/{dur_id}/comments", response_model=DURCommentOut, status_code=201)
def add_comment(
    slug: str,
    dur_id: UUID,
    data: DURCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)

    dur = db.query(DUR).filter(DUR.id == dur_id, DUR.repo_id == repo.id).first()
    if not dur:
        raise HTTPException(status_code=404, detail="DUR not found")

    comment = DURComment(
        dur_id=dur_id,
        user_id=current_user.id,
        content=data.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/{slug}/durs/{dur_id}/comments", response_model=List[DURCommentOut])
def get_comments(
    slug: str,
    dur_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)

    dur = db.query(DUR).filter(DUR.id == dur_id, DUR.repo_id == repo.id).first()
    if not dur:
        raise HTTPException(status_code=404, detail="DUR not found")

    return db.query(DURComment).filter(DURComment.dur_id == dur_id).order_by(DURComment.created_at).all()
