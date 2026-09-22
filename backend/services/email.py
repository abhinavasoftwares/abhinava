import os

import resend


class EmailSendResult:
    def __init__(
        self,
        success: bool,
        provider_message_id: str | None = None,
        error: str | None = None,
    ):
        self.success = success
        self.provider_message_id = (
            provider_message_id
        )
        self.error = error


def send_email(
    *,
    recipient: str,
    subject: str,
    html: str,
) -> EmailSendResult:

    api_key = os.getenv(
        "RESEND_API_KEY"
    )

    from_email = os.getenv(
        "RESEND_FROM_EMAIL"
    )

    from_name = os.getenv(
        "RESEND_FROM_NAME",
        "Abhinava",
    )

    if not api_key:
        return EmailSendResult(
            success=False,
            error=(
                "RESEND_API_KEY is not configured."
            ),
        )

    if not from_email:
        return EmailSendResult(
            success=False,
            error=(
                "RESEND_FROM_EMAIL is not configured."
            ),
        )

    try:

        resend.api_key = api_key

        response = resend.Emails.send(
            {
                "from": (
                    f"{from_name} "
                    f"<{from_email}>"
                ),

                "to": [recipient],

                "subject": subject,

                "html": html,
            }
        )

        provider_message_id = None

        if isinstance(response, dict):
            provider_message_id = response.get(
                "id"
            )
        else:
            provider_message_id = getattr(
                response,
                "id",
                None,
            )

        return EmailSendResult(
            success=True,
            provider_message_id=(
                provider_message_id
            ),
        )

    except Exception as exc:

        return EmailSendResult(
            success=False,
            error=str(exc),
        )