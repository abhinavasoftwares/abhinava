from sqlalchemy.orm import Session

from models import Client


def provision_tenant(
    db: Session,
    client: Client,
) -> Client:
    """
    Mock tenant provisioning.

    This does NOT create a real Firebase project yet.
    It only simulates the provisioning lifecycle so that
    we can validate our architecture safely.
    """

    client.firebase_provisioning_status = "PROVISIONING"

    db.commit()
    db.refresh(client)

    # TODO:
    # Replace this mock implementation with the real
    # Google Cloud / Firebase provisioning process.

    client.firebase_provisioning_status = "READY"

    db.commit()
    db.refresh(client)

    return client