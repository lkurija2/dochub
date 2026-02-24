from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import re
from ..database import get_db
from ..models.user import User
from ..models.repository import DocRepository, RepositoryMember, MemberRole
from ..schemas.repository import (
    RepositoryCreate, RepositoryUpdate, RepositoryOut, RepositoryWithOwner,
    MemberAdd, MemberOut
)
from ..core.deps import get_current_user, get_optional_user

router = APIRouter(prefix="/repos", tags=["repositories"])


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')


def get_repo_or_404(slug: str, db: Session) -> DocRepository:
    repo = db.query(DocRepository).filter(DocRepository.slug == slug).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


def check_repo_access(repo: DocRepository, user: Optional[User], db: Session) -> Optional[MemberRole]:
    """Returns the user's role in this repo, or None if no access."""
    if repo.is_public:
        if user is None:
            return None  # public viewer
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if str(repo.owner_id) == str(user.id) or user.is_admin:
        return MemberRole.admin
    member = db.query(RepositoryMember).filter(
        RepositoryMember.repo_id == repo.id,
        RepositoryMember.user_id == user.id,
    ).first()
    if member:
        return member.role
    if repo.is_public:
        return None  # authenticated but not member: read-only
    raise HTTPException(status_code=403, detail="Access denied")


def require_repo_role(repo: DocRepository, user: User, db: Session, min_role: MemberRole) -> MemberRole:
    """Require at minimum a certain role. Returns actual role."""
    role = check_repo_access(repo, user, db)
    role_order = {MemberRole.viewer: 0, MemberRole.editor: 1, MemberRole.admin: 2}
    if role is None:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if role_order.get(role, -1) < role_order.get(min_role, 0):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return role


@router.get("", response_model=List[RepositoryWithOwner])
def list_repos(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if current_user is None:
        return db.query(DocRepository).filter(DocRepository.is_public == True).all()

    if current_user.is_admin:
        return db.query(DocRepository).all()

    # Public repos + repos user is member of or owns
    from sqlalchemy import or_
    member_repo_ids = [m.repo_id for m in db.query(RepositoryMember).filter(
        RepositoryMember.user_id == current_user.id
    ).all()]

    repos = db.query(DocRepository).filter(
        or_(
            DocRepository.is_public == True,
            DocRepository.owner_id == current_user.id,
            DocRepository.id.in_(member_repo_ids),
        )
    ).all()
    return repos


@router.post("", response_model=RepositoryOut, status_code=201)
def create_repo(
    data: RepositoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = data.slug or slugify(data.name)
    # Ensure uniqueness
    base_slug = slug
    counter = 1
    while db.query(DocRepository).filter(DocRepository.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    repo = DocRepository(
        name=data.name,
        slug=slug,
        description=data.description,
        is_public=data.is_public,
        owner_id=current_user.id,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo


@router.get("/{slug}", response_model=RepositoryWithOwner)
def get_repo(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)
    return repo


@router.put("/{slug}", response_model=RepositoryOut)
def update_repo(
    slug: str,
    data: RepositoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.admin)

    if data.name is not None:
        repo.name = data.name
    if data.description is not None:
        repo.description = data.description
    if data.is_public is not None:
        repo.is_public = data.is_public

    db.commit()
    db.refresh(repo)
    return repo


@router.delete("/{slug}", status_code=204)
def delete_repo(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    if str(repo.owner_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the owner can delete this repository")
    db.delete(repo)
    db.commit()


@router.get("/{slug}/members", response_model=List[MemberOut])
def get_members(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    check_repo_access(repo, current_user, db)
    return db.query(RepositoryMember).filter(RepositoryMember.repo_id == repo.id).all()


@router.post("/{slug}/members", response_model=MemberOut, status_code=201)
def add_member(
    slug: str,
    data: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.admin)

    # Check user exists
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check already a member
    existing = db.query(RepositoryMember).filter(
        RepositoryMember.repo_id == repo.id,
        RepositoryMember.user_id == data.user_id,
    ).first()
    if existing:
        existing.role = data.role
        db.commit()
        db.refresh(existing)
        return existing

    member = RepositoryMember(repo_id=repo.id, user_id=data.user_id, role=data.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{slug}/members/{user_id}", status_code=204)
def remove_member(
    slug: str,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = get_repo_or_404(slug, db)
    require_repo_role(repo, current_user, db, MemberRole.admin)

    member = db.query(RepositoryMember).filter(
        RepositoryMember.repo_id == repo.id,
        RepositoryMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
