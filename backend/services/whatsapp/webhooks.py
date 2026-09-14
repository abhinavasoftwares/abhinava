import os
from fastapi import HTTPException, Request
from fastapi.responses import PlainTextResponse

VERIFY_TOKEN = os.environ.get("ABHINAVA_WHATSAPP_VERIFY_TOKEN")


async def verify_webhook(request: Request):
    params = request.query_params

    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode != "subscribe":
        raise HTTPException(
            status_code=403,
            detail="Invalid webhook mode."
        )

    if not VERIFY_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="WhatsApp webhook verify token is not configured."
        )

    if token != VERIFY_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Invalid verification token."
        )

    if not challenge:
        raise HTTPException(
            status_code=400,
            detail="Missing webhook challenge."
        )

    return PlainTextResponse(
        content=challenge,
        status_code=200
    )


async def receive_webhook(request: Request):
    payload = await request.json()

    print("WhatsApp webhook received:", payload)

    return {"status": "received"}