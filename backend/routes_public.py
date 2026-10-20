import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional

from db import db, gen_id, now_iso
from models import EnquiryIn, DemoBookingIn, ContactIn
from emailer import notify
import os

logger = logging.getLogger(__name__)
router = APIRouter(tags=["public"])


def ref(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


async def rate_limit(request: Request, action: str, limit: int = 8, window_sec: int = 300):
    ip = request.client.host if request.client else "unknown"
    since = (datetime.now(timezone.utc) - timedelta(seconds=window_sec)).isoformat()
    count = await db.rate_limits.count_documents({"ip": ip, "action": action, "ts": {"$gte": since}})
    if count >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a few minutes.")
    await db.rate_limits.insert_one({"id": gen_id(), "ip": ip, "action": action, "ts": now_iso()})


# ---------------- Settings / branding ----------------
@router.get("/settings")
async def public_settings():
    s = await db.settings.find_one({"id": "institute"}, {"_id": 0})
    if not s:
        return {}
    return s


# ---------------- Courses ----------------
@router.get("/courses")
async def list_courses(search: Optional[str] = None, category: Optional[str] = None,
                       level: Optional[str] = None):
    q = {"status": "published"}
    if category and category != "all":
        q["category"] = category
    if level and level != "all":
        q["level"] = level
    if search:
        q["title"] = {"$regex": search, "$options": "i"}
    courses = await db.courses.find(q, {"_id": 0}).to_list(500)
    return courses


@router.get("/courses/meta/categories")
async def course_categories():
    cats = await db.courses.distinct("category", {"status": "published"})
    return {"categories": cats}


@router.get("/courses/{slug}")
async def course_detail(slug: str):
    course = await db.courses.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    faculty = await db.faculty.find(
        {"id": {"$in": course.get("faculty_ids", [])}}, {"_id": 0}
    ).to_list(50)
    batches = await db.batches.find(
        {"course_id": course["id"], "status": {"$in": ["active", "upcoming"]}}, {"_id": 0}
    ).to_list(50)
    course["faculty"] = faculty
    course["batches"] = batches
    return course


# ---------------- Faculty ----------------
@router.get("/faculty")
async def list_faculty():
    return await db.faculty.find({"active": True}, {"_id": 0, "email": 0}).to_list(200)


@router.get("/faculty/{slug}")
async def faculty_detail(slug: str):
    f = await db.faculty.find_one({"slug": slug, "active": True}, {"_id": 0, "email": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Faculty not found")
    courses = await db.courses.find(
        {"id": {"$in": f.get("course_ids", [])}, "status": "published"}, {"_id": 0}
    ).to_list(50)
    f["courses"] = courses
    return f


# ---------------- Batches (upcoming, public) ----------------
@router.get("/batches/upcoming")
async def upcoming_batches():
    batches = await db.batches.find(
        {"status": {"$in": ["active", "upcoming"]}}, {"_id": 0}
    ).sort("start_date", 1).to_list(12)
    cmap = {c["id"]: c for c in await db.courses.find({}, {"_id": 0}).to_list(500)}
    for b in batches:
        c = cmap.get(b["course_id"])
        b["course_title"] = c["title"] if c else ""
    return batches


# ---------------- Announcements ----------------
@router.get("/announcements/public")
async def public_announcements():
    return await db.announcements.find(
        {"status": "published", "audience": {"$in": ["public", "all"]}}, {"_id": 0}
    ).sort("publish_date", -1).to_list(50)


# ---------------- Demo slots ----------------
@router.get("/demo-slots")
async def demo_slots(course_id: Optional[str] = None):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q = {"active": True, "date": {"$gte": today}}
    if course_id:
        q["course_id"] = course_id
    slots = await db.demo_slots.find(q, {"_id": 0}).sort("date", 1).to_list(100)
    for s in slots:
        s["available"] = max(0, s.get("capacity", 0) - s.get("booked_count", 0))
    return slots


# ---------------- Enquiry (public) ----------------
@router.post("/enquiries")
async def create_enquiry(payload: EnquiryIn, request: Request):
    await rate_limit(request, "enquiry", limit=6, window_sec=600)
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Please accept the privacy notice to continue")
    # duplicate protection: same phone + course within 10 minutes
    since = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    dup = await db.enquiries.find_one({
        "phone": payload.phone, "course_id": payload.course_id, "created_at": {"$gte": since}
    }, {"_id": 0})
    if dup:
        return {"reference": dup["reference"], "duplicate": True,
                "message": "We already received your enquiry. Our team will contact you soon."}
    course = None
    if payload.course_id:
        course = await db.courses.find_one({"id": payload.course_id}, {"_id": 0})
    reference = ref("ENQ")
    doc = {
        "id": gen_id(), "reference": reference, "name": payload.name.strip(),
        "phone": payload.phone.strip(), "email": payload.email,
        "course_id": payload.course_id, "course_title": course["title"] if course else "",
        "preferred_batch": payload.preferred_batch, "message": payload.message,
        "source": payload.source or "website", "assigned_to": None,
        "status": "new", "follow_up_date": None, "notes": [], "consent": True,
        "converted_student_id": None, "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.enquiries.insert_one(doc)
    if payload.email:
        await notify("enquiry_received", payload.email,
                     {"name": payload.name, "course": doc["course_title"], "reference": reference})
    admin_email = os.environ.get("ADMISSIONS_EMAIL")
    if admin_email:
        await notify("enquiry_admin", admin_email,
                     {"name": payload.name, "phone": payload.phone,
                      "course": doc["course_title"], "reference": reference})
    return {"reference": reference, "message": "Enquiry received. Our admissions team will contact you shortly."}


# ---------------- Demo booking (public) ----------------
@router.post("/demo-bookings")
async def create_demo_booking(payload: DemoBookingIn, request: Request):
    await rate_limit(request, "demo", limit=6, window_sec=600)
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Please accept the privacy notice to continue")
    slot = await db.demo_slots.find_one({"id": payload.slot_id, "active": True}, {"_id": 0})
    if not slot:
        raise HTTPException(status_code=404, detail="Selected demo slot is not available")
    if slot.get("booked_count", 0) >= slot.get("capacity", 0):
        raise HTTPException(status_code=409, detail="This demo slot is fully booked. Please choose another.")
    dup = await db.demo_bookings.find_one(
        {"phone": payload.phone, "slot_id": payload.slot_id}, {"_id": 0})
    if dup:
        return {"reference": dup["reference"], "duplicate": True,
                "message": "You have already booked this demo slot."}
    course = await db.courses.find_one({"id": payload.course_id}, {"_id": 0})
    reference = ref("DEMO")
    doc = {
        "id": gen_id(), "reference": reference, "name": payload.name.strip(),
        "phone": payload.phone.strip(), "email": payload.email,
        "course_id": payload.course_id, "course_title": course["title"] if course else "",
        "slot_id": payload.slot_id, "session_date": slot["date"], "session_time": slot["time"],
        "status": "pending", "created_at": now_iso(),
    }
    await db.demo_bookings.insert_one(doc)
    await db.demo_slots.update_one({"id": slot["id"]}, {"$inc": {"booked_count": 1}})
    if payload.email:
        await notify("demo_booking", payload.email,
                     {"name": payload.name, "course": doc["course_title"],
                      "date": slot["date"], "time": slot["time"], "reference": reference,
                      "status": "pending confirmation"})
    return {"reference": reference, "status": "pending",
            "message": "Demo booked. Status is pending confirmation until our team confirms."}


# ---------------- Contact (public) ----------------
@router.post("/contact")
async def contact(payload: ContactIn, request: Request):
    await rate_limit(request, "contact", limit=6, window_sec=600)
    doc = {"id": gen_id(), "name": payload.name, "email": payload.email,
           "phone": payload.phone, "message": payload.message,
           "status": "new", "created_at": now_iso()}
    await db.contact_messages.insert_one(doc)
    return {"message": "Thank you for reaching out. We will get back to you soon."}
