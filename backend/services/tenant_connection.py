from google.auth import default
from google.auth import impersonated_credentials
from google.auth.transport.requests import AuthorizedSession

from services.tenant_provisioning import (
    FIREBASE_URL,
    FIRESTORE_URL,
    SERVICE_USAGE_URL,
    _get_firebase_web_apps,
)


ABHINAVA_PROVISIONER = (
    "abhinava-provisioner@abhinava-origin.iam.gserviceaccount.com"
)


# ============================================================
# GOOGLE AUTHENTICATION
# ============================================================

def _get_connection_session() -> AuthorizedSession:
    """
    Create an authenticated session using the
    Abhinava provisioner service account.

    The caller's ADC credentials are used only to
    impersonate the provisioner. The provisioner is
    the identity that accesses client projects.
    """

    source_credentials, _ = default(
        scopes=[
            "https://www.googleapis.com/auth/cloud-platform"
        ]
    )

    target_credentials = impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal=ABHINAVA_PROVISIONER,
        target_scopes=[
            "https://www.googleapis.com/auth/cloud-platform"
        ],
        lifetime=3600,
    )

    return AuthorizedSession(
        target_credentials
    )


# ============================================================
# GOOGLE CLOUD PROJECT
# ============================================================

def _check_project(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Verify that the Google Cloud project exists
    and is accessible to the Abhinava service account.
    """

    url = (
        "https://cloudresourcemanager.googleapis.com/v3/"
        f"projects/{project_id}"
    )

    response = session.get(url)

    if response.status_code != 200:
        raise RuntimeError(
            "Unable to access Firebase project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    project = response.json()

    return {
        "status": "READY",
        "project_id": project.get(
            "projectId",
            project_id,
        ),
        "resource_name": project.get(
            "name",
        ),
        "display_name": project.get(
            "displayName"
        ),
        "lifecycle_state": project.get(
            "state"
        ),
    }


# ============================================================
# FIREBASE
# ============================================================

def _check_firebase(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Verify Firebase is enabled for the project.
    """

    url = (
        f"{FIREBASE_URL}/projects/"
        f"{project_id}"
    )

    response = session.get(url)

    if response.status_code != 200:
        raise RuntimeError(
            "Firebase is not accessible for project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return {
        "status": "READY",
    }


# ============================================================
# FIREBASE WEB APP
# ============================================================

def _check_web_app(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Discover an existing Firebase Web App.

    Does not create one.
    """

    apps = _get_firebase_web_apps(
        session=session,
        project_id=project_id,
    )

    if not apps:
        raise RuntimeError(
            "No Firebase Web App exists for project "
            f"{project_id}."
        )

    active_apps = [
        app
        for app in apps
        if app.get("state") == "ACTIVE"
    ]

    app = (
        active_apps[0]
        if active_apps
        else apps[0]
    )

    return {
        "status": "READY",
        "app_id": app.get("appId"),
        "name": app.get("name"),
        "display_name": app.get(
            "displayName"
        ),
        "state": app.get("state"),
    }


# ============================================================
# FIRESTORE
# ============================================================

def _check_firestore(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Verify the default Firestore database exists.

    Does not create or modify it.
    """

    url = (
        f"{FIRESTORE_URL}/projects/"
        f"{project_id}/databases/(default)"
    )

    response = session.get(url)

    if response.status_code != 200:
        raise RuntimeError(
            "Firestore is not available for project "
            f"{project_id}: "
            f"{response.status_code} "
            f"{response.text}"
        )

    database = response.json()

    return {
        "status": "READY",
        "type": database.get(
            "type"
        ),
        "location": database.get(
            "locationId"
        ),
        "edition": database.get(
            "databaseEdition"
        ),
    }


# ============================================================
# API STATUS
# ============================================================

def _check_api(
    session: AuthorizedSession,
    project_id: str,
    service_name: str,
) -> bool:
    """
    Check whether a Google API is enabled.
    """

    url = (
        f"{SERVICE_USAGE_URL}/projects/"
        f"{project_id}/services/"
        f"{service_name}"
    )

    response = session.get(url)

    if response.status_code != 200:
        return False

    data = response.json()

    return data.get(
        "state"
    ) == "ENABLED"


# ============================================================
# FIREBASE AUTHENTICATION
# ============================================================

def _check_authentication(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Verify Firebase Authentication infrastructure.
    """

    enabled = _check_api(
        session=session,
        project_id=project_id,
        service_name="identitytoolkit.googleapis.com",
    )

    return {
        "status": (
            "ENABLED"
            if enabled
            else "NOT_ENABLED"
        ),
    }


# ============================================================
# BILLING
# ============================================================

def _check_billing(
    session: AuthorizedSession,
    project_id: str,
) -> dict:
    """
    Check billing through the Cloud Billing API.

    This function intentionally does not modify billing.
    """

    url = (
        "https://cloudbilling.googleapis.com/v1/"
        f"projects/{project_id}/billingInfo"
    )

    response = session.get(url)

    if response.status_code != 200:
        return {
            "status": "UNKNOWN",
            "error": response.text,
        }

    data = response.json()

    return {
        "status": (
            "ENABLED"
            if data.get("billingEnabled")
            else "NOT_ENABLED"
        ),
        "billing_account_name": data.get(
            "billingAccountName"
        ),
    }


# ============================================================
# MAIN VERIFICATION
# ============================================================

def verify_existing_firebase_project(
    project_id: str,
) -> dict:
    """
    Read-only verification of an existing
    client-owned Firebase project.

    No resource is created, deleted,
    modified, or billed by this function.
    """

    session = _get_connection_session()

    project = _check_project(
        session=session,
        project_id=project_id,
    )

    firebase = _check_firebase(
        session=session,
        project_id=project_id,
    )

    web_app = _check_web_app(
        session=session,
        project_id=project_id,
    )

    firestore = _check_firestore(
        session=session,
        project_id=project_id,
    )

    authentication = _check_authentication(
        session=session,
        project_id=project_id,
    )

    billing = _check_billing(
        session=session,
        project_id=project_id,
    )

    return {
        "project": project,
        "firebase": firebase,
        "web_app": web_app,
        "firestore": firestore,
        "authentication": authentication,
        "billing": billing,
    }