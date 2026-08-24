import os
from datetime import datetime

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session

from routers.platform_auth import router as platform_auth_router

from database import SessionLocal
from models import Client, PlatformUser
from services.crm_tenant import resolve_crm_client
from schemas import (
    ClientCreate,
    FirebaseConnectionRequest,
)
from services.tenant_connection import (
    verify_existing_firebase_project,
     _get_connection_session,
)
from services.platform_dependencies import (
    get_current_platform_user,
)
from services.tenant_provisioning import (
    provision_tenant,
    _get_google_session,
    _get_firebase_web_app_config,
)


app = FastAPI(title="Abhinava API")


app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["ABHINAVA_AUTH_TRANSACTION_SECRET"],
    https_only=True,
    same_site="lax",
)


app.include_router(platform_auth_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sturdy-train-77rj957xr4pp2x675-5173.app.github.dev",
        "https://sturdy-train-77rj957xr4pp2x675-5174.app.github.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# CRM TENANT CONFIGURATION
# ============================================================


@app.get("/crm/tenant")
def get_crm_tenant(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Return the CRM tenant configuration.

    Tenant resolution is handled centrally by
    resolve_crm_client().
    """

    client = resolve_crm_client(
        request=request,
        db=db,
    )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not connected."
            ),
        )

    if client.firebase_provisioning_status != "READY":
        raise HTTPException(
            status_code=409,
            detail="CRM tenant is not ready.",
        )

    return {
        "client_id": client.id,
        "tenant_id": client.tenant_id,
        "business_name": client.business_name,
        "logo_url": client.logo_url,
        "firebase_project_id": client.firebase_project_id,
        "firebase_web_app_id": client.firebase_web_app_id,
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}

# ============================================================
# PLATFORM CLIENT MANAGEMENT
# ============================================================


@app.post("/clients")
def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to create clients."
            ),
        )

    project_id = client.firebase_project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Firebase project ID is required.",
        )

    # ---------------------------------------------------------
    # STEP 1 — Verify existing client-owned Firebase project
    # ---------------------------------------------------------

    try:
        verification = (
            verify_existing_firebase_project(
                project_id
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Firebase project verification failed: "
                f"{exc}"
            ),
        )

    project = verification["project"]
    web_app = verification["web_app"]

    # ---------------------------------------------------------
    # STEP 2 — Create PostgreSQL client
    # ---------------------------------------------------------

    new_client = Client(
        business_name=client.business_name,
        legal_business_name=client.legal_business_name,
        business_type=client.business_type,
        country=client.country,
        business_email=client.business_email,
        business_phone=client.business_phone,
        owner_name=client.owner_name,
        owner_email=client.owner_email,
        owner_phone=client.owner_phone,
        owner_role=client.owner_role,
        pan=client.pan,
        gstin=client.gstin,
        plan=client.plan,
        billing_cycle=client.billing_cycle,
        subscription_status=client.subscription_status,
        start_date=client.start_date,
        domain=client.domain,
        modules=client.modules,

        # -----------------------------------------------------
        # CLIENT-OWNED FIREBASE MAPPING
        # -----------------------------------------------------

        firebase_project_id=project["project_id"],
        firebase_web_app_id=web_app["app_id"],
        firebase_provisioning_status="READY",
        firebase_provisioning_error=None,
        firebase_provisioned_at=datetime.utcnow(),
    )

    db.add(new_client)

    try:
        db.commit()
        db.refresh(new_client)

    except Exception:
        db.rollback()
        raise

    # ---------------------------------------------------------
    # STEP 3 — Return complete connection information
    # ---------------------------------------------------------

    return {
        "message": (
            "Client created and Firebase project "
            "connected successfully."
        ),
        "client_id": new_client.id,
        "tenant_id": new_client.tenant_id,
        "firebase_project_id": (
            new_client.firebase_project_id
        ),
        "firebase_web_app_id": (
            new_client.firebase_web_app_id
        ),
        "status": (
            new_client.firebase_provisioning_status
        ),
        "verification": verification,
    }

@app.post("/clients/{client_id}/connect-firebase")
def connect_existing_firebase(
    client_id: int,
    connection: FirebaseConnectionRequest,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to connect client Firebase."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    project_id = connection.firebase_project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Firebase project ID is required.",
        )

    try:
        verification = (
            verify_existing_firebase_project(
                project_id
            )
        )

    except Exception as exc:
        client.firebase_provisioning_status = (
            "FAILED"
        )

        client.firebase_provisioning_error = str(
            exc
        )

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    project = verification["project"]
    web_app = verification["web_app"]

    client.firebase_project_id = (
        project["project_id"]
    )

    client.firebase_web_app_id = (
        web_app["app_id"]
    )

    client.firebase_provisioning_status = (
        "READY"
    )

    client.firebase_provisioning_error = None

    from datetime import datetime

    client.firebase_provisioned_at = (
        datetime.utcnow()
    )

    db.commit()
    db.refresh(client)

    return {
        "message": (
            "Firebase project connected successfully."
        ),
        "client_id": client.id,
        "tenant_id": client.tenant_id,
        "firebase_project_id": (
            client.firebase_project_id
        ),
        "firebase_web_app_id": (
            client.firebase_web_app_id
        ),
        "status": (
            client.firebase_provisioning_status
        ),
        "verification": verification,
    }

@app.post("/clients/{client_id}/provision")
def provision_existing_client(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to provision clients."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    if client.firebase_provisioning_status == "READY":
        return {
            "message": "Client is already provisioned.",
            "client_id": client.id,
            "status": client.firebase_provisioning_status,
        }

    provisioned_client = provision_tenant(
        db=db,
        client=client,
    )

    if (
        provisioned_client.firebase_provisioning_status
        != "READY"
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                provisioned_client.firebase_provisioning_error
                or "Client provisioning failed."
            ),
        )

    return {
        "message": "Client provisioned successfully.",
        "client_id": provisioned_client.id,
        "tenant_id": provisioned_client.tenant_id,
        "firebase_project_id": (
            provisioned_client.firebase_project_id
        ),
        "firebase_web_app_id": (
            provisioned_client.firebase_web_app_id
        ),
        "status": (
            provisioned_client.firebase_provisioning_status
        ),
    }


@app.get("/clients")
def get_clients(
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view clients.",
        )

    clients = (
        db.query(Client)
        .order_by(Client.id.desc())
        .all()
    )

    return {
        "clients": [
            {
                "id": client.id,
                "tenant_id": client.tenant_id,
                "business_name": client.business_name,
                "legal_business_name": client.legal_business_name,
                "business_type": client.business_type,
                "country": client.country,
                "business_email": client.business_email,
                "business_phone": client.business_phone,
                "owner_name": client.owner_name,
                "owner_email": client.owner_email,
                "owner_phone": client.owner_phone,
                "owner_role": client.owner_role,
                "pan": client.pan,
                "gstin": client.gstin,
                "plan": client.plan,
                "billing_cycle": client.billing_cycle,
                "subscription_status": client.subscription_status,
                "start_date": client.start_date,
                "domain": client.domain,
                "modules": client.modules,
                "created_at": client.created_at,
                "updated_at": client.updated_at,
            }
            for client in clients
        ]
    }


@app.get("/clients/{client_id}")
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this client.",
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    return {
        "client": {
            "id": client.id,
            "tenant_id": client.tenant_id,
            "business_name": client.business_name,
            "legal_business_name": client.legal_business_name,
            "business_type": client.business_type,
            "country": client.country,
            "business_email": client.business_email,
            "business_phone": client.business_phone,
            "owner_name": client.owner_name,
            "owner_email": client.owner_email,
            "owner_phone": client.owner_phone,
            "owner_role": client.owner_role,
            "pan": client.pan,
            "gstin": client.gstin,
            "plan": client.plan,
            "billing_cycle": client.billing_cycle,
            "subscription_status": client.subscription_status,
            "start_date": client.start_date,
            "domain": client.domain,
            "modules": client.modules,
            "created_at": client.created_at,
            "updated_at": client.updated_at,
        }
    }

@app.get("/clients/{client_id}/firebase-status")
def get_client_firebase_status(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to view Firebase status."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "No Firebase project is connected "
                "to this client."
            ),
        )

    try:
        verification = (
            verify_existing_firebase_project(
                client.firebase_project_id
            )
        )

    except Exception as exc:
        return {
            "client_id": client.id,
            "firebase_project_id": (
                client.firebase_project_id
            ),
            "status": "ERROR",
            "error": str(exc),
        }

    return {
        "client_id": client.id,
        "firebase_project_id": (
            client.firebase_project_id
        ),
        "firebase_web_app_id": (
            client.firebase_web_app_id
        ),
        "connection_status": (
            client.firebase_provisioning_status
        ),
        "connected_at": (
            client.firebase_provisioned_at
        ),
        "verification": verification,
    }


@app.get("/clients/{client_id}/firebase-config")
def get_client_firebase_config(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission to access "
                "client Firebase configuration."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    if client.firebase_provisioning_status != "READY":
        raise HTTPException(
            status_code=409,
            detail=(
                "Firebase provisioning is not ready. "
                f"Current status: "
                f"{client.firebase_provisioning_status}"
            ),
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=500,
            detail="Firebase project ID is missing",
        )

    if not client.firebase_web_app_id:
        raise HTTPException(
            status_code=500,
            detail="Firebase Web App ID is missing",
        )

    try:
        session = _get_google_session()

        web_app_name = (
            f"projects/{client.firebase_project_id}/"
            f"webApps/{client.firebase_web_app_id}"
        )

        config = _get_firebase_web_app_config(
            session=session,
            web_app_name=web_app_name,
        )

        return {
            "tenantId": client.tenant_id,
            "clientId": client.id,
            "businessName": client.business_name,
            "firebase": config,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

# ============================================================
# CRM FIREBASE CONFIGURATION
# ============================================================


@app.get("/crm/firebase-config")
def get_crm_firebase_config(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Return Firebase Web App configuration for
    the CRM tenant resolved from the request.
    """

    client = resolve_crm_client(
        request=request,
        db=db,
    )

    if client.firebase_provisioning_status != "READY":
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase connection "
                "is not ready."
            ),
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not connected."
            ),
        )

    if not client.firebase_web_app_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase Web App "
                "is not configured."
            ),
        )

    try:
        session = _get_connection_session()

        web_app_name = (
            f"projects/{client.firebase_project_id}/"
            f"webApps/{client.firebase_web_app_id}"
        )

        config = _get_firebase_web_app_config(
            session=session,
            web_app_name=web_app_name,
        )

        return {
            "tenantId": client.tenant_id,
            "clientId": client.id,
            "businessName": client.business_name,
            "logoUrl": client.logo_url,
            "firebaseProjectId": (
                client.firebase_project_id
            ),
            "firebaseWebAppId": (
                client.firebase_web_app_id
            ),
            "firebase": config,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load CRM Firebase "
                f"configuration: {exc}"
            ),
        )