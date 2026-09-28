import base64
import os
from typing import Any, Optional

import resend


# ============================================================
# CONFIGURATION
# ============================================================

DEFAULT_FROM_EMAIL = "welcome@abhinava.site"
DEFAULT_FROM_NAME = "Abhinava"


def _get_resend_config():
    api_key = os.getenv("RESEND_API_KEY")

    from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        DEFAULT_FROM_EMAIL,
    )

    from_name = os.getenv(
        "RESEND_FROM_NAME",
        DEFAULT_FROM_NAME,
    )

    return api_key, from_email, from_name


# ============================================================
# HELPERS
# ============================================================

def _escape(value: Any) -> str:
    """
    Minimal HTML escaping for customer-provided values.
    """
    if value is None:
        return ""

    value = str(value)

    return (
        value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
    )


def _money(value: Any) -> str:
    if value is None or value == "":
        return "₹0"

    try:
        number = float(value)

        if number.is_integer():
            return f"₹{number:,.0f}"

        return f"₹{number:,.2f}"

    except (TypeError, ValueError):
        return f"₹{_escape(value)}"


def _language(value: Optional[str]) -> str:
    value = (value or "EN").upper().strip()

    if value in {"KN", "KANNADA"}:
        return "KN"

    return "EN"


def _get_localized_content(language: str):
    if language == "KN":
        return {
            "subject": "ನಿಮ್ಮ ಹೂಡಿಕೆ ಖಾತೆ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ",
            "preheader": "ನಿಮ್ಮ ಹೂಡಿಕೆ ಖಾತೆ ಮತ್ತು ದಾಖಲೆಗಳು ಸಿದ್ಧವಾಗಿವೆ.",
            "welcome": "ಹೂಡಿಕೆ ಖಾತೆಗೆ ಸ್ವಾಗತ",
            "hello": "ನಮಸ್ಕಾರ",
            "created": (
                "ನಿಮ್ಮ ಹೂಡಿಕೆ ಖಾತೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ."
            ),
            "account_details": "ಖಾತೆಯ ವಿವರಗಳು",
            "account_number": "ಖಾತೆ ಸಂಖ್ಯೆ",
            "scheme": "ಯೋಜನೆ",
            "start_date": "ಪ್ರಾರಂಭ ದಿನಾಂಕ",
            "contribution": "ಕೊಡುಗೆ",
            "status": "ಸ್ಥಿತಿ",
            "active": "ಸಕ್ರಿಯ",
            "documents": "ನಿಮ್ಮ ಹೂಡಿಕೆ ದಾಖಲೆಗಳು",
            "investment_card": "ಹೂಡಿಕೆ ಕಾರ್ಡ್",
            "initial_statement": "ಆರಂಭಿಕ ಸ್ಟೇಟ್‌ಮೆಂಟ್",
            "receipt": "ಪಾವತಿ ರಸೀದಿ",
            "view_account": "ನನ್ನ ಹೂಡಿಕೆ ಖಾತೆಯನ್ನು ವೀಕ್ಷಿಸಿ",
            "first_contribution": "ಮೊದಲ ಕೊಡುಗೆ",
            "first_contribution_text": (
                "ನಿಮ್ಮ ಮೊದಲ ಕೊಡುಗೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ."
            ),
            "receipt_number": "ರಸೀದಿ ಸಂಖ್ಯೆ",
            "documents_note": (
                "ನಿಮ್ಮ ಹೂಡಿಕೆ ದಾಖಲೆಗಳನ್ನು ಈ ಇಮೇಲ್‌ನಲ್ಲಿ "
                "ಲಗತ್ತಿಸಲಾಗಿದೆ."
            ),
            "footer": (
                "ಈ ಇಮೇಲ್ ನಿಮ್ಮ ಹೂಡಿಕೆ ಖಾತೆಗೆ ಸಂಬಂಧಿಸಿದ "
                "ಸ್ವಯಂಚಾಲಿತ ಸಂವಹನವಾಗಿದೆ."
            ),
        }

    return {
        "subject": "Your Investment Account Has Been Created",
        "preheader": (
            "Your investment account and documents are ready."
        ),
        "welcome": "Welcome to Your Investment Account",
        "hello": "Hello",
        "created": (
            "Your investment account has been successfully created."
        ),
        "account_details": "Account Details",
        "account_number": "Account Number",
        "scheme": "Investment Scheme",
        "start_date": "Start Date",
        "contribution": "Contribution",
        "status": "Status",
        "active": "ACTIVE",
        "documents": "Your Investment Documents",
        "investment_card": "Investment Card",
        "initial_statement": "Initial Statement",
        "receipt": "Payment Receipt",
        "view_account": "View My Investment Account",
        "first_contribution": "First Contribution",
        "first_contribution_text": (
            "Your first contribution has been received successfully."
        ),
        "receipt_number": "Receipt Number",
        "documents_note": (
            "Your investment documents are attached to this email."
        ),
        "footer": (
            "This is an automated communication regarding "
            "your investment account."
        ),
    }


# ============================================================
# DOCUMENT ATTACHMENT NORMALIZATION
# ============================================================

def _normalize_attachment(
    attachment: dict,
) -> Optional[dict]:
    """
    Resend accepts attachment content as bytes/base64 depending
    on SDK version.

    We normalize our internal representation here.
    """

    filename = attachment.get("filename")

    if not filename:
        return None

    content = attachment.get("content")

    if content is None:
        return None

    if isinstance(content, str):
        try:
            # Already base64.
            base64.b64decode(content, validate=True)
            encoded = content

        except Exception:
            encoded = base64.b64encode(
                content.encode("utf-8")
            ).decode("ascii")

    elif isinstance(content, bytes):
        encoded = base64.b64encode(content).decode("ascii")

    else:
        return None

    return {
        "filename": filename,
        "content": encoded,
    }


# ============================================================
# HTML EMAIL
# ============================================================

def build_investment_welcome_email(
    *,
    investor_name: str,
    account_number: str,
    scheme_name: str,
    start_date: str,
    contribution_value: Any,
    login_url: str,
    language: str = "EN",
    client_name: str = "",
    client_logo_url: str = "",
    client_phone: str = "",
    client_email: str = "",
    client_website: str = "",
    has_initial_transaction: bool = False,
    transaction_amount: Any = None,
    receipt_number: str = "",
):
    language = _language(language)

    t = _get_localized_content(language)

    investor_name = _escape(investor_name)
    account_number = _escape(account_number)
    scheme_name = _escape(scheme_name)
    start_date = _escape(start_date)
    client_name = _escape(client_name)
    client_phone = _escape(client_phone)
    client_email = _escape(client_email)
    client_website = _escape(client_website)
    login_url = _escape(login_url)

    contribution = _money(contribution_value)

    transaction_section = ""

    if has_initial_transaction:
        transaction_section = f"""
        <div style="
            margin-top:24px;
            padding:20px;
            border:1px solid #e5e7eb;
            border-radius:14px;
            background:#fafafa;
        ">
            <div style="
                font-size:11px;
                font-weight:700;
                letter-spacing:1px;
                text-transform:uppercase;
                color:#6b7280;
            ">
                {t["first_contribution"]}
            </div>

            <div style="
                margin-top:8px;
                font-size:26px;
                line-height:1.2;
                font-weight:800;
                color:#111827;
            ">
                {_money(transaction_amount)}
            </div>

            <div style="
                margin-top:10px;
                color:#4b5563;
                font-size:13px;
                line-height:1.6;
            ">
                {t["first_contribution_text"]}
            </div>

            {
                f'''
                <div style="
                    margin-top:12px;
                    color:#374151;
                    font-size:13px;
                ">
                    <strong>{t["receipt_number"]}:</strong>
                    {_escape(receipt_number)}
                </div>
                '''
                if receipt_number
                else ""
            }
        </div>
        """

    logo_section = ""

    if client_logo_url:
        logo_section = f"""
        <img
            src="{_escape(client_logo_url)}"
            alt="{client_name}"
            style="
                max-width:180px;
                max-height:60px;
                object-fit:contain;
                display:block;
            "
        >
        """
    else:
        logo_section = f"""
        <div style="
            font-size:20px;
            font-weight:800;
            color:#ffffff;
            letter-spacing:-0.4px;
        ">
            {client_name or "Investment Program"}
        </div>
        """

    footer_contact = ""

    if client_phone or client_email or client_website:
        footer_contact = f"""
        <div style="
            margin-top:12px;
            font-size:11px;
            line-height:1.8;
            color:#6b7280;
        ">
            {client_phone}
            {(" · " + client_email) if client_email else ""}
            {(" · " + client_website) if client_website else ""}
        </div>
        """

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>{_escape(t["welcome"])}</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Arial,
        sans-serif;
">

<div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
">
    {_escape(t["preheader"])}
</div>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f3f4f6;"
>
<tr>
<td align="center" style="padding:32px 12px;">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        max-width:680px;
        background:#ffffff;
        border-radius:18px;
        overflow:hidden;
    "
>

<!-- HEADER -->

<tr>
<td style="
    padding:34px 36px;
    background:#111111;
">
    {logo_section}
</td>
</tr>

<!-- MAIN -->

<tr>
<td style="padding:38px 36px 32px;">

<div style="
    font-size:12px;
    font-weight:700;
    letter-spacing:1.5px;
    text-transform:uppercase;
    color:#9ca3af;
">
    {client_name}
</div>

<h1 style="
    margin:10px 0 0;
    font-size:30px;
    line-height:1.2;
    letter-spacing:-0.7px;
    color:#111827;
">
    {t["welcome"]}
</h1>

<p style="
    margin:20px 0 0;
    font-size:15px;
    line-height:1.8;
    color:#374151;
">
    {t["hello"]} <strong>{investor_name}</strong>,
</p>

<p style="
    margin:8px 0 0;
    font-size:15px;
    line-height:1.8;
    color:#4b5563;
">
    {t["created"]}
</p>

<!-- ACCOUNT CARD -->

<div style="
    margin-top:28px;
    padding:26px;
    border-radius:16px;
    background:#111111;
    color:#ffffff;
">

<div style="
    font-size:11px;
    letter-spacing:1.4px;
    text-transform:uppercase;
    color:#9ca3af;
">
    {t["account_details"]}
</div>

<div style="
    margin-top:10px;
    font-size:25px;
    font-weight:800;
    letter-spacing:-0.4px;
">
    {account_number}
</div>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="margin-top:22px;"
>
<tr>
<td width="50%" valign="top" style="padding-bottom:18px;">
    <div style="
        font-size:11px;
        color:#9ca3af;
        text-transform:uppercase;
        letter-spacing:.7px;
    ">
        {t["scheme"]}
    </div>

    <div style="
        margin-top:5px;
        font-size:14px;
        font-weight:700;
        color:#ffffff;
    ">
        {scheme_name}
    </div>
</td>

<td width="50%" valign="top" style="padding-bottom:18px;">
    <div style="
        font-size:11px;
        color:#9ca3af;
        text-transform:uppercase;
        letter-spacing:.7px;
    ">
        {t["start_date"]}
    </div>

    <div style="
        margin-top:5px;
        font-size:14px;
        font-weight:700;
        color:#ffffff;
    ">
        {start_date}
    </div>
</td>
</tr>

<tr>
<td width="50%" valign="top">
    <div style="
        font-size:11px;
        color:#9ca3af;
        text-transform:uppercase;
        letter-spacing:.7px;
    ">
        {t["contribution"]}
    </div>

    <div style="
        margin-top:5px;
        font-size:14px;
        font-weight:700;
        color:#ffffff;
    ">
        {contribution}
    </div>
</td>

<td width="50%" valign="top">
    <div style="
        font-size:11px;
        color:#9ca3af;
        text-transform:uppercase;
        letter-spacing:.7px;
    ">
        {t["status"]}
    </div>

    <div style="
        margin-top:5px;
        font-size:14px;
        font-weight:700;
        color:#ffffff;
    ">
        {t["active"]}
    </div>
</td>
</tr>
</table>

</div>

{transaction_section}

<!-- DOCUMENTS -->

<div style="
    margin-top:32px;
">

<h2 style="
    margin:0;
    font-size:18px;
    color:#111827;
">
    {t["documents"]}
</h2>

<p style="
    margin:8px 0 0;
    font-size:13px;
    line-height:1.6;
    color:#6b7280;
">
    {t["documents_note"]}
</p>

<div style="
    margin-top:16px;
    padding:15px 17px;
    border:1px solid #e5e7eb;
    border-radius:12px;
    font-size:13px;
    color:#374151;
">
    📄 &nbsp; {t["investment_card"]}
</div>

{
    f'''
    <div style="
        margin-top:10px;
        padding:15px 17px;
        border:1px solid #e5e7eb;
        border-radius:12px;
        font-size:13px;
        color:#374151;
    ">
        📊 &nbsp; {t["initial_statement"]}
    </div>

    <div style="
        margin-top:10px;
        padding:15px 17px;
        border:1px solid #e5e7eb;
        border-radius:12px;
        font-size:13px;
        color:#374151;
    ">
        🧾 &nbsp; {t["receipt"]}
    </div>
    '''
    if has_initial_transaction
    else ""
}

</div>

<!-- CTA -->

<div style="
    margin-top:32px;
    text-align:center;
">

<a
    href="{login_url}"
    style="
        display:inline-block;
        padding:14px 25px;
        border-radius:10px;
        background:#111111;
        color:#ffffff;
        text-decoration:none;
        font-size:14px;
        font-weight:700;
    "
>
    {t["view_account"]}
</a>

</div>

</td>
</tr>

<!-- FOOTER -->

<tr>
<td style="
    padding:24px 36px 30px;
    border-top:1px solid #eeeeee;
">

<div style="
    font-size:11px;
    line-height:1.7;
    color:#9ca3af;
">
    {t["footer"]}
</div>

{footer_contact}

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
"""

    return html, t["subject"]


# ============================================================
# RESEND
# ============================================================

def send_investment_welcome_email(
    *,
    recipient_email: str,
    investor_name: str,
    account_number: str,
    scheme_name: str,
    start_date: str,
    contribution_value: Any,
    login_url: str,
    language: str = "EN",
    client_name: str = "",
    client_logo_url: str = "",
    client_phone: str = "",
    client_email: str = "",
    client_website: str = "",
    has_initial_transaction: bool = False,
    transaction_amount: Any = None,
    receipt_number: str = "",
    attachments: Optional[list[dict]] = None,
):
    """
    Sends an investment welcome email through Resend.

    IMPORTANT:
    This function is notification-only.

    Failure to send email must NEVER roll back:
      - investor
      - investment account
      - transaction
      - receipt
    """

    api_key, from_email, from_name = _get_resend_config()

    if not api_key:
        return {
            "status": "NOT_CONFIGURED",
            "provider": "RESEND",
            "message": "RESEND_API_KEY is not configured.",
        }

    if not recipient_email:
        return {
            "status": "FAILED",
            "provider": "RESEND",
            "message": "Investor email address is missing.",
        }

    html, subject = build_investment_welcome_email(
        investor_name=investor_name,
        account_number=account_number,
        scheme_name=scheme_name,
        start_date=start_date,
        contribution_value=contribution_value,
        login_url=login_url,
        language=language,
        client_name=client_name,
        client_logo_url=client_logo_url,
        client_phone=client_phone,
        client_email=client_email,
        client_website=client_website,
        has_initial_transaction=has_initial_transaction,
        transaction_amount=transaction_amount,
        receipt_number=receipt_number,
    )

    normalized_attachments = []

    for attachment in attachments or []:
        normalized = _normalize_attachment(attachment)

        if normalized:
            normalized_attachments.append(normalized)

    resend.api_key = api_key

    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [recipient_email],
        "subject": subject,
        "html": html,
    }

    if normalized_attachments:
        payload["attachments"] = normalized_attachments

    try:
        response = resend.Emails.send(payload)

        provider_id = None

        if isinstance(response, dict):
            provider_id = response.get("id")

        else:
            provider_id = getattr(response, "id", None)

        return {
            "status": "SENT",
            "provider": "RESEND",
            "provider_message_id": provider_id,
            "subject": subject,
        }

    except Exception as exc:
        return {
            "status": "FAILED",
            "provider": "RESEND",
            "message": str(exc),
        }