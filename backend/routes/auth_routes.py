from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from database import db_connect
from logger import logger
from middleware.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class UpdateEmailRequest(BaseModel):
    email: EmailStr

class Password(BaseModel):
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.patch("/me/email")
async def update_email(
    body: UpdateEmailRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Updates the authenticated user's email address."""
    try:
        await db.execute(
            text("UPDATE users SET email = :email WHERE id = :uid"),
            {"email": body.email, "uid": int(current_user["user_id"])},
        )
        await db.commit()
    except DBAPIError as e:
        await db.rollback()
        if "Duplicate entry" in str(e.orig) or "email" in str(e.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update email",
        )
    return {"user_id": int(current_user["user_id"]), "email": body.email}

@router.post("/register")
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(db_connect),
):
    """Registers a new user directly via SQL INSERT."""
    hashed_password = hash_password(body.password)

    try:
        # Check if email already exists
        existing = await db.execute(
            text("SELECT id FROM users WHERE email = :email LIMIT 1"),
            {"email": body.email},
        )
        if existing.mappings().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Check if username already exists
        existing_user = await db.execute(
            text("SELECT id FROM users WHERE username = :username LIMIT 1"),
            {"username": body.username},
        )
        if existing_user.mappings().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        # Insert the new user
        await db.execute(
            text(
                "INSERT INTO users "
                "(username, email, hashed_password, role, token_version, auth_provider, leave_balance, is_active, is_deleted, created_at) "
                "VALUES (:username, :email, :pwd, 'user', 0, 'local', 0, TRUE, FALSE, NOW())"
            ),
            {
                "username": body.username,
                "email": body.email,
                "pwd": hashed_password,
            },
        )
        await db.commit()

        # Fetch the newly created user
        result = await db.execute(
            text("SELECT id, username, email, is_active FROM users WHERE email = :email LIMIT 1"),
            {"email": body.email},
        )
        row = result.mappings().first()

    except HTTPException:
        raise
    except DBAPIError as e:
        await db.rollback()
        err_str = str(e.orig) if e.orig else str(e)
        logger.error(f"Registration failed for {body.email}: {e}")
        if "Duplicate entry" in err_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB error during registration: {err_str}",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Unexpected registration error for {body.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during registration: {str(e)}",
        )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration did not return a user record",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(row["id"])}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "is_active": True,
        },
    }


@router.post("/login")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(db_connect),
):
    """Authenticates a user against the users table and returns a JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        result = await db.execute(
            text(
                "SELECT id, username, email, hashed_password, is_active "
                "FROM users WHERE email = :email AND is_deleted = FALSE LIMIT 1"
            ),
            {"email": body.email},
        )
        user = result.mappings().first()
    except DBAPIError as e:
        err_str = str(e.orig) if e.orig else str(e)
        logger.error(f"Login DB error for {body.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB error during login: {err_str}",
        )
    except Exception as e:
        logger.error(f"Unexpected login error for {body.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during login: {str(e)}",
        )

    if user is None:
        raise credentials_exception

    if not verify_password(body.password, user["hashed_password"]):
        raise credentials_exception

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # Keep the JWT "sub" claim as the user's stable ID (not email), so it
    # lines up with what get_current_user() reads back out.
    access_token = create_access_token(
        data={"sub": str(user["id"])}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_active": user["is_active"],
        },
    }


@router.get("/search", status_code=status.HTTP_200_OK)
async def search_users(
    q: str,
    db: AsyncSession = Depends(db_connect),
):
    """Search for users by username or email, for inviting collaborators.

    Returns a trimmed list of matching users (excluding password hashes).
    The room owner uses this to find the user_id to grant permission to.
    """
    query = f"%{q}%"
    result = await db.execute(
        text(
            "SELECT id, username, email FROM users "
            "WHERE username LIKE :q OR email LIKE :q LIMIT 20"
        ),
        {"q": query},
    )
    rows = result.mappings().all()
    return [
        {"user_id": r["id"], "username": r["username"], "email": r["email"]}
        for r in rows
    ]


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Returns the currently authenticated user, based on the JWT sent in
    the Authorization header. authStore.initAuth() calls this on every page
    load to confirm the stored token is still valid and restore the session."""
    result = await db.execute(
        text(
            "SELECT id, username, email, is_active, age, designation "
            "FROM users WHERE id = :uid AND is_deleted = FALSE LIMIT 1"
        ),
        {"uid": int(current_user["user_id"])},
    )
    user = result.mappings().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "is_active": user["is_active"],
    }

@router.patch("/me/password")
async def update_password(
    body: Password,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Updates the authenticated user's password."""
    # Hash the new password before storing it in the database
    hashed_password = hash_password(body.password)

    try:
        await db.execute(
            text("UPDATE users SET password_hash = :pwd WHERE id = :uid"),
            {"pwd": hashed_password, "uid": int(current_user["user_id"])},
        )
        await db.commit()
    except DBAPIError as e:
        await db.rollback()
        logger.error(f"Password update failed for user {current_user['user_id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update password",
        )
    return {"message": "Password updated successfully"}
    
@router.post("/logout")
async def logout():
    """Handles user logout."""
    return {
        "message": "Logged out successfully"
    }