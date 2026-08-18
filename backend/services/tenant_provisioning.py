import re
import time
from datetime import datetime

import google.auth
from google.auth.transport.requests import AuthorizedSession
from sqlalchemy.orm import Session

from models import Client


# ============================================================
# GOOGLE CLOUD CONFIGURATION
# ============================================================

ORGANIZATION_ID = "480516102818"

RESOURCE_MANAGER_URL = (
    "https://cloudresourcemanager.googleapis.com/v3"
)

FIREBASE_URL = (
    "https://firebase.googleapis.com/v1beta1"
)

SERVICE_USAGE_URL = (
    "https://serviceusage.googleapis.com/v1"
)

FIRESTORE_URL = (
    "https://firestore.googleapis.com/v1"
)

# Primary Firestore location for Abhinava's India tenants.
FIRESTORE_LOCATION = "asia-south1"

# APIs required by the tenant data plane.
REQUIRED_APIS = [
    "firestore.googleapis.com",
]


# ============================================================
# GOOGLE AUTHENTICATION
# ============================================================

def _get_google_session() -> AuthorizedSession:
    """
    Uses Application Default Credentials.

    In local development, ADC is configured to impersonate
    abhinava-provisioner.

    In production (for example Cloud Run), ADC will use the
    attached service account automatically.
    """

    credentials, project_id = google.auth.default(
        scopes=[
            "https://www.googleapis.com/auth/cloud-platform"
        ]
    )

    return AuthorizedSession(credentials)


# ============================================================
# PROJECT ID GENERATION
# ============================================================

def _generate_project_id(client: Client) -> str:
    """
    Generate a Google Cloud project ID.

    Example:

        Vainavi
        + tenant UUID
        -> vainavi-db68f087

    Google Cloud project IDs:

    - must start with a lowercase letter
    - can contain lowercase letters, digits and hyphens
    - must be 6-30 characters
    """

    business_name = client.business_name.lower()

    business_name = re.sub(
        r"[^a-z0-9]+",
        "-",
        business_name,
    )

    business_name = business_name.strip("-")

    if not business_name:
        business_name = "client"

    # First 8 characters of tenant UUID without hyphens.
    tenant_suffix = (
        client.tenant_id
        .replace("-", "")
        [:8]
    )

    project_id = (
        f"{business_name[:20]}-{tenant_suffix}"
    )

    # Final safety cleanup.
    project_id = re.sub(
        r"[^a-z0-9-]",
        "",
        project_id,
    )

    project_id = project_id.strip("-")

    if len(project_id) < 6:
        project_id = f"client-{tenant_suffix}"

    return project_id[:30]


# ============================================================
# GOOGLE CLOUD PROJECT OPERATION
# ============================================================

def _wait_for_resource_manager_operation(
    session: AuthorizedSession,
    operation_name: str,
    timeout_seconds: int = 120,
) -> dict:
    """
    Poll a Cloud Resource Manager operation until completion.
    """

    url = (
        f"{RESOURCE_MANAGER_URL}/{operation_name}"
    )

    start = time.time()

    while True:
        response = session.get(url)

        if response.status_code != 200:
            raise RuntimeError(
                "Failed checking project creation "
                f"operation: {response.status_code} "
                f"{response.text}"
            )

        operation = response.json()

        if operation.get("done"):
            if "error" in operation:
                raise RuntimeError(
                    "Google Cloud project creation failed: "
                    f"{operation['error']}"
                )

            return operation

        if time.time() - start > timeout_seconds:
            raise TimeoutError(
                "Timed out waiting for Google Cloud "
                "project creation."
            )

        time.sleep(2)


def _create_google_cloud_project(
    session: AuthorizedSession,
    project_id: str,
    display_name: str,
) -> dict:
    """
    Create a Google Cloud project under the
    Abhinava organization.
    """

    url = (
        f"{RESOURCE_MANAGER_URL}/projects"
    )

    payload = {
        "projectId": project_id,
        "displayName": display_name,
        "parent": (
            f"organizations/{ORGANIZATION_ID}"
        ),
    }

    response = session.post(
        url,
        json=payload,
    )

    if response.status_code not in (200, 201):
        raise RuntimeError(
            "Failed to create Google Cloud project: "
            f"{response.status_code} "
            f"{response.text}"
        )

    operation = response.json()

    operation_name = operation.get("name")

    if not operation_name:
        raise RuntimeError(
            "Google Cloud did not return an "
            f"operation name: {operation}"
        )

    return _wait_for_resource_manager_operation(
        session,
        operation_name,
    )


# ============================================================
# FIREBASE OPERATION
# ============================================================

def _wait_for_firebase_operation(
    session: AuthorizedSession,
    operation_name: str,
    timeout_seconds: int = 300,
) -> dict:
    """
    Poll Firebase Management API operation
    until completion.
    """

    url = (
        f"{FIREBASE_URL}/{operation_name}"
    )

    start = time.time()

    while True:
        response = session.get(url)

        if response.status_code != 200:
            raise RuntimeError(
                "Failed checking Firebase operation: "
                f"{response.status_code} "
                f"{response.text}"
            )

        operation = response.json()

        if operation.get("done"):
            if "error" in operation:
                raise RuntimeError(
                    "Firebase provisioning failed: "
                    f"{operation['error']}"
                )

            return operation

        if time.time() - start > timeout_seconds:
            raise TimeoutError(
                "Timed out waiting for Firebase "
                "provisioning."
            )

        time.sleep(3)


def _enable_firebase(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Add Firebase resources to an existing
    Google Cloud project.
    """

    url = (
        f"{FIREBASE_URL}/projects/"
        f"{project_id}:addFirebase"
    )

    response = session.post(
        url,
        json={},
    )

    if response.status_code not in (200, 201):
        # Firebase may already be enabled.
        if response.status_code == 409:
            return {
                "already_exists": True,
            }

        raise RuntimeError(
            f"Failed to add Firebase to project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    operation = response.json()

    operation_name = operation.get("name")

    if not operation_name:
        raise RuntimeError(
            "Firebase did not return an "
            f"operation name: {operation}"
        )

    return _wait_for_firebase_operation(
        session,
        operation_name,
    )


# ============================================================
# SERVICE USAGE — ENABLE REQUIRED APIS
# ============================================================

def _wait_for_service_usage_operation(
    session: AuthorizedSession,
    operation_name: str,
    timeout_seconds: int = 300,
) -> dict:
    """
    Poll a Service Usage operation until completion.
    """

    url = (
        f"{SERVICE_USAGE_URL}/{operation_name}"
    )

    start = time.time()

    while True:
        response = session.get(url)

        if response.status_code != 200:
            raise RuntimeError(
                "Failed checking Service Usage "
                f"operation: {response.status_code} "
                f"{response.text}"
            )

        operation = response.json()

        if operation.get("done"):
            if "error" in operation:
                raise RuntimeError(
                    "Service Usage operation failed: "
                    f"{operation['error']}"
                )

            return operation

        if time.time() - start > timeout_seconds:
            raise TimeoutError(
                "Timed out waiting for API enablement."
            )

        time.sleep(2)


def _enable_required_apis(
    session: AuthorizedSession,
    project_id: str,
) -> None:
    """
    Enable all APIs required by the tenant data plane.

    Currently:

        firestore.googleapis.com
    """

    for service_name in REQUIRED_APIS:

        url = (
            f"{SERVICE_USAGE_URL}/projects/"
            f"{project_id}/services/"
            f"{service_name}:enable"
        )

        response = session.post(
            url,
            json={},
        )

        # Already enabled / operation accepted.
        if response.status_code in (200, 201):
            operation = response.json()

            operation_name = operation.get("name")

            if operation_name:
                _wait_for_service_usage_operation(
                    session,
                    operation_name,
                )

            continue

        # If the API is already enabled, Google may return
        # a conflict depending on the current state.
        if response.status_code == 409:
            continue

        raise RuntimeError(
            f"Failed to enable API "
            f"{service_name} for project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )


# ============================================================
# FIRESTORE
# ============================================================

def _wait_for_firestore_operation(
    session: AuthorizedSession,
    operation_name: str,
    timeout_seconds: int = 600,
) -> dict:
    """
    Poll a Firestore long-running operation
    until completion.
    """

    url = (
        f"{FIRESTORE_URL}/{operation_name}"
    )

    start = time.time()

    while True:
        response = session.get(url)

        if response.status_code != 200:
            raise RuntimeError(
                "Failed checking Firestore operation: "
                f"{response.status_code} "
                f"{response.text}"
            )

        operation = response.json()

        if operation.get("done"):
            if "error" in operation:
                raise RuntimeError(
                    "Firestore provisioning failed: "
                    f"{operation['error']}"
                )

            return operation

        if time.time() - start > timeout_seconds:
            raise TimeoutError(
                "Timed out waiting for Firestore "
                "database creation."
            )

        time.sleep(3)


def _create_firestore_database(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Create the default Firestore Native database
    in asia-south1.

    Newly created Google Cloud/Firebase projects can
    temporarily return 404 while Firestore control-plane
    resources propagate.

    Retry only on 404.
    """

    url = (
        f"{FIRESTORE_URL}/projects/"
        f"{project_id}/databases"
    )

    params = {
        "databaseId": "(default)",
    }

    payload = {
        "locationId": FIRESTORE_LOCATION,
        "type": "FIRESTORE_NATIVE",
    }

    max_attempts = 10
    retry_delay_seconds = 5

    for attempt in range(1, max_attempts + 1):

        response = session.post(
            url,
            params=params,
            json=payload,
        )

        # ---------------------------------------------
        # SUCCESS
        # ---------------------------------------------

        if response.status_code in (200, 201):
            operation = response.json()

            operation_name = operation.get("name")

            if not operation_name:
                raise RuntimeError(
                    "Firestore did not return an "
                    f"operation name: {operation}"
                )

            return _wait_for_firestore_operation(
                session,
                operation_name,
            )

        # ---------------------------------------------
        # ALREADY EXISTS
        # ---------------------------------------------

        if response.status_code == 409:
            return {
                "already_exists": True,
            }

        # ---------------------------------------------
        # TEMPORARY PROPAGATION DELAY
        # ---------------------------------------------

        if response.status_code == 404:

            if attempt < max_attempts:
                time.sleep(retry_delay_seconds)
                continue

            raise RuntimeError(
                "Firestore database creation remained "
                "unavailable after "
                f"{max_attempts} attempts for project "
                f"{project_id}: "
                f"{response.status_code} "
                f"{response.text}"
            )

        # ---------------------------------------------
        # OTHER ERROR
        # ---------------------------------------------

        raise RuntimeError(
            "Failed to create Firestore database "
            f"for project {project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    raise RuntimeError(
        "Unexpected Firestore provisioning failure "
        f"for project {project_id}"
    )


# ============================================================
# MAIN TENANT PROVISIONING
# ============================================================

def provision_tenant(
    db: Session,
    client: Client,
) -> Client:
    """
    Provision the client's isolated
    Google Cloud/Firebase environment.

    Lifecycle:

        PENDING
          ↓
        PROVISIONING
          ↓
        READY

    Failure:

        PROVISIONING
          ↓
        FAILED

    Current infrastructure:

        Google Cloud Project
          ↓
        Firebase
          ↓
        Firestore Native
          ↓
        asia-south1

    Business collections are intentionally NOT created here.
    """

    try:
        # -------------------------------------------------
        # STEP 1 — Mark provisioning started
        # -------------------------------------------------

        client.firebase_provisioning_status = (
            "PROVISIONING"
        )

        client.firebase_provisioning_error = None

        db.commit()
        db.refresh(client)

        # -------------------------------------------------
        # STEP 2 — Authenticate with Google
        # -------------------------------------------------

        session = _get_google_session()

        # -------------------------------------------------
        # STEP 3 — Generate unique tenant project ID
        # -------------------------------------------------

        project_id = _generate_project_id(client)

        def _generate_project_display_name(
            client: Client,
        ) -> str:
            """
            Generate a Google Cloud project display name.

            Google Cloud allows a maximum of 30 characters.
            """

            suffix = " - Abhinava"
            max_business_length = 30 - len(suffix)

            business_name = client.business_name.strip()

            if not business_name:
                business_name = "Client"

            business_name = business_name[:max_business_length].rstrip()

            return f"{business_name}{suffix}"

        # -------------------------------------------------
        # STEP 4 — Create Google Cloud project
        # -------------------------------------------------

        _create_google_cloud_project(
            session=session,
            project_id=project_id,
            display_name=_generate_project_display_name(client),
        )

        # -------------------------------------------------
        # STEP 5 — Add Firebase
        # -------------------------------------------------

        _enable_firebase(
            session=session,
            project_id=project_id,
        )

        # -------------------------------------------------
        # STEP 6 — Enable required APIs
        # -------------------------------------------------

        _enable_required_apis(
            session=session,
            project_id=project_id,
        )

        # -------------------------------------------------
        # STEP 7 — Create Firestore database
        # -------------------------------------------------

        _create_firestore_database(
            session=session,
            project_id=project_id,
        )

        # -------------------------------------------------
        # STEP 8 — Save Firebase project ID
        # -------------------------------------------------

        client.firebase_project_id = project_id

        client.firebase_provisioning_status = "READY"

        client.firebase_provisioning_error = None

        client.firebase_provisioned_at = (
            datetime.utcnow()
        )

        db.commit()
        db.refresh(client)

        return client

    except Exception as exc:
        # -------------------------------------------------
        # Provisioning failed
        # -------------------------------------------------

        db.rollback()

        client.firebase_provisioning_status = "FAILED"

        client.firebase_provisioning_error = str(exc)

        db.commit()
        db.refresh(client)

        return client