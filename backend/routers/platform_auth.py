import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import SessionLocal
from models import PlatformAuditEvent, PlatformUser
from services.platform_auth_transaction import (
    consume_auth_transaction,
    create_auth_transaction,
    derive_nonce_from_state,
)
from services.platform_identity import (
    PlatformIdentityDenied,
    resolve_google_identity,
)
from services.platform_oidc import (
    create_oauth_client,
    get_frontend_url,
    get_google_oidc_configuration,
    get_google_redirect_uri,
)
from services.platform_session import (
    create_platform_session,
    get_active_platform_session,
    revoke_platform_session,
)


router = APIRouter(
    prefix="/auth",
    tags=["Platform Authentication"],
)


SESSION_COOKIE_NAME = "abhinava_platform_session"


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def _client_ip(request: Request) -> str | None:
    if request.client:
        return request.client.host

    return None


def _write_audit_event(
    db: Session,
    *,
    event_type: str,
    outcome: str,
    actor_platform_user_id=None,
    actor_identity: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    request_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict | None = None,
):
    event = PlatformAuditEvent(
        event_type=event_type,
        outcome=outcome,
        actor_platform_user_id=actor_platform_user_id,
        actor_identity=actor_identity,
        target_type=target_type,
        target_id=target_id,
        request_id=request_id,
        ip_address=ip_address,
        user_agent=user_agent,
        event_metadata=metadata or {},
    )

    db.add(event)
    db.commit()


# ============================================================================
# CURRENT PLATFORM USER
# ============================================================================

@router.get("/me")
async def get_current_platform_user(
    request: Request,
    db: Session = Depends(get_db),
):
    raw_session_token = request.cookies.get(
        SESSION_COOKIE_NAME
    )

    if not raw_session_token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated.",
        )

    session = get_active_platform_session(
        db=db,
        raw_token=raw_session_token,
    )

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Session is invalid or expired.",
        )

    platform_user = (
        db.query(PlatformUser)
        .filter(
            PlatformUser.id
            == session.platform_user_id
        )
        .first()
    )

    if platform_user is None:
        raise HTTPException(
            status_code=401,
            detail="Platform user no longer exists.",
        )

    return {
        "id": str(platform_user.id),
        "email": platform_user.email,
        "display_name": platform_user.display_name,
        "role": platform_user.role,
        "status": platform_user.status,
    }

@router.post("/logout")
async def platform_logout(
    request: Request,
    db: Session = Depends(get_db),
):
    raw_session_token = request.cookies.get(
        SESSION_COOKIE_NAME
    )

    if raw_session_token:
        session = get_active_platform_session(
            db=db,
            raw_token=raw_session_token,
        )

        if session is not None:
            revoke_platform_session(
                db=db,
                raw_token=raw_session_token,
            )

            _write_audit_event(
                db,
                event_type="PLATFORM_LOGOUT",
                outcome="SUCCESS",
                actor_platform_user_id=session.platform_user_id,
                target_type="PLATFORM_USER",
                target_id=str(session.platform_user_id),
                ip_address=_client_ip(request),
                user_agent=request.headers.get(
                    "user-agent"
                ),
                metadata={
                    "provider": "platform_session",
                },
            )

    response = {
        "message": "Logged out successfully."
    }

    redirect_response = RedirectResponse(
        url=get_frontend_url(),
        status_code=303,
    )

    redirect_response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
    )

    return redirect_response

# ============================================================================
# GOOGLE LOGIN
# ============================================================================

@router.get("/google/login")
async def google_login(
    request: Request,
    db: Session = Depends(get_db),
):
    client_host = _client_ip(request)

    user_agent = request.headers.get(
        "user-agent"
    )

    state, nonce = create_auth_transaction(
        db=db,
        ip_address=client_host,
        user_agent=user_agent,
    )

    oidc_config = (
        await get_google_oidc_configuration()
    )

    authorization_endpoint = oidc_config.get(
        "authorization_endpoint"
    )

    if not authorization_endpoint:
        raise HTTPException(
            status_code=500,
            detail="Google authorization endpoint is unavailable.",
        )

    oauth = create_oauth_client()
    google = oauth.create_client("google")

    authorization_url = (
        await google.create_authorization_url(
            redirect_uri=get_google_redirect_uri(),
            state=state,
            nonce=nonce,
        )
    )

    return RedirectResponse(
        url=authorization_url["url"],
        status_code=302,
    )


# ============================================================================
# GOOGLE CALLBACK
# ============================================================================

@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    state = request.query_params.get("state")
    code = request.query_params.get("code")
    error = request.query_params.get("error")

    client_host = _client_ip(request)
    user_agent = request.headers.get(
        "user-agent"
    )

    if error:
        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="DENIED",
            actor_identity=None,
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "google_authorization_denied",
                "error": error,
            },
        )

        raise HTTPException(
            status_code=401,
            detail="Google authentication was denied.",
        )

    if not state or not code:
        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="FAILURE",
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "missing_callback_parameters",
            },
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid Google authentication callback.",
        )

    transaction = consume_auth_transaction(
        db=db,
        state=state,
    )

    if transaction is None:
        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="DENIED",
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "invalid_or_expired_state",
            },
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid or expired authentication transaction.",
        )

    expected_nonce = derive_nonce_from_state(
        state
    )

    if transaction.nonce_hash != __import__(
        "hashlib"
    ).sha256(
        expected_nonce.encode("utf-8")
    ).hexdigest():
        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="FAILURE",
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "nonce_transaction_mismatch",
            },
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid authentication transaction.",
        )

    platform_user = None
    email = None

    try:
        oauth = create_oauth_client()
        google = oauth.create_client("google")

        token = await google.fetch_access_token(
            code=code,
            redirect_uri=get_google_redirect_uri(),
        )

        claims = await google.parse_id_token(
            token,
            nonce=expected_nonce,
        )

        google_subject = claims.get("sub")
        email = claims.get("email")
        display_name = claims.get("name")

        if not google_subject or not email:
            raise ValueError(
                "Google identity claims are incomplete."
            )

        platform_user = resolve_google_identity(
            db=db,
            google_subject=google_subject,
            email=email,
            display_name=display_name,
        )

    except PlatformIdentityDenied:
        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="DENIED",
            actor_identity=email.strip().lower()
            if email
            else None,
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "platform_identity_denied",
            },
        )

        raise HTTPException(
            status_code=403,
            detail="Google identity is not authorized for Abhinava.",
        )

    except Exception as exc:
        print(
            "GOOGLE TOKEN VALIDATION ERROR:",
            repr(exc),
        )

        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="FAILURE",
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "google_token_validation_failed",
            },
        )

        raise HTTPException(
            status_code=401,
            detail="Google authentication could not be verified.",
        )

    if platform_user is None:
        raise HTTPException(
            status_code=500,
            detail="Platform identity resolution failed.",
        )

    # ------------------------------------------------------------------------
    # Create platform session
    # ------------------------------------------------------------------------

    try:
        raw_session_token, session = create_platform_session(
            db=db,
            platform_user_id=platform_user.id,
            ip_address=client_host,
            user_agent=user_agent,
        )

        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="SUCCESS",
            actor_platform_user_id=platform_user.id,
            actor_identity=platform_user.email,
            target_type="PLATFORM_USER",
            target_id=str(platform_user.id),
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "role": platform_user.role,
            },
        )

    except Exception as exc:
        print(
            "PLATFORM SESSION CREATION ERROR:",
            repr(exc),
        )

        _write_audit_event(
            db,
            event_type="PLATFORM_LOGIN",
            outcome="FAILURE",
            actor_platform_user_id=platform_user.id,
            actor_identity=platform_user.email,
            ip_address=client_host,
            user_agent=user_agent,
            metadata={
                "provider": "google",
                "reason": "platform_session_creation_failed",
            },
        )

        raise HTTPException(
            status_code=500,
            detail="Platform session could not be created.",
        )

    response = RedirectResponse(
        url=get_frontend_url(),
        status_code=302,
    )

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_session_token,
        max_age=8 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )

    return response