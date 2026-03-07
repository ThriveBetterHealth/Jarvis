"""Authentication routes."""

from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_qr_code_base64,
    generate_totp_secret,
    get_totp_uri,
    verify_password,
    verify_totp,
)
from models.user import User
from services.audit_service import AuditService
from services.user_service import UserService

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class SetupMFAResponse(BaseModel):
    secret: str
    qr_code_base64: str
    uri: str


class VerifyMFARequest(BaseModel):
    secret: str
    totp_code: str


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    user = await service.get_by_email(body.email)

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account inactive")

    if user.mfa_enabled:
        if not body.totp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA code required",
                headers={"X-MFA-Required": "true"},
            )
        from core.security import decrypt_value
        secret = decrypt_value(user.mfa_secret)
        if not verify_totp(secret, body.totp_code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    # Store the jti of the new refresh token
    payload = decode_token(refresh_token)
    await service.update_refresh_jti(user.id, payload["jti"])

    audit = AuditService(db)
    await audit.log(
        user_id=user.id,
        action="auth.login",
        ip_address=request.client.host if request.client else None,
    )

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    from jose import JWTError
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    from uuid import UUID
    user_id = UUID(payload["sub"])
    jti = payload.get("jti")

    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user or not user.is_active or user.active_refresh_jti != jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    access_token = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    new_payload = decode_token(new_refresh)
    await service.update_refresh_jti(user.id, new_payload["jti"])

    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    await service.update_refresh_jti(current_user.id, None)

    audit = AuditService(db)
    await audit.log(
        user_id=current_user.id,
        action="auth.logout",
        ip_address=request.client.host if request.client else None,
    )


@router.get("/mfa/setup", response_model=SetupMFAResponse)
async def setup_mfa(current_user: User = Depends(get_current_user)):
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.email)
    qr = generate_qr_code_base64(uri)
    return SetupMFAResponse(secret=secret, qr_code_base64=qr, uri=uri)


@router.post("/mfa/verify")
async def verify_and_enable_mfa(
    body: VerifyMFARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_totp(body.secret, body.totp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")

    from core.security import encrypt_value
    service = UserService(db)
    await service.enable_mfa(current_user.id, encrypt_value(body.secret))
    return {"message": "MFA enabled successfully"}


@router.delete("/mfa", status_code=status.HTTP_204_NO_CONTENT)
async def disable_mfa(
    totp_code: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA not enabled")

    from core.security import decrypt_value
    secret = decrypt_value(current_user.mfa_secret)
    if not verify_totp(secret, totp_code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

    service = UserService(db)
    await service.disable_mfa(current_user.id)


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value if hasattr(current_user.role, "value") else current_user.role,
        "mfa_enabled": current_user.mfa_enabled,
        "preferences": current_user.preferences,
        "created_at": current_user.created_at,
    }


class UpdateMeRequest(BaseModel):
    full_name: Optional[str] = None


@router.patch("/me")
async def update_me(
    body: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile (name only — email/role locked)."""
    if body.full_name is not None:
        current_user.full_name = body.full_name.strip()
        await db.flush()
        await db.commit()
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value if hasattr(current_user.role, "value") else current_user.role,
        "mfa_enabled": current_user.mfa_enabled,
    }


# ── User management (owner only) ────────────────────────────────────────────

def _require_owner(current_user: User = Depends(get_current_user)) -> User:
    role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")
    return current_user


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_owner),
):
    """List all users (owner only)."""
    service = UserService(db)
    users = await service.list_all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        for u in users
    ]


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str = "user"
    full_name: Optional[str] = None


@router.post("/users/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    body: InviteUserRequest,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(_require_owner),
):
    """Create a new user account (owner only). Returns a temporary password."""
    import secrets
    from core.security import hash_password
    from models.user import UserRole

    service = UserService(db)
    existing = await service.get_by_email(body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        role_enum = UserRole(body.role)
    except ValueError:
        role_enum = UserRole.USER

    temp_password = secrets.token_urlsafe(12)
    new_user = User(
        email=body.email.lower(),
        full_name=body.full_name or body.email.split("@")[0],
        password_hash=hash_password(temp_password),
        role=role_enum,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()
    await db.commit()

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role.value if hasattr(new_user.role, "value") else new_user.role,
        "temp_password": temp_password,
        "message": f"Account created. Share this temporary password with the user: {temp_password}",
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(_require_owner),
):
    """Deactivate a user account (owner only). Cannot deactivate yourself."""
    from uuid import UUID as Uuid
    service = UserService(db)
    target = await service.get_by_id(Uuid(user_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == owner.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
    target.is_active = False
    target.soft_delete()
    await db.flush()
    await db.commit()
