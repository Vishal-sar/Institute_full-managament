import os
import re
import httpx
import hashlib
import secrets
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response

from db import db, gen_id, now_iso, audit
from models import LoginIn, GoogleSessionIn, RegisterIn, ForgotPasswordIn, ResetPasswordIn
from emailer import notify
from security import (
    verify_password, create_access_token, create_refresh_token, set_auth_cookies,
    set_session_cookie, clear_cookies, get_current_user, check_lockout, register_failure,
    clear_failures, get_jwt_secret, hash_password,
)
from routes_public import rate_limit
import jwt
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
RESET_TTL_MINUTES = 60
RESET_INVALID = "This reset link is invalid or has expired. Please request a new one."


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _public_user(u: dict) -> dict:
    return {
        "id": u["id"], "name": u.get("name"), "email": u.get("email"),
        "role": u.get("role"), "phone": u.get("phone"), "picture": u.get("picture"),
        "linked_student_id": u.get("linked_student_id"),
        "linked_faculty_id": u.get("linked_faculty_id"),
        "auth_provider": u.get("auth_provider", "password"),
    }


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await register_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    await clear_failures(identifier)
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return _public_user(user)


@router.post("/register")
async def register(payload: RegisterIn, request: Request, response: Response):
    await rate_limit(request, "register", limit=5, window_sec=600)
    email = payload.email.lower().strip()
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
    # Self-service accounts are always students; link to an existing student record if the email matches.
    student = await db.students.find_one({"email": email}, {"_id": 0})
    uid = gen_id()
    user = {
        "id": uid, "email": email, "name": payload.name.strip(), "role": "student",
        "phone": payload.phone, "password_hash": hash_password(payload.password),
        "auth_provider": "password", "picture": None,
        "linked_student_id": student["id"] if student else None,
        "linked_faculty_id": None, "active": True,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.users.insert_one(user)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return _public_user(user)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordIn, request: Request, background: BackgroundTasks):
    await rate_limit(request, "forgot", limit=5, window_sec=900)
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if user and user.get("active", True):
        await db.password_reset_tokens.update_many({"user_id": user["id"], "used": False}, {"$set": {"used": True}})
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "id": gen_id(), "user_id": user["id"], "token_hash": _hash_token(token), "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=RESET_TTL_MINUTES), "created_at": now_iso(),
        })
        link = f"{os.environ['FRONTEND_URL'].rstrip('/')}/reset-password?token={token}"
        background.add_task(notify, "password_reset", email,
                            {"name": user.get("name"), "link": link, "minutes": RESET_TTL_MINUTES})
    # Same response whether or not the account exists (no user enumeration).
    return {"message": "If an account exists for this email, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordIn, request: Request):
    await rate_limit(request, "reset", limit=10, window_sec=900)
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    rec = await db.password_reset_tokens.find_one({"token_hash": _hash_token(payload.token), "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail=RESET_INVALID)
    exp = rec["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail=RESET_INVALID)
    claim = await db.password_reset_tokens.update_one(
        {"id": rec["id"], "used": False}, {"$set": {"used": True, "used_at": now_iso()}})
    if claim.modified_count == 0:
        raise HTTPException(status_code=400, detail=RESET_INVALID)
    user = await db.users.find_one({"id": rec["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user or not user.get("active", True):
        raise HTTPException(status_code=400, detail=RESET_INVALID)
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "password_hash": hash_password(payload.password), "updated_at": now_iso()}})
    await db.auth_sessions.delete_many({"user_id": user["id"]})
    await db.login_attempts.delete_many({"identifier": {"$regex": f":{re.escape(user['email'])}$"}})
    await audit(user, "password_reset", "user", user["id"], "Password reset via emailed link")
    return {"message": "Password updated. You can now sign in with your new password."}


@router.post("/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.auth_sessions.delete_one({"session_token": st})
    clear_cookies(response)
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user["id"], user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=60 * 60 * 12, path="/")
    return _public_user(user)


@router.post("/google/session")
async def google_session(payload: GoogleSessionIn, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
        r.raise_for_status()
        data = r.json()
    except Exception as e:  # noqa
        logger.error(f"google session exchange failed: {e}")
        raise HTTPException(status_code=401, detail="Google sign-in failed")

    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or email
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Invalid session data")

    user = await db.users.find_one({"email": email})
    if not user:
        # Link to an existing managed student/faculty by email, else create a self-service student.
        student = await db.students.find_one({"email": email}, {"_id": 0})
        faculty = await db.faculty.find_one({"email": email}, {"_id": 0})
        role = "student"
        linked_student_id = student["id"] if student else None
        linked_faculty_id = None
        if faculty:
            role = "teacher"
            linked_faculty_id = faculty["id"]
        uid = gen_id()
        user = {
            "id": uid, "email": email, "name": name, "role": role,
            "password_hash": None, "picture": picture, "auth_provider": "google",
            "linked_student_id": linked_student_id, "linked_faculty_id": linked_faculty_id,
            "active": True, "created_at": now_iso(), "updated_at": now_iso(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"id": user["id"]}, {"$set": {"picture": picture, "updated_at": now_iso()}})

    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    await db.auth_sessions.insert_one({
        "id": gen_id(), "user_id": user["id"], "session_token": session_token,
        "expires_at": expires_at, "created_at": now_iso(),
    })
    set_session_cookie(response, session_token)
    return _public_user(user)
