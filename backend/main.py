import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from routers.platform_auth import router as platform_auth_router


from database import SessionLocal
from models import Client
from schemas import ClientCreate
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


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/clients")
def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
):
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
    )

    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    provision_tenant(
        db=db,
        client=new_client,
    )

    return {
        "message": "Client created successfully",
        "client_id": new_client.id,
    }


@app.get("/clients")
def get_clients(
    db: Session = Depends(get_db),
):
    clients = db.query(Client).order_by(Client.id.desc()).all()

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
):
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

@app.get("/clients/{client_id}/firebase-config")
def get_client_firebase_config(
    client_id: int,
    db: Session = Depends(get_db),
):
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