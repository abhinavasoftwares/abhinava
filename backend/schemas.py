from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    business_name: str
    legal_business_name: str
    business_type: str
    country: str

    business_email: EmailStr
    business_phone: str

    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    owner_role: str

    pan: str
    gstin: str | None = None

    plan: str
    billing_cycle: str
    subscription_status: str
    start_date: str