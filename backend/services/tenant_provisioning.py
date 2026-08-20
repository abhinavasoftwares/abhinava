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

IAM_POLICY_URL = (
    "https://cloudresourcemanager.googleapis.com/v1"
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
    "identitytoolkit.googleapis.com",
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
# PROJECT IAM
# ============================================================

ABHINAVA_ADMIN_EMAIL = "sudhamsha@abhinava.site"


def _get_project_iam_policy(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Get the IAM policy for a Google Cloud project.
    """

    url = (
        f"{IAM_POLICY_URL}/projects/"
        f"{project_id}:getIamPolicy"
    )

    response = session.post(
        url,
        json={},
    )

    if response.status_code != 200:
        raise RuntimeError(
            "Failed to get IAM policy for project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()


def _set_project_iam_policy(
    session: AuthorizedSession,
    project_id: str,
    policy: dict,
) -> dict:
    """
    Set the IAM policy for a Google Cloud project.
    """

    url = (
        f"{IAM_POLICY_URL}/projects/"
        f"{project_id}:setIamPolicy"
    )

    response = session.post(
        url,
        json={
            "policy": policy,
        },
    )

    if response.status_code != 200:
        raise RuntimeError(
            "Failed to set IAM policy for project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()


def _grant_project_role(
    session: AuthorizedSession,
    project_id: str,
    email: str,
    role: str,
) -> None:
    """
    Grant a project-level IAM role to a user.

    Idempotent:
    - If the user already has the role, nothing changes.
    - If the role is missing, it is added.
    """

    if not email:
        raise RuntimeError(
            f"Cannot grant {role}: email is empty."
        )

    policy = _get_project_iam_policy(
        session=session,
        project_id=project_id,
    )

    bindings = policy.setdefault(
        "bindings",
        [],
    )

    member = f"user:{email}"

    # ---------------------------------------------------------
    # Find existing role binding
    # ---------------------------------------------------------

    existing_binding = None

    for binding in bindings:

        if binding.get("role") == role:
            existing_binding = binding
            break

    # ---------------------------------------------------------
    # Role already exists
    # ---------------------------------------------------------

    if existing_binding:

        members = existing_binding.setdefault(
            "members",
            [],
        )

        if member in members:
            return

        members.append(member)

    # ---------------------------------------------------------
    # Role does not exist
    # ---------------------------------------------------------

    else:

        bindings.append(
            {
                "role": role,
                "members": [
                    member,
                ],
            }
        )

    # ---------------------------------------------------------
    # Preserve IAM policy version
    # ---------------------------------------------------------

    policy["version"] = max(
        policy.get("version", 1),
        3,
    )

    _set_project_iam_policy(
        session=session,
        project_id=project_id,
        policy=policy,
    )


def _configure_project_access(
    session: AuthorizedSession,
    project_id: str,
    client: Client,
) -> None:
    """
    Configure tenant project access.

    Client:
        Owner

    Abhinava:
        Editor

    This function is idempotent and safe to run
    during provisioning retries.
    """

    # ---------------------------------------------------------
    # ABHINAVA — EDITOR
    # ---------------------------------------------------------

    _grant_project_role(
        session=session,
        project_id=project_id,
        email=ABHINAVA_ADMIN_EMAIL,
        role="roles/editor",
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
# FIREBASE WEB APP
# ============================================================

def _get_firebase_web_apps(
    session: AuthorizedSession,
    project_id: str,
) -> list[dict]:
    """
    Return all Firebase Web Apps belonging to the project.
    """

    url = (
        f"{FIREBASE_URL}/projects/"
        f"{project_id}/webApps"
    )

    response = session.get(url)

    if response.status_code != 200:
        raise RuntimeError(
            "Failed to list Firebase Web Apps "
            f"for project {project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    data = response.json()

    # Firebase API returns the collection under "apps".
    return data.get(
        "apps",
        [],
    )

def _create_firebase_web_app(
    session: AuthorizedSession,
    project_id: str,
    display_name: str,
) -> dict:
    """
    Create or reuse a Firebase Web App.

    This function is idempotent.

    If any Web App already exists for the tenant project,
    the first ACTIVE Web App is reused.
    """

    # ---------------------------------------------------------
    # STEP 1 — Check existing Web Apps
    # ---------------------------------------------------------

    web_apps = _get_firebase_web_apps(
        session=session,
        project_id=project_id,
    )

    if web_apps:

        # Prefer an ACTIVE Web App.
        for app in web_apps:

            if app.get("state") == "ACTIVE":
                return app

        # Otherwise reuse the first existing app.
        return web_apps[0]

    # ---------------------------------------------------------
    # STEP 2 — Create Web App
    # ---------------------------------------------------------

    url = (
        f"{FIREBASE_URL}/projects/"
        f"{project_id}/webApps"
    )

    payload = {
        "displayName": display_name,
    }

    response = session.post(
        url,
        json=payload,
    )

    if response.status_code not in (200, 201):

        # Another provisioning attempt may have created
        # the Web App between our GET and POST.
        if response.status_code == 409:

            web_apps = _get_firebase_web_apps(
                session=session,
                project_id=project_id,
            )

            if web_apps:

                for app in web_apps:

                    if app.get("state") == "ACTIVE":
                        return app

                return web_apps[0]

        raise RuntimeError(
            "Failed to create Firebase Web App "
            f"for project {project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    operation = response.json()

    # ---------------------------------------------------------
    # STEP 3 — Long-running operation
    # ---------------------------------------------------------

    if (
        operation.get("name")
        and not operation.get("appId")
    ):

        operation_name = operation["name"]

        completed = _wait_for_firebase_operation(
            session=session,
            operation_name=operation_name,
        )

        response_data = completed.get(
            "response",
            {},
        )

        if response_data.get("appId"):
            return response_data

    # ---------------------------------------------------------
    # STEP 4 — Direct Web App response
    # ---------------------------------------------------------

    if operation.get("appId"):
        return operation

    # ---------------------------------------------------------
    # STEP 5 — Last safety check
    # ---------------------------------------------------------

    web_apps = _get_firebase_web_apps(
        session=session,
        project_id=project_id,
    )

    if web_apps:

        for app in web_apps:

            if app.get("state") == "ACTIVE":
                return app

        return web_apps[0]

    raise RuntimeError(
        "Firebase Web App creation returned an "
        f"unexpected response: {operation}"
    )


def _get_firebase_web_app_config(
    session: AuthorizedSession,
    web_app_name: str,
) -> dict:
    """
    Retrieve Firebase Web App configuration.

    This is used later by the frontend/client
    to initialize Firebase.
    """

    url = (
        f"{FIREBASE_URL}/"
        f"{web_app_name}/config"
    )

    response = session.get(url)

    if response.status_code != 200:
        raise RuntimeError(
            "Failed to retrieve Firebase Web App "
            f"configuration: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()
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

    Google may return DONE_OPERATION when the operation
    is already complete. In that case, no polling is required.
    """

    # ---------------------------------------------------------
    # Already completed
    # ---------------------------------------------------------

    if operation_name in (
        "DONE_OPERATION",
        "operations/DONE_OPERATION",
    ):
        return {
            "done": True,
        }

    # ---------------------------------------------------------
    # Validate operation name
    # ---------------------------------------------------------

    if not operation_name.startswith("operations/"):
        raise RuntimeError(
            "Unexpected Service Usage operation name: "
            f"{operation_name}"
        )

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

    Required APIs:

        firestore.googleapis.com
        identitytoolkit.googleapis.com
    """

    for service_name in REQUIRED_APIS:

        # -----------------------------------------------------
        # STEP 1 — Check current API state
        # -----------------------------------------------------

        service_url = (
            f"{SERVICE_USAGE_URL}/projects/"
            f"{project_id}/services/"
            f"{service_name}"
        )

        state_response = session.get(
            service_url
        )

        if state_response.status_code != 200:
            raise RuntimeError(
                f"Failed checking API state for "
                f"{service_name} in project "
                f"{project_id}: "
                f"{state_response.status_code} "
                f"{state_response.text}"
            )

        service = state_response.json()

        # -----------------------------------------------------
        # STEP 2 — Already enabled
        # -----------------------------------------------------

        if service.get("state") == "ENABLED":
            continue

        # -----------------------------------------------------
        # STEP 3 — Enable API
        # -----------------------------------------------------

        enable_url = (
            f"{service_url}:enable"
        )

        response = session.post(
            enable_url,
            json={},
        )

        # -----------------------------------------------------
        # STEP 4 — Enable request accepted
        # -----------------------------------------------------

        if response.status_code in (200, 201):

            operation = response.json()

            # Google may return an already-completed
            # operation.
            if operation.get("done"):

                if "error" in operation:
                    raise RuntimeError(
                        "Service Usage operation failed: "
                        f"{operation['error']}"
                    )

                continue

            operation_name = operation.get("name")

            if not operation_name:
                raise RuntimeError(
                    f"Service Usage returned no operation "
                    f"name while enabling "
                    f"{service_name} for project "
                    f"{project_id}: "
                    f"{operation}"
                )

            _wait_for_service_usage_operation(
                session=session,
                operation_name=operation_name,
            )

            continue

        # -----------------------------------------------------
        # STEP 5 — API became enabled between GET and POST
        # -----------------------------------------------------

        if response.status_code == 409:
            continue

        # -----------------------------------------------------
        # STEP 6 — Unexpected error
        # -----------------------------------------------------

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

    for attempt in range(
        1,
        max_attempts + 1,
    ):

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
                time.sleep(
                    retry_delay_seconds
                )
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
        Required APIs
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
        # STEP 3 — Resolve tenant project ID
        # -------------------------------------------------

        # If this client already has a project from a
        # previous provisioning attempt, reuse it.
        #
        # This is critical for recovery.
        #
        # FAILED
        #   ↓
        # existing firebase_project_id
        #   ↓
        # retry
        #   ↓
        # same project
        #
        # Do NOT create another project.

        if client.firebase_project_id:

            project_id = (
                client.firebase_project_id
            )

        else:

            project_id = _generate_project_id(
                client
            )

        # -------------------------------------------------
        # STEP 4 — Generate project display name
        # -------------------------------------------------

        def _generate_project_display_name(
            client: Client,
        ) -> str:
            """
            Generate a Google Cloud project display name.

            Google Cloud allows a maximum of 30 characters.
            """

            suffix = " - Abhinava"

            max_business_length = (
                30 - len(suffix)
            )

            business_name = (
                client.business_name.strip()
            )

            if not business_name:
                business_name = "Client"

            business_name = (
                business_name[
                    :max_business_length
                ]
                .rstrip()
            )

            return (
                f"{business_name}{suffix}"
            )

        # -------------------------------------------------
        # STEP 5 — Create Google Cloud project if required
        # -------------------------------------------------

        if not client.firebase_project_id:

            _create_google_cloud_project(
                session=session,
                project_id=project_id,
                display_name=(
                    _generate_project_display_name(
                        client
                    )
                ),
            )

            # Save immediately because the project now exists.
            #
            # If a later provisioning step fails,
            # this ID is retained for recovery.

            client.firebase_project_id = (
                project_id
            )

            db.commit()
            db.refresh(client)

        # -------------------------------------------------
        # STEP 6 — Project ID already persisted
        #
        # For new clients it was saved above.
        # For retrying clients it already existed.
        # -------------------------------------------------

        # -------------------------------------------------
        # STEP 7 — Add Firebase
        # -------------------------------------------------

        # -------------------------------------------------
# STEP 7 — Add Firebase
# -------------------------------------------------

        _enable_firebase(
            session=session,
            project_id=project_id,
        )

        # -------------------------------------------------
        # STEP 7A — Create Firebase Web App
        # -------------------------------------------------

        web_app = _create_firebase_web_app(
            session=session,
            project_id=project_id,
            display_name=(
                f"{client.business_name} Web"
            ),
        )

        web_app_id = web_app.get("appId")

        if not web_app_id:
            raise RuntimeError(
                "Firebase Web App was created but "
                "no appId was returned."
            )

        client.firebase_web_app_id = web_app_id

        db.commit()
        db.refresh(client)

        # -------------------------------------------------
        # STEP 7B — Configure project access
        # -------------------------------------------------

        _configure_project_access(
            session=session,
            project_id=project_id,
            client=client,
        )

        # -------------------------------------------------
        # STEP 8 — Enable required APIs
        # -------------------------------------------------

        _enable_required_apis(
            session=session,
            project_id=project_id,
        )

        # -------------------------------------------------
        # STEP 9 — Create Firestore database
        # -------------------------------------------------

        _create_firestore_database(
            session=session,
            project_id=project_id,
        )

        # -------------------------------------------------
        # STEP 10 — Mark provisioning complete
        # -------------------------------------------------

        client.firebase_provisioning_status = (
            "READY"
        )

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

        # IMPORTANT:
        # Do not clear firebase_project_id here.
        #
        # If the Google Cloud project was already created,
        # we want to retain its ID so provisioning can later
        # be retried/recovered.

        client.firebase_provisioning_status = (
            "FAILED"
        )

        client.firebase_provisioning_error = (
            str(exc)
        )

        db.commit()
        db.refresh(client)

        return client