import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

from db import db, gen_id, now_iso

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "EduPrime Academy")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def _send_email(*, to: str, subject: str, html: str) -> str:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()
    return resp.json().get("id")


def _wrap(title: str, inner: str) -> str:
    return (
        '<table role="presentation" width="100%" style="background:#f8fafc;padding:24px">'
        '<tr><td align="center">'
        '<table role="presentation" width="600" style="background:#ffffff;border-radius:12px;'
        'overflow:hidden;font-family:Arial,Helvetica,sans-serif">'
        '<tr><td style="background:#0f172a;padding:20px 28px">'
        f'<span style="color:#ffffff;font-size:20px;font-weight:bold">{escape(EMAIL_FROM_NAME)}</span>'
        '</td></tr>'
        f'<tr><td style="padding:28px">{inner}</td></tr>'
        '<tr><td style="padding:16px 28px;background:#f1f5f9;font-size:12px;color:#64748b">'
        f'Sent by {escape(EMAIL_FROM_NAME)}. We never ask for your password or payment details by email.'
        '</td></tr></table></td></tr></table>'
    )


async def notify(kind: str, to: str, context: dict):
    """Fire-and-forget notification. Records every attempt; never raises to caller."""
    record = {"id": gen_id(), "kind": kind, "to": to, "created_at": now_iso()}
    if not to or not EMAIL_KEY:
        record.update({"status": "skipped", "reason": "no recipient or key"})
        await db.notifications.insert_one(record)
        return
    try:
        subject, inner = _build(kind, context)
        email_id = await _send_email(to=to, subject=subject, html=_wrap(subject, inner))
        record.update({"status": "sent", "email_id": email_id})
    except Exception as e:  # noqa
        logger.error(f"notify {kind} failed: {e}")
        record.update({"status": "failed", "reason": str(e)[:300]})
    await db.notifications.insert_one(record)


def _build(kind: str, c: dict):
    name = escape(str(c.get("name", "there")))
    if kind == "enquiry_received":
        subject = "We received your admission enquiry"
        inner = (
            f'<p>Hi {name},</p>'
            f'<p>Thank you for your enquiry about <strong>{escape(str(c.get("course", "our courses")))}</strong>. '
            f'Your reference number is <strong>{escape(str(c.get("reference","")))}</strong>.</p>'
            f'<p>Our admissions team will contact you shortly. Submitting this enquiry does not confirm admission.</p>'
        )
    elif kind == "enquiry_admin":
        subject = "New admission enquiry received"
        inner = (
            f'<p>A new enquiry was submitted.</p>'
            f'<p><strong>Name:</strong> {escape(str(c.get("name","")))}<br/>'
            f'<strong>Phone:</strong> {escape(str(c.get("phone","")))}<br/>'
            f'<strong>Course:</strong> {escape(str(c.get("course","")))}<br/>'
            f'<strong>Reference:</strong> {escape(str(c.get("reference","")))}</p>'
        )
    elif kind == "demo_booking":
        subject = "Your demo class booking"
        status = escape(str(c.get("status", "pending confirmation")))
        inner = (
            f'<p>Hi {name},</p>'
            f'<p>Your demo class for <strong>{escape(str(c.get("course","")))}</strong> on '
            f'<strong>{escape(str(c.get("date","")))} at {escape(str(c.get("time","")))}</strong> is booked.</p>'
            f'<p>Reference: <strong>{escape(str(c.get("reference","")))}</strong>. Status: <strong>{status}</strong>.</p>'
        )
    elif kind == "admission_status":
        subject = "Update on your admission"
        inner = (
            f'<p>Hi {name},</p>'
            f'<p>Your admission enquiry status has been updated to <strong>{escape(str(c.get("status","")))}</strong>.</p>'
        )
    else:
        subject = f"{EMAIL_FROM_NAME} notification"
        inner = f'<p>Hi {name},</p><p>{escape(str(c.get("message","")))}</p>'
    return subject, inner
