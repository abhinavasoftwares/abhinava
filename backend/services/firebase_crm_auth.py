import threading
from functools import lru_cache

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials as firebase_credentials

from google.auth import default
from google.auth import impersonated_credentials
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from services.tenant_connection import ABHINAVA_PROVISIONER


# ============================================================
# CONSTANTS
# ============================================================

ACTIVE_STATUS = "ACTIVE"

ALLOWED_LOGIN_METHODS = {
    "google",
    "otp",
}

ALLOWED_ROLES = {
    "ADMIN_OWNER",
    "MANAGER_STOCK_COORDINATOR",
    "SALES_EXECUTIVE",
    "INVESTOR",
}

ALLOWED_MODULES = {
    "sales",
    "investments",
    "customers",
    "inventory",
    "kareegar",
    "reports",
}


# ============================================================
# CACHES
# ============================================================

_APP_LOCK = threading.Lock()
_FIRESTORE_LOCK = threading.Lock()

_FIREBASE_APPS = {}
_FIRESTORE_CLIENTS = {}


# ============================================================
# GOOGLE / TENANT CREDENTIALS
# ============================================================

@lru_cache(maxsize=1)
def _get_tenant_credentials():
    """
    Cached credentials used by Abhinava's trusted backend
    to access tenant Firebase projects.

    These credentials are privileged backend credentials.
    They are used for both trusted authorization reads and
    first-login provisioning of CRM authorization documents.

    Browser Firebase Security Rules are NOT bypassed by the
    browser. Only this trusted backend uses these credentials.
    """

    source_credentials, _ = default(
        scopes=[
            "https://www.googleapis.com/auth/cloud-platform",
        ]
    )

    return impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal=ABHINAVA_PROVISIONER,
        target_scopes=[
            "https://www.googleapis.com/auth/cloud-platform",
        ],
        lifetime=3600,
    )

# ============================================================
# FIREBASE ADMIN APP
# ============================================================

def _get_firebase_admin_app(project_id: str):
    """
    Get or create a cached Firebase Admin app for a tenant.
    """

    if not project_id:
        raise RuntimeError(
            "Tenant Firebase project ID is required."
        )

    existing = _FIREBASE_APPS.get(project_id)

    if existing:
        return existing

    with _APP_LOCK:

        existing = _FIREBASE_APPS.get(project_id)

        if existing:
            return existing

        tenant_credentials = _get_tenant_credentials()

        firebase_credential = (
            firebase_credentials._ExternalCredentials(
                tenant_credentials
            )
        )

        app_name = (
            f"abhinava-crm-{project_id}"
        )

        try:
            app = firebase_admin.get_app(
                app_name
            )

        except ValueError:
            app = firebase_admin.initialize_app(
                firebase_credential,
                {
                    "projectId": project_id,
                },
                name=app_name,
            )

        _FIREBASE_APPS[project_id] = app

        return app


# ============================================================
# FIRESTORE CLIENT
# ============================================================

def _get_tenant_firestore(
    project_id: str,
):
    """
    Return a cached Firestore client for the tenant.

    This is a trusted backend Firestore client.

    It is used for:
        - CRM authorization reads
        - First-login authorization provisioning
        - Employee UID binding

    Browser Firestore Security Rules do not control these
    trusted backend operations.
    """

    if not project_id:
        raise RuntimeError(
            "Tenant Firebase project ID is required."
        )

    existing = _FIRESTORE_CLIENTS.get(
        project_id
    )

    if existing:
        return existing

    with _FIRESTORE_LOCK:

        existing = _FIRESTORE_CLIENTS.get(
            project_id
        )

        if existing:
            return existing

        client = firestore.Client(
            project=project_id,
            credentials=_get_tenant_credentials(),
        )

        _FIRESTORE_CLIENTS[
            project_id
        ] = client

        return client


# ============================================================
# NORMALIZATION
# ============================================================

def _normalize_email(email):
    return (
        str(email or "")
        .strip()
        .lower()
    )


def _normalize_mobile(mobile):
    value = (
        str(mobile or "")
        .strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if value.startswith("+91"):
        return value

    if (
        len(value) == 10
        and value.isdigit()
    ):
        return f"+91{value}"

    return value


# ============================================================
# LOGIN METHOD
# ============================================================

def _get_login_method(decoded_token):
    firebase_data = (
        decoded_token.get("firebase")
        or {}
    )

    provider = (
        firebase_data.get(
            "sign_in_provider"
        )
    )

    if provider == "google.com":
        return "google"

    if provider == "phone":
        return "otp"

    return None


# ============================================================
# EMPLOYEE LOOKUP
# ============================================================

def _find_employee(
    db,
    decoded_token,
    login_method,
):
    """
    Find exactly one ACTIVE employee.

    Google:
        normalized email

    OTP:
        normalized mobile

    Disabled / soft-deleted employees are ignored.
    """

    employees_ref = db.collection(
        "employees"
    )

    if login_method == "google":

        email = _normalize_email(
            decoded_token.get("email")
        )

        if not email:
            return None

        query = (
            employees_ref
            .where(
                filter=FieldFilter(
                    "email",
                    "==",
                    email,
                )
            )
            .limit(10)
        )

    elif login_method == "otp":

        mobile = _normalize_mobile(
            decoded_token.get(
                "phone_number"
            )
        )

        if not mobile:
            return None

        query = (
            employees_ref
            .where(
                filter=FieldFilter(
                    "mobile",
                    "==",
                    mobile,
                )
            )
            .limit(10)
        )

    else:
        return None

    snapshots = list(
        query.stream()
    )

    active_employees = []

    for snapshot in snapshots:

        employee = (
            snapshot.to_dict()
            or {}
        )

        if (
            employee.get("status")
            == ACTIVE_STATUS
        ):
            employee["id"] = (
                snapshot.id
            )

            active_employees.append(
                employee
            )

    if not active_employees:
        return None

    if len(active_employees) > 1:
        raise RuntimeError(
            "Multiple active employee records "
            "match the same login identity."
        )

    return active_employees[0]


# ============================================================
# PERMISSIONS
# ============================================================

def _sanitize_permissions(
    permissions,
    role,
):
    source_permissions = (
        permissions
        if isinstance(
            permissions,
            dict,
        )
        else {}
    )

    result = {}

    for module_name in ALLOWED_MODULES:

        source = (
            source_permissions.get(
                module_name
            )
            or {}
        )

        read = (
            source.get("read")
            is True
        )

        write = (
            source.get("write")
            is True
        )

        delete = (
            source.get("delete")
            is True
        )

        if delete:
            read = True
            write = True

        if write:
            read = True

        result[module_name] = {
            "read": read,
            "write": write,
            "delete": delete,
        }

    if role == "ADMIN_OWNER":

        for module_name in ALLOWED_MODULES:

            result[module_name] = {
                "read": True,
                "write": True,
                "delete": True,
            }

    elif role == "INVESTOR":

        for module_name in ALLOWED_MODULES:

            if module_name == "investments":

                result[module_name] = {
                    "read": True,
                    "write": True,
                    "delete": False,
                }

            else:

                result[module_name] = {
                    "read": False,
                    "write": False,
                    "delete": False,
                }

    return result


# ============================================================
# BUILD CLIENT-SAFE AUTHORIZATION DOCUMENT
# ============================================================

def _build_authorization_document(
    employee,
    uid,
    tenant_id,
    crm_slug,
    login_method,
):
    """
    Build the exact authorization document that the
    authenticated browser is allowed to create.

    IMPORTANT:
    This function contains NO Firestore writes.
    """

    role = str(
        employee.get("role")
        or ""
    ).strip()

    if role not in ALLOWED_ROLES:
        raise PermissionError(
            "Employee has an invalid CRM role."
        )

    status = employee.get(
        "status"
    )

    if status != ACTIVE_STATUS:
        raise PermissionError(
            "Employee CRM access is disabled."
        )

    login_methods = (
        employee.get(
            "loginMethods"
        )
        or {}
    )

    if login_method == "google":

        if (
            login_methods.get(
                "google"
            )
            is not True
        ):
            raise PermissionError(
                "Google login is not enabled "
                "for this employee."
            )

    elif login_method == "otp":

        if (
            login_methods.get(
                "otp"
            )
            is not True
        ):
            raise PermissionError(
                "OTP login is not enabled "
                "for this employee."
            )

    permissions = _sanitize_permissions(
        employee.get(
            "permissions"
        ),
        role,
    )

    email = _normalize_email(
        employee.get("email")
    )

    mobile = _normalize_mobile(
        employee.get("mobile")
    )

    return {
        "employeeId": employee["id"],
        "uid": uid,

        "name": (
            employee.get("name")
            or ""
        ),

        "email": email,

        "mobile": mobile,

        "role": role,

        "roleLabel": (
            employee.get(
                "roleLabel"
            )
            or role
        ),

        "status": ACTIVE_STATUS,

        "loginMethods": {
            "google": (
                login_methods.get(
                    "google"
                )
                is True
            ),
            "otp": (
                login_methods.get(
                    "otp"
                )
                is True
            ),
        },

        "permissions": permissions,

        "enforce24HourLogout": (
            employee.get(
                "enforce24HourLogout"
            )
            is True
        ),

        "tenantId": tenant_id,

        "crmSlug": crm_slug,

        "loginMethod": login_method,
    }


# ============================================================
# EXISTING USER VALIDATION
# ============================================================

def _validate_existing_user(
    *,
    user: dict,
    uid: str,
    tenant_id: str,
    crm_slug: str,
    login_method: str,
    decoded_token: dict,
):
    """
    Validate an existing CRM authorization document.

    Two supported authorization models:

    1. ADMIN_OWNER
       - Owner is not an employee.
       - employeeId is not required.
       - users/{uid} document ID is the Firebase identity.
       - uid field inside the document is optional for legacy Owner records.

    2. Employee
       - employeeId is required.
       - uid must be bound to the employee.
    """

    role = user.get("role")

    if role not in ALLOWED_ROLES:
        raise PermissionError("Invalid CRM role.")

    if user.get("status") != ACTIVE_STATUS:
        raise PermissionError("CRM user is not active.")

    # ---------------------------------------------------------
    # OWNER
    # ---------------------------------------------------------

    if role == "ADMIN_OWNER":
        # The Firestore document itself is users/{uid}.
        #
        # Therefore the document ID already proves that this
        # authorization record belongs to the authenticated
        # Firebase identity.
        #
        # Legacy Owner documents may not contain a uid field.
        stored_uid = user.get("uid")

        if stored_uid and stored_uid != uid:
            raise PermissionError("Firebase identity mismatch.")

    # ---------------------------------------------------------
    # EMPLOYEE
    # ---------------------------------------------------------

    else:
        # Employee authorization must always have an explicit
        # Firebase UID binding.
        stored_uid = user.get("uid")

        if not stored_uid:
            raise PermissionError(
                "Employee authorization is not linked to a Firebase identity."
            )

        if stored_uid != uid:
            raise PermissionError("Firebase identity mismatch.")

        if not user.get("employeeId"):
            raise PermissionError(
                "Employee authorization record is missing employeeId."
            )

    # ---------------------------------------------------------
    # TENANT
    # ---------------------------------------------------------

    stored_tenant_id = user.get("tenantId")

    if stored_tenant_id and stored_tenant_id != tenant_id:
        raise PermissionError("CRM tenant mismatch.")

    stored_crm_slug = user.get("crmSlug")

    if stored_crm_slug and stored_crm_slug != crm_slug:
        raise PermissionError("CRM tenant mismatch.")

    # ---------------------------------------------------------
    # LOGIN METHOD
    # ---------------------------------------------------------

    login_methods = user.get("loginMethods") or user.get("auth") or {}

    if login_method not in ALLOWED_LOGIN_METHODS:
        raise PermissionError("Unsupported CRM login method.")

    if not login_methods.get(login_method):
        raise PermissionError(
            f"{login_method} login is not enabled for this account."
        )

    # ---------------------------------------------------------
    # EMAIL / PHONE IDENTITY
    # ---------------------------------------------------------

    if login_method == "google":
        token_email = _normalize_email(decoded_token.get("email"))
        stored_email = _normalize_email(user.get("email"))

        if not token_email:
            raise PermissionError(
                "Google account email could not be verified."
            )

        if stored_email and stored_email != token_email:
            raise PermissionError(
                "Google account does not match the CRM authorization."
            )

    elif login_method == "otp":
        token_phone = _normalize_mobile(decoded_token.get("phone_number"))
        stored_mobile = _normalize_mobile(user.get("mobile"))

        if not token_phone:
            raise PermissionError(
                "Phone number could not be verified."
            )

        if stored_mobile and stored_mobile != token_phone:
            raise PermissionError(
                "Phone number does not match the CRM authorization."
            )

# ============================================================
# FIRST-LOGIN BACKEND PROVISIONING
# ============================================================

# ============================================================
# FIRST-LOGIN BACKEND PROVISIONING
# ============================================================

# ============================================================
# EMPLOYEE FIRST LOGIN — READ ONLY
# ============================================================

def _authorize_employee_first_login(
    *,
    employee,
    decoded_token,
    uid,
    tenant_id,
    crm_slug,
    login_method,
):
    """
    Authorize an employee's first CRM login.

    IMPORTANT:
    This function performs NO Firestore writes.

    BYOD MODEL:
        - Client owns the Firebase project.
        - Client owns the employees collection.
        - Client creates and manages employees.
        - Abhinava only verifies the authenticated identity
          against the employee record.
        - Firebase UID is NOT written into employees.
        - users/{uid} is NOT created for employees.

    The Firebase UID comes directly from the verified
    Firebase ID token and is returned as part of the
    authorization response.
    """

    if not employee:
        raise PermissionError(
            "Your account has not been authorized for this CRM."
        )

    # --------------------------------------------------------
    # EMPLOYEE STATUS
    # --------------------------------------------------------

    if employee.get("status") != ACTIVE_STATUS:
        raise PermissionError(
            "Your CRM access is currently disabled."
        )

    # --------------------------------------------------------
    # BUILD AUTHORIZATION
    # --------------------------------------------------------

    authorization = _build_authorization_document(
        employee=employee,
        uid=uid,
        tenant_id=tenant_id,
        crm_slug=crm_slug,
        login_method=login_method,
    )

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "authorized": True,
        "firstLogin": True,
        "uid": uid,
        "employeeId": employee.get("id"),
        "role": employee.get("role"),
        "loginMethod": login_method,
        "authorization": authorization,
    }



# ============================================================
# MAIN AUTHORIZATION
# ============================================================

def authorize_crm_firebase_user(
    *,
    id_token: str,
    project_id: str,
    tenant_id: str,
    crm_slug: str,
):
    """
    Trusted CRM authentication boundary.

    EXISTING LOGIN:

        Firebase token
            ↓
        Backend verifies token
            ↓
        users/{uid} validation
            ↓
        Authorization returned

    FIRST LOGIN:

        Firebase token
            ↓
        Backend verifies token
            ↓
        ACTIVE employee lookup
            ↓
        Backend Firestore transaction
            ├── users/{uid} created
            └── employees/{employeeId}.uid bound
            ↓
        Authorization returned

    The browser never provisions authorization documents.
    """

    if not id_token:
        raise ValueError(
            "Firebase ID token is required."
        )

    if not project_id:
        raise ValueError(
            "Firebase project ID is required."
        )

    # --------------------------------------------------------
    # VERIFY FIREBASE TOKEN
    # --------------------------------------------------------

    app = _get_firebase_admin_app(
        project_id
    )

    try:

        decoded_token = (
            firebase_auth.verify_id_token(
                id_token,
                app=app,
                check_revoked=True,
            )
        )

    except Exception as exc:

        raise PermissionError(
            "Invalid or expired Firebase authentication."
        ) from exc

    uid = decoded_token.get(
        "uid"
    )

    if not uid:
        raise PermissionError(
            "Firebase authentication did not return "
            "a valid user identity."
        )

    # --------------------------------------------------------
    # LOGIN METHOD
    # --------------------------------------------------------

    login_method = _get_login_method(
        decoded_token
    )

    if (
        login_method
        not in ALLOWED_LOGIN_METHODS
    ):
        raise PermissionError(
            "This authentication method is not "
            "supported for CRM access."
        )

    # --------------------------------------------------------
    # PROVIDER IDENTITY VALIDATION
    # --------------------------------------------------------

    if login_method == "google":

        email = _normalize_email(
            decoded_token.get("email")
        )

        if not email:
            raise PermissionError(
                "The authenticated Google account "
                "does not have a usable email."
            )

        if (
            decoded_token.get(
                "email_verified"
            )
            is not True
        ):
            raise PermissionError(
                "The Google email address "
                "could not be verified."
            )

    elif login_method == "otp":

        phone = _normalize_mobile(
            decoded_token.get(
                "phone_number"
            )
        )

        if not phone:
            raise PermissionError(
                "The authenticated phone number "
                "could not be verified."
            )

    # --------------------------------------------------------
    # TENANT FIRESTORE
    # --------------------------------------------------------

    db = _get_tenant_firestore(
        project_id
    )

    # --------------------------------------------------------
    # USERS/{UID}
    # --------------------------------------------------------

    user_ref = (
        db
        .collection("users")
        .document(uid)
    )

    try:

        snapshot = user_ref.get()

    except Exception as exc:

        raise RuntimeError(
            "Unable to read CRM authorization."
        ) from exc

    # ========================================================
    # EXISTING USER
    # ========================================================

    if snapshot.exists:

        user = (
            snapshot.to_dict()
            or {}
        )
        print(
        "=== CRM EXISTING USER DEBUG ==="
        )
        print(
            "Firebase token UID:",
            uid,
        )
        print(
            "users document ID:",
            snapshot.id,
        )
        print(
            "users document uid:",
            user.get("uid"),
        )
        print(
            "users document employeeId:",
            user.get("employeeId"),
        )
        print(
            "users document email:",
            user.get("email"),
        )
        print(
            "users document role:",
            user.get("role"),
        )
        print(
            "users document tenantId:",
            user.get("tenantId"),
        )
        print(
            "users document crmSlug:",
            user.get("crmSlug"),
        )

        _validate_existing_user(
            user=user,
            decoded_token=decoded_token,
            uid=uid,
            tenant_id=tenant_id,
            crm_slug=crm_slug,
            login_method=login_method,
        )

        return {
            "authorized": True,
            "firstLogin": False,
            "uid": uid,
            "employeeId": (
                user.get("employeeId")
            ),
            "role": user.get("role"),
            "loginMethod": login_method,

            "authorization": {
                key: value
                for key, value in user.items()
                if key not in {
                    "createdAt",
                    "updatedAt",
                }
            },
        }

    # ========================================================
    # FIRST LOGIN — FIND ACTIVE EMPLOYEE
    # ========================================================

    employee = _find_employee(
        db=db,
        decoded_token=decoded_token,
        login_method=login_method,
    )

    if not employee:

        raise PermissionError(
            "Your account has not been authorized "
            "for this CRM."
        )

    # --------------------------------------------------------
    # EMPLOYEE FIRST LOGIN
    # --------------------------------------------------------
    #
    # BYOD:
    # The client owns the employees collection.
    #
    # We DO NOT:
    #   - create users/{uid}
    #   - update employees/{employeeId}
    #   - bind uid into the employee document
    #   - run a Firestore transaction
    #
    # We only verify the employee and return authorization.
    # --------------------------------------------------------

    return _authorize_employee_first_login(
        employee=employee,
        decoded_token=decoded_token,
        uid=uid,
        tenant_id=tenant_id,
        crm_slug=crm_slug,
        login_method=login_method,
    )
