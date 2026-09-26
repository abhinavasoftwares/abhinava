import os
from html import escape

import resend


# ============================================================
# CONFIGURATION
# ============================================================

RESEND_API_KEY = os.getenv("RESEND_API_KEY")

# Keep the SAME sender address/domain that your existing
# client welcome email already uses.
RESEND_FROM = os.getenv(
    "RESEND_FROM_EMAIL",
    "Abhinava Softwares <noreply@abhinava.site>",
)

CRM_BASE_URL = os.getenv(
    "CRM_BASE_URL",
    "https://abhinava.site/crm",
)


# ============================================================
# HELPERS
# ============================================================

MODULE_LABELS = {
    "sales": "Sales",
    "investments": "Investments",
    "customers": "Customers",
    "inventory": "Inventory",
    "kareegar": "Kareegar Management",
    "reports": "Reports",
    "purchases": "Purchases",
    "estimations": "Estimations",
    "ledger": "General Ledger",
}


def enabled_login_methods(auth):
    auth = auth or {}

    methods = []

    if auth.get("google") is True:
        methods.append("Google Login")

    if auth.get("phone") is True:
        methods.append("Phone / OTP Login")

    return methods


def permission_rows(permissions):
    permissions = permissions or {}

    rows = []

    for module_key, module_label in MODULE_LABELS.items():
        permission = permissions.get(module_key) or {}

        read = permission.get("read") is True
        write = permission.get("write") is True
        delete = permission.get("delete") is True

        # Don't clutter the email with completely disabled modules.
        if not (read or write or delete):
            continue

        rows.append(
            f"""
            <tr>
              <td style="
                padding:10px 12px;
                border-bottom:1px solid #e5e7eb;
                font-size:13px;
                color:#111827;
              ">
                {escape(module_label)}
              </td>

              <td style="
                padding:10px 12px;
                border-bottom:1px solid #e5e7eb;
                text-align:center;
                font-size:13px;
              ">
                {"✓" if read else "—"}
              </td>

              <td style="
                padding:10px 12px;
                border-bottom:1px solid #e5e7eb;
                text-align:center;
                font-size:13px;
              ">
                {"✓" if write else "—"}
              </td>

              <td style="
                padding:10px 12px;
                border-bottom:1px solid #e5e7eb;
                text-align:center;
                font-size:13px;
              ">
                {"✓" if delete else "—"}
              </td>
            </tr>
            """
        )

    if not rows:
        return """
        <tr>
          <td colspan="4"
              style="
                padding:14px;
                text-align:center;
                color:#6b7280;
                font-size:13px;
              ">
            No module access assigned.
          </td>
        </tr>
        """

    return "".join(rows)


# ============================================================
# EMAIL
# ============================================================

def send_employee_welcome_email(
    *,
    employee: dict,
    business_name: str,
    crm_slug: str,
):
    """
    Send the employee CRM welcome email.

    This function must only be called AFTER the employee has
    been successfully created.
    """

    if not RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY is not configured."
        )

    email = str(employee.get("email") or "").strip()

    if not email:
        raise ValueError(
            "Employee email is required."
        )

    resend.api_key = RESEND_API_KEY

    name = (
        str(employee.get("name") or "Employee")
        .strip()
    )

    mobile = (
        str(employee.get("mobile") or "Not provided")
        .strip()
    )

    role_label = (
        str(
            employee.get("roleLabel")
            or employee.get("role")
            or "Employee"
        )
        .strip()
    )

    auth = employee.get("auth") or {}

    login_methods = enabled_login_methods(auth)

    login_method_html = "".join(
        f"""
        <div style="
          display:inline-block;
          margin:4px 6px 4px 0;
          padding:7px 11px;
          border-radius:999px;
          background:#f0fdf4;
          border:1px solid #bbf7d0;
          color:#166534;
          font-size:12px;
          font-weight:600;
        ">
          ✓ {escape(method)}
        </div>
        """
        for method in login_methods
    )

    if not login_method_html:
        login_method_html = """
        <div style="
          color:#b91c1c;
          font-size:13px;
        ">
          No login method enabled.
        </div>
        """

    permissions_html = permission_rows(
        employee.get("permissions")
    )

    enforce_24_hour_logout = (
        employee.get("enforce24HourLogout") is True
    )

    if enforce_24_hour_logout:
        session_html = """
        <div style="
          padding:14px 16px;
          border-radius:10px;
          background:#fffbeb;
          border:1px solid #fde68a;
        ">
          <div style="
            font-size:13px;
            font-weight:700;
            color:#92400e;
          ">
            24-hour logout: Enabled
          </div>

          <div style="
            margin-top:5px;
            font-size:12px;
            line-height:1.6;
            color:#78350f;
          ">
            You will be required to log in again after every
            24-hour session period.
          </div>
        </div>
        """
    else:
        session_html = """
        <div style="
          padding:14px 16px;
          border-radius:10px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
        ">
          <div style="
            font-size:13px;
            font-weight:700;
            color:#334155;
          ">
            24-hour logout: Not enforced
          </div>

          <div style="
            margin-top:5px;
            font-size:12px;
            line-height:1.6;
            color:#64748b;
          ">
            The 24-hour forced re-login policy is not enabled
            for your account.
          </div>
        </div>
        """

    login_url = (
        f"{CRM_BASE_URL.rstrip('/')}/{crm_slug}"
    )

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0" />
  <title>
    Welcome to {escape(business_name)} CRM
  </title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f8fafc;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
  color:#0f172a;
">

  <div style="
    max-width:680px;
    margin:0 auto;
    padding:36px 18px;
  ">

    <!-- BRAND -->

    <div style="
      text-align:center;
      margin-bottom:24px;
    ">
      <div style="
        font-size:12px;
        font-weight:700;
        letter-spacing:2px;
        color:#64748b;
      ">
        ABHINAVA SOFTWARES
      </div>

      <div style="
        margin-top:6px;
        font-size:11px;
        color:#94a3b8;
      ">
        Technology with Purpose
      </div>
    </div>


    <!-- MAIN CARD -->

    <div style="
      background:#ffffff;
      border:1px solid #e2e8f0;
      border-radius:18px;
      overflow:hidden;
    ">

      <!-- HEADER -->

      <div style="
        padding:32px 28px;
        background:#0f172a;
        color:#ffffff;
      ">

        <div style="
          font-size:12px;
          font-weight:600;
          letter-spacing:1.2px;
          text-transform:uppercase;
          color:#94a3b8;
        ">
          CRM Account Created
        </div>

        <div style="
          margin-top:10px;
          font-size:28px;
          line-height:1.2;
          font-weight:800;
        ">
          Welcome, {escape(name)}
        </div>

        <div style="
          margin-top:10px;
          font-size:14px;
          line-height:1.6;
          color:#cbd5e1;
        ">
          Your Abhinava CRM account has been created.
        </div>

      </div>


      <!-- CLIENT HIGHLIGHT -->

      <div style="
        padding:28px;
        border-bottom:1px solid #e2e8f0;
        text-align:center;
      ">

        <div style="
          font-size:11px;
          font-weight:700;
          letter-spacing:1.5px;
          text-transform:uppercase;
          color:#94a3b8;
        ">
          Your organization
        </div>

        <div style="
          margin-top:8px;
          font-size:26px;
          line-height:1.25;
          font-weight:800;
          color:#0f172a;
        ">
          {escape(business_name)}
        </div>

        <div style="
          margin-top:8px;
          font-size:13px;
          color:#64748b;
        ">
          Your CRM access is associated with this organization.
        </div>

      </div>


      <!-- CONTENT -->

      <div style="padding:28px;">

        <!-- EMPLOYEE DETAILS -->

        <h2 style="
          margin:0 0 14px;
          font-size:16px;
          color:#0f172a;
        ">
          Account Details
        </h2>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            border-collapse:collapse;
            margin-bottom:28px;
          "
        >

          <tr>
            <td style="
              padding:9px 0;
              color:#64748b;
              font-size:13px;
              width:38%;
            ">
              Name
            </td>

            <td style="
              padding:9px 0;
              font-size:13px;
              font-weight:600;
            ">
              {escape(name)}
            </td>
          </tr>

          <tr>
            <td style="
              padding:9px 0;
              color:#64748b;
              font-size:13px;
            ">
              Email
            </td>

            <td style="
              padding:9px 0;
              font-size:13px;
              font-weight:600;
            ">
              {escape(email)}
            </td>
          </tr>

          <tr>
            <td style="
              padding:9px 0;
              color:#64748b;
              font-size:13px;
            ">
              Mobile
            </td>

            <td style="
              padding:9px 0;
              font-size:13px;
              font-weight:600;
            ">
              {escape(mobile)}
            </td>
          </tr>

          <tr>
            <td style="
              padding:9px 0;
              color:#64748b;
              font-size:13px;
            ">
              Role
            </td>

            <td style="
              padding:9px 0;
              font-size:13px;
              font-weight:600;
            ">
              {escape(role_label)}
            </td>
          </tr>

        </table>


        <!-- LOGIN METHODS -->

        <h2 style="
          margin:0 0 12px;
          font-size:16px;
          color:#0f172a;
        ">
          Login Methods
        </h2>

        <div style="
          margin-bottom:28px;
        ">
          {login_method_html}
        </div>


        <!-- PERMISSIONS -->

        <h2 style="
          margin:0 0 12px;
          font-size:16px;
          color:#0f172a;
        ">
          Your CRM Access
        </h2>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            border-collapse:collapse;
            margin-bottom:28px;
            border:1px solid #e5e7eb;
            border-radius:10px;
            overflow:hidden;
          "
        >

          <thead>
            <tr style="background:#f8fafc;">

              <th style="
                padding:10px 12px;
                text-align:left;
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:.5px;
                color:#64748b;
              ">
                Module
              </th>

              <th style="
                padding:10px 12px;
                text-align:center;
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:.5px;
                color:#64748b;
              ">
                Read
              </th>

              <th style="
                padding:10px 12px;
                text-align:center;
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:.5px;
                color:#64748b;
              ">
                Write
              </th>

              <th style="
                padding:10px 12px;
                text-align:center;
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:.5px;
                color:#64748b;
              ">
                Delete
              </th>

            </tr>
          </thead>

          <tbody>
            {permissions_html}
          </tbody>

        </table>


        <!-- SESSION -->

        <h2 style="
          margin:0 0 12px;
          font-size:16px;
          color:#0f172a;
        ">
          Session Security
        </h2>

        <div style="margin-bottom:30px;">
          {session_html}
        </div>


        <!-- LOGIN BUTTON -->

        <div style="
          text-align:center;
          margin:30px 0 10px;
        ">

          <a
            href="{escape(login_url)}"
            style="
              display:inline-block;
              padding:13px 24px;
              background:#0f172a;
              color:#ffffff;
              text-decoration:none;
              border-radius:9px;
              font-size:13px;
              font-weight:700;
            "
          >
            Login to {escape(business_name)} CRM
          </a>

        </div>

        <div style="
          text-align:center;
          font-size:11px;
          color:#94a3b8;
          line-height:1.6;
        ">
          If the button does not work, contact your administrator
          for the CRM login link.
        </div>

      </div>

    </div>


    <!-- FOOTER -->

    <div style="
      padding:24px 10px;
      text-align:center;
      font-size:11px;
      line-height:1.7;
      color:#94a3b8;
    ">

      This account was created through Abhinava CRM.

      <br />

      <strong style="color:#64748b;">
        Abhinava Softwares
      </strong>

      <br />

      Technology with Purpose

    </div>

  </div>

</body>
</html>
"""

    subject = (
        f"Welcome to {business_name} CRM — "
        f"Your Account Has Been Created"
    )

    response = resend.Emails.send(
        {
            "from": RESEND_FROM,
            "to": [email],
            "subject": subject,
            "html": html,
        }
    )

    if isinstance(response, dict) and response.get("error"):
        raise RuntimeError(
            str(response["error"])
        )

    return response