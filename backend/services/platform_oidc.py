import os
import secrets
from urllib.parse import urlencode

import httpx
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv


load_dotenv(".env")


GOOGLE_OIDC_DISCOVERY_URL = (
    "https://accounts.google.com/.well-known/openid-configuration"
)

GOOGLE_SCOPES = "openid email profile"


def _required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"{name} is not configured"
        )

    return value.strip()


def get_google_client_id() -> str:
    return _required_env("ABHINAVA_GOOGLE_CLIENT_ID")


def get_google_client_secret() -> str:
    return _required_env("ABHINAVA_GOOGLE_CLIENT_SECRET")


def get_google_redirect_uri() -> str:
    return _required_env("ABHINAVA_GOOGLE_REDIRECT_URI")


def get_frontend_url() -> str:
    return _required_env("ABHINAVA_FRONTEND_URL")


async def get_google_oidc_configuration() -> dict:
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(10.0)
    ) as client:
        response = await client.get(
            GOOGLE_OIDC_DISCOVERY_URL
        )

        response.raise_for_status()

        return response.json()


def create_google_oauth_state() -> str:
    return secrets.token_urlsafe(32)


def create_google_oauth_nonce() -> str:
    return secrets.token_urlsafe(32)


def build_google_authorization_url(
    *,
    state: str,
    nonce: str,
    authorization_endpoint: str,
) -> str:
    params = {
        "client_id": get_google_client_id(),
        "redirect_uri": get_google_redirect_uri(),
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "state": state,
        "nonce": nonce,
        "access_type": "online",
        "prompt": "select_account",
    }

    return (
        authorization_endpoint
        + "?"
        + urlencode(params)
    )


def create_oauth_client() -> OAuth:
    oauth = OAuth()

    oauth.register(
        name="google",
        client_id=get_google_client_id(),
        client_secret=get_google_client_secret(),
        server_metadata_url=GOOGLE_OIDC_DISCOVERY_URL,
        client_kwargs={
            "scope": GOOGLE_SCOPES,
        },
    )

    return oauth
