import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def gen_id() -> str:
    return uuid.uuid4().hex


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def audit(actor: dict, action: str, entity_type: str, entity_id: str, details: str = ""):
    await db.audit_logs.insert_one({
        "id": gen_id(),
        "actor_id": actor.get("id") if actor else None,
        "actor_name": actor.get("name") if actor else "system",
        "actor_role": actor.get("role") if actor else "system",
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "created_at": now_iso(),
    })


async def create_indexes():
    try:
        await db.users.create_index("email", unique=True)
        await db.auth_sessions.create_index("session_token")
        await db.auth_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.login_attempts.create_index("identifier")
        await db.students.create_index("student_code", unique=True)
        await db.courses.create_index("slug", unique=True)
        await db.faculty.create_index("slug", unique=True)
        await db.enquiries.create_index("reference", unique=True)
        await db.demo_bookings.create_index("reference", unique=True)
        await db.payments.create_index("reference", unique=True)
        await db.attendance.create_index(
            [("batch_id", 1), ("session_date", 1), ("student_id", 1)], unique=True
        )
    except Exception as e:  # noqa
        import logging
        logging.getLogger(__name__).warning(f"index creation: {e}")
