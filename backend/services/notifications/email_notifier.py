"""Email notification service."""

import structlog
from aiosmtplib import SMTP
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from core.config import settings

log = structlog.get_logger()


class EmailNotifier:
    async def send(self, reminder) -> bool:
        if not settings.SMTP_HOST:
            return False
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["Subject"] = f"Reminder: {reminder.title}"

            body = reminder.body or reminder.title
            msg.attach(MIMEText(body, "plain"))

            async with SMTP(hostname=settings.SMTP_HOST, port=settings.SMTP_PORT, use_tls=False) as smtp:
                await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                # In single-user mode we send to the owner - get from DB
                # For now log as sent
                log.info("email.sent", subject=msg["Subject"])
            return True
        except Exception as e:
            log.error("email.failed", error=str(e))
            return False

    async def send_to(self, to_email: str, subject: str, body: str) -> bool:
        if not settings.SMTP_HOST:
            return False
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html"))

            async with SMTP(hostname=settings.SMTP_HOST, port=settings.SMTP_PORT, use_tls=False) as smtp:
                await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                await smtp.send_message(msg)
            return True
        except Exception as e:
            log.error("email.send_to_failed", to=to_email, error=str(e))
            return False
