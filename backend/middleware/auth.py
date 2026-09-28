import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
from fastapi import Depends, HTTPException, status, WebSocket, WebSocketException
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from logger import logger

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Warn in logs if default insecure secret is used in non-local environments
if SECRET_KEY == "your-super-secret-key-change-this-in-production" and os.getenv("ENVIRONMENT") == "production":
    logger.warning("CRITICAL SECURITY WARNING: Using default insecure SECRET_KEY in production!")

# OAuth2 scheme for Swagger UI & route protection (points to /auth/login)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=True)


def hash_password(password: str) -> str:
    """Hashes a password using bcrypt with standard 72-byte truncation."""
    if not password:
        raise ValueError("Password cannot be empty")
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: Optional[str], hashed_password: Optional[str]) -> bool:
    """Safely verifies a plain text password against a hashed password without crashing on invalid formats."""
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception as e:
        logger.debug(f"Password verification failed due to exception: {e}")
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a secure JSON web token with exp, iat, and subject claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # Standard JWT claims
    to_encode.update({
        "iat": now,
        "exp": expire,
    })

    # Ensure subject claim is stringified if present
    if "sub" in to_encode and to_encode["sub"] is not None:
        to_encode["sub"] = str(to_encode["sub"])

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def _clean_token_string(token: Optional[str]) -> Optional[str]:
    """Normalizes token by trimming whitespace and removing optional 'Bearer ' prefix."""
    if not token:
        return None
    token = token.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    return token if token else None


def _decode_token(token: str) -> Dict[str, Any]:
    """Shared decode and validation step used by both HTTP dependencies and WebSocket auth."""
    cleaned = _clean_token_string(token)
    if not cleaned:
        raise JWTError("Token is empty or invalid format")

    payload = jwt.decode(cleaned, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("sub")
    if user_id is None:
        raise JWTError("Token payload is missing the 'sub' claim")

    return {
        "user_id": str(user_id),
        "email": payload.get("email"),
        "username": payload.get("username"),
        **{k: v for k, v in payload.items() if k not in ("sub", "user_id")},
    }


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Decodes and validates the user JWT token from the Authorization header."""
    try:
        return _decode_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_ws(websocket: WebSocket, token: Optional[str] = None) -> Dict[str, Any]:
    """WebSocket equivalent of get_current_user.

    Extracts token from direct argument, query parameter (`?token=`), or Authorization/Sec-WebSocket-Protocol headers.
    Raises WebSocketException with policy violation code (1008) on failure.
    """
    token_str = (
        token
        or websocket.query_params.get("token")
        or websocket.headers.get("authorization")
        or websocket.headers.get("sec-websocket-protocol")
    )
    cleaned = _clean_token_string(token_str)
    if not cleaned:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Missing or empty authentication token")

    try:
        return _decode_token(cleaned)
    except ExpiredSignatureError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Token has expired")
    except (JWTError, Exception) as exc:
        logger.debug(f"WebSocket token validation rejected: {exc}")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or malformed authentication token")