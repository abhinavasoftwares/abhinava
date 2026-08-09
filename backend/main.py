from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from services.tenant_provisioning import provision_tenant

from database import SessionLocal
from models import Client
from schemas import ClientCreate
from fastapi import HTTPException



app = FastAPI(title="Abhinava API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sturdy-train-77rj957xr4pp2x675-5173.app.github.dev",
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
            "created_at": client.created_at,
            "updated_at": client.updated_at,
        }
    }