"""Authentication routes."""

import hashlib
from datetime import datetime, timezone
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
    hash_password,
    verify_password,
    verify_totp,
)
from models.user import User, UserRole
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
        "role": current_user.role,
        "mfa_enabled": current_user.mfa_enabled,
        "preferences": current_user.preferences,
        "created_at": current_user.created_at,
    }
