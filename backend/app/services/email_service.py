import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("app.services.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


async def send_brevo_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
) -> bool:
    """Send a transactional email via Brevo REST API using httpx with observability logging."""
    start_time = time.perf_counter()

    if not settings.brevo_api_key:
        logger.info(
            "[EMAIL-OBSERVABILITY] 📨 MOCK EMAIL DISPATCHED\n"
            f"  Recipient : {to_email} ({to_name})\n"
            f"  Subject   : {subject}\n"
            f"  Mode      : LOCAL_DEV (BREVO_API_KEY is not configured)\n"
            f"  Timestamp : {datetime.now(timezone.utc).isoformat()}"
        )
        return True

    headers = {
        "accept": "application/json",
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
    }

    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    logger.info(
        f"[EMAIL-OBSERVABILITY] 🚀 Initiating Brevo dispatch -> Recipient: {to_email} | Subject: '{subject}'"
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(BREVO_API_URL, headers=headers, json=payload)
            latency_ms = (time.perf_counter() - start_time) * 1000

            if response.status_code in (200, 201, 202):
                msg_id = ""
                try:
                    resp_data = response.json()
                    msg_id = resp_data.get("messageId", "")
                except Exception:
                    pass

                logger.info(
                    "[EMAIL-OBSERVABILITY] ✅ Brevo email dispatched successfully!\n"
                    f"  Recipient  : {to_email}\n"
                    f"  StatusCode : {response.status_code}\n"
                    f"  Latency    : {latency_ms:.2f}ms\n"
                    f"  MessageId  : {msg_id or 'N/A'}\n"
                    f"  Timestamp  : {datetime.now(timezone.utc).isoformat()}"
                )
                return True
            else:
                logger.error(
                    "[EMAIL-OBSERVABILITY] ❌ Brevo email dispatch failed!\n"
                    f"  Recipient  : {to_email}\n"
                    f"  StatusCode : {response.status_code}\n"
                    f"  Latency    : {latency_ms:.2f}ms\n"
                    f"  ErrorBody  : {response.text}\n"
                    f"  Timestamp  : {datetime.now(timezone.utc).isoformat()}"
                )
                return False
        except Exception as exc:
            latency_ms = (time.perf_counter() - start_time) * 1000
            logger.exception(
                "[EMAIL-OBSERVABILITY] 💥 Connection error during Brevo email dispatch!\n"
                f"  Recipient  : {to_email}\n"
                f"  Latency    : {latency_ms:.2f}ms\n"
                f"  Exception  : {str(exc)}\n"
                f"  Timestamp  : {datetime.now(timezone.utc).isoformat()}"
            )
            return False


def get_otp_email_template(code: str, title: str, subtitle: str) -> str:
    """Generate dark-mode responsive HTML email containing the 6-digit OTP code."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
    <div style="max-width: 500px; margin: 0 auto; background: #131b2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #38bdf8; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">{title}</h2>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">{subtitle}</p>
        </div>
        <div style="margin: 28px 0; padding: 20px; text-align: center; background: #0b0f19; border: 1px solid rgba(56,189,248,0.2); border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ffffff;">
            {code}
        </div>
        <div style="text-align: center;">
            <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
                This code will expire in <strong style="color: #e2e8f0;">{settings.otp_ttl_seconds} seconds</strong>.
            </p>
            <p style="color: #475569; font-size: 12px; margin: 0;">
                If you did not make this request, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>"""
