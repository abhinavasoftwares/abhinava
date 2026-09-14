from fastapi import APIRouter, Request

from services.whatsapp.webhooks import (
    verify_webhook,
    receive_webhook,
)


router = APIRouter(
    prefix="/api/whatsapp",
    tags=["WhatsApp"],
)


@router.get("/webhook")
async def whatsapp_webhook_verification(
    request: Request,
):
    return await verify_webhook(request)


@router.post("/webhook")
async def whatsapp_webhook_event(
    request: Request,
):
    return await receive_webhook(request)