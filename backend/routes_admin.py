import io
import csv
import re
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from db import db, gen_id, now_iso, today_str, audit
from security import require_roles, hash_password
from services import fee_summary, attendance_summary
from emailer import notify
from models import (
    CourseIn, FacultyIn, BatchIn, StudentIn, StudentUpdateIn, EnrollIn, EnquiryUpdateIn,
    FollowUpIn, ConvertIn, DemoSlotIn, AttendanceMarkIn, InstallmentIn, PaymentIn,
    AnnouncementIn, StaffIn, StaffUpdateIn, SettingsIn, LinkAccountIn,
)

ACCOUNT_FIELDS = {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "auth_provider": 1, "created_at": 1}

router = APIRouter(prefix="/admin", tags=["admin"])

Staff = Depends(require_roles("admin"))
Super = Depends(require_roles())  # super_admin only (bypass)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or uuid.uuid4().hex[:8]


async def unique_slug(collection, text: str) -> str:
    base = slugify(text)
    slug = base
    i = 2
    while await collection.find_one({"slug": slug}):
        slug = f"{base}-{i}"
        i += 1
    return slug


def csv_response(headers, rows, filename):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


# =========================================================================
# DASHBOARD
# =========================================================================
@router.get("/dashboard")
async def dashboard(user=Staff):
    students = await db.students.find({}, {"_id": 0}).to_list(5000)
    active_students = [s for s in students if s.get("status") == "active"]
    enquiries = await db.enquiries.find({}, {"_id": 0}).to_list(5000)
    courses = await db.courses.find({}, {"_id": 0}).to_list(500)
    batches = await db.batches.find({}, {"_id": 0}).to_list(500)
    today = today_str()
    weekday = datetime.now(timezone.utc).strftime("%A")

    new_enquiries = [e for e in enquiries if e.get("status") == "new"]
    pending_followups = [e for e in enquiries if e.get("follow_up_date") and e["follow_up_date"] <= today
                         and e.get("status") not in ("converted", "closed", "not_interested")]
    active_courses = [c for c in courses if c.get("status") == "published"]
    active_batches = [b for b in batches if b.get("status") == "active"]
    todays_classes = [b for b in active_batches if weekday in b.get("days", [])]

    demo = await db.demo_bookings.find({"session_date": {"$gte": today}}, {"_id": 0}).to_list(1000)

    att_today = await db.attendance.find({"session_date": today}, {"_id": 0}).to_list(5000)
    present_today = sum(1 for a in att_today if a["status"] in ("present", "late"))

    # fees
    insts = await db.installments.find({}, {"_id": 0}).to_list(10000)
    pays = await db.payments.find({"reversed": {"$ne": True}}, {"_id": 0}).to_list(10000)
    total_due = sum(i["amount"] - i.get("discount", 0) for i in insts)
    total_paid = sum(p["amount"] for p in pays)
    month_prefix = today[:7]
    collected_month = sum(p["amount"] for p in pays if (p.get("created_at") or "")[:7] == month_prefix)

    # charts
    status_counts = {}
    for e in enquiries:
        status_counts[e.get("status", "new")] = status_counts.get(e.get("status", "new"), 0) + 1
    fees_by_month = {}
    for p in pays:
        m = (p.get("created_at") or "")[:7]
        if m:
            fees_by_month[m] = fees_by_month.get(m, 0) + p["amount"]
    months = sorted(fees_by_month.keys())[-6:]
    students_by_course = {}
    cmap = {c["id"]: c["title"] for c in courses}
    for s in active_students:
        t = cmap.get(s.get("course_id"), "Unassigned")
        students_by_course[t] = students_by_course.get(t, 0) + 1

    recent = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)

    return {
        "metrics": {
            "active_students": len(active_students),
            "new_enquiries": len(new_enquiries),
            "pending_followups": len(pending_followups),
            "active_courses": len(active_courses),
            "active_batches": len(active_batches),
            "todays_classes": len(todays_classes),
            "demo_bookings": len(demo),
            "attendance_present_today": present_today,
            "attendance_marked_today": len(att_today),
            "fees_collected_month": round(collected_month, 2),
            "outstanding": round(total_due - total_paid, 2),
            "total_collected": round(total_paid, 2),
        },
        "charts": {
            "enquiry_status": [{"status": k, "count": v} for k, v in status_counts.items()],
            "fees_by_month": [{"month": m, "amount": round(fees_by_month[m], 2)} for m in months],
            "students_by_course": [{"course": k, "count": v} for k, v in students_by_course.items()],
        },
        "todays_classes": [
            {"id": b["id"], "name": b["name"], "course": cmap.get(b["course_id"], ""),
             "start_time": b.get("start_time"), "end_time": b.get("end_time"),
             "location": b.get("location")} for b in todays_classes
        ],
        "recent_activity": recent,
    }


# =========================================================================
# COURSES
# =========================================================================
@router.get("/courses")
async def admin_courses(user=Staff):
    courses = await db.courses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    counts = {}
    for s in await db.students.find({"status": "active"}, {"_id": 0, "course_id": 1}).to_list(5000):
        counts[s.get("course_id")] = counts.get(s.get("course_id"), 0) + 1
    for c in courses:
        c["enrolled_count"] = counts.get(c["id"], 0)
    return courses


@router.post("/courses")
async def create_course(payload: CourseIn, user=Staff):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["slug"] = await unique_slug(db.courses, payload.title)
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.courses.insert_one(doc)
    await audit(user, "create", "course", doc["id"], f"Created course {payload.title}")
    doc.pop("_id", None)
    return doc


@router.put("/courses/{course_id}")
async def update_course(course_id: str, payload: CourseIn, user=Staff):
    existing = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.courses.update_one({"id": course_id}, {"$set": doc})
    await audit(user, "update", "course", course_id, f"Updated course {payload.title}")
    return await db.courses.find_one({"id": course_id}, {"_id": 0})


# =========================================================================
# FACULTY
# =========================================================================
@router.get("/faculty")
async def admin_faculty(user=Staff):
    return await db.faculty.find({}, {"_id": 0}).sort("created_at", -1).to_list(300)


@router.post("/faculty")
async def create_faculty(payload: FacultyIn, user=Staff):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["slug"] = await unique_slug(db.faculty, payload.name)
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.faculty.insert_one(doc)
    await audit(user, "create", "faculty", doc["id"], f"Added faculty {payload.name}")
    doc.pop("_id", None)
    return doc


@router.put("/faculty/{faculty_id}")
async def update_faculty(faculty_id: str, payload: FacultyIn, user=Staff):
    if not await db.faculty.find_one({"id": faculty_id}):
        raise HTTPException(status_code=404, detail="Faculty not found")
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.faculty.update_one({"id": faculty_id}, {"$set": doc})
    await audit(user, "update", "faculty", faculty_id, f"Updated faculty {payload.name}")
    return await db.faculty.find_one({"id": faculty_id}, {"_id": 0})


# =========================================================================
# BATCHES
# =========================================================================
@router.get("/batches")
async def admin_batches(user=Staff):
    batches = await db.batches.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    cmap = {c["id"]: c["title"] for c in await db.courses.find({}, {"_id": 0}).to_list(500)}
    fmap = {f["id"]: f["name"] for f in await db.faculty.find({}, {"_id": 0}).to_list(500)}
    counts = {}
    for s in await db.students.find({"status": "active"}, {"_id": 0, "batch_id": 1}).to_list(5000):
        counts[s.get("batch_id")] = counts.get(s.get("batch_id"), 0) + 1
    for b in batches:
        b["course_title"] = cmap.get(b["course_id"], "")
        b["teacher_name"] = fmap.get(b.get("teacher_id"), "Unassigned")
        b["enrolled_count"] = counts.get(b["id"], 0)
    return batches


@router.post("/batches")
async def create_batch(payload: BatchIn, user=Staff):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.batches.insert_one(doc)
    await audit(user, "create", "batch", doc["id"], f"Created batch {payload.name}")
    doc.pop("_id", None)
    return doc


@router.put("/batches/{batch_id}")
async def update_batch(batch_id: str, payload: BatchIn, user=Staff):
    if not await db.batches.find_one({"id": batch_id}):
        raise HTTPException(status_code=404, detail="Batch not found")
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.batches.update_one({"id": batch_id}, {"$set": doc})
    await audit(user, "update", "batch", batch_id, f"Updated batch {payload.name}")
    return await db.batches.find_one({"id": batch_id}, {"_id": 0})


@router.get("/batches/{batch_id}/roster")
async def batch_roster(batch_id: str, user=Staff):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    students = await db.students.find(
        {"batch_id": batch_id, "status": "active"}, {"_id": 0}).to_list(500)
    return {"batch": batch, "students": students}


# =========================================================================
# STUDENTS
# =========================================================================
async def _next_student_code():
    n = await db.students.count_documents({})
    return f"STU-{n + 1:04d}"


async def _create_student(payload: StudentIn, user):
    batch = None
    if payload.batch_id:
        batch = await db.batches.find_one({"id": payload.batch_id}, {"_id": 0})
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        active = await db.students.count_documents({"batch_id": payload.batch_id, "status": "active"})
        if active >= batch.get("capacity", 0):
            raise HTTPException(status_code=409, detail="Batch is at full capacity")
    sid = gen_id()
    doc = {
        "id": sid, "student_code": await _next_student_code(), "name": payload.name.strip(),
        "phone": payload.phone.strip(), "email": payload.email,
        "admission_date": payload.admission_date or today_str(),
        "course_id": payload.course_id, "batch_id": payload.batch_id,
        "status": payload.status, "notes": payload.notes,
        "emergency_contact": payload.emergency_contact,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.students.insert_one(doc)
    if payload.course_id and payload.batch_id:
        await db.enrollments.insert_one({
            "id": gen_id(), "student_id": sid, "course_id": payload.course_id,
            "batch_id": payload.batch_id, "status": "active", "from_batch_id": None,
            "created_at": now_iso(),
        })
    # optional fee plan
    course = await db.courses.find_one({"id": payload.course_id}, {"_id": 0}) if payload.course_id else None
    fee_total = payload.fee_total if payload.fee_total is not None else (course.get("fee_amount", 0) if course else 0)
    if fee_total and fee_total > 0:
        await db.installments.insert_one({
            "id": gen_id(), "student_id": sid, "label": "Full Course Fee",
            "amount": float(fee_total), "discount": 0,
            "due_date": payload.admission_date or today_str(), "created_at": now_iso(),
        })
    if payload.create_login and payload.email:
        exists = await db.users.find_one({"email": payload.email.lower()})
        if not exists:
            await db.users.insert_one({
                "id": gen_id(), "email": payload.email.lower(), "name": payload.name,
                "role": "student", "password_hash": hash_password(payload.password or "Student@123"),
                "auth_provider": "password", "linked_student_id": sid, "active": True,
                "created_at": now_iso(), "updated_at": now_iso(),
            })
    await audit(user, "create", "student", sid, f"Registered student {payload.name}")
    return doc


@router.get("/students")
async def admin_students(user=Staff, search: Optional[str] = None, status: Optional[str] = None,
                         course_id: Optional[str] = None, batch_id: Optional[str] = None,
                         skip: int = 0, limit: int = 20):
    q = {}
    if status and status != "all":
        q["status"] = status
    if course_id and course_id != "all":
        q["course_id"] = course_id
    if batch_id and batch_id != "all":
        q["batch_id"] = batch_id
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"phone": {"$regex": search, "$options": "i"}},
                    {"student_code": {"$regex": search, "$options": "i"}}]
    total = await db.students.count_documents(q)
    items = await db.students.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    cmap = {c["id"]: c["title"] for c in await db.courses.find({}, {"_id": 0}).to_list(500)}
    bmap = {b["id"]: b["name"] for b in await db.batches.find({}, {"_id": 0}).to_list(500)}
    for s in items:
        s["course_title"] = cmap.get(s.get("course_id"), "")
        s["batch_name"] = bmap.get(s.get("batch_id"), "")
    return {"items": items, "total": total}


@router.get("/students/export")
async def export_students(user=Staff):
    students = await db.students.find({}, {"_id": 0}).to_list(10000)
    cmap = {c["id"]: c["title"] for c in await db.courses.find({}, {"_id": 0}).to_list(500)}
    rows = [[s["student_code"], s["name"], s["phone"], s.get("email", ""),
             cmap.get(s.get("course_id"), ""), s.get("status"), s.get("admission_date")]
            for s in students]
    return csv_response(["Code", "Name", "Phone", "Email", "Course", "Status", "Admission Date"],
                        rows, "students.csv")


@router.get("/students/{student_id}")
async def student_profile(student_id: str, user=Staff):
    s = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    course = await db.courses.find_one({"id": s.get("course_id")}, {"_id": 0}) if s.get("course_id") else None
    batch = await db.batches.find_one({"id": s.get("batch_id")}, {"_id": 0}) if s.get("batch_id") else None
    enrollments = await db.enrollments.find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {
        "student": s, "course": course, "batch": batch, "enrollments": enrollments,
        "fees": await fee_summary(student_id),
        "attendance": await attendance_summary(student_id),
        "account": await db.users.find_one({"linked_student_id": student_id}, ACCOUNT_FIELDS),
    }


@router.get("/student-accounts")
async def unlinked_student_accounts(user=Staff):
    q = {"role": "student", "linked_student_id": None, "active": {"$ne": False}}
    return await db.users.find(q, ACCOUNT_FIELDS).sort("created_at", -1).to_list(500)


@router.post("/students/{student_id}/link-account")
async def link_student_account(student_id: str, payload: LinkAccountIn, user=Staff):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    acct = await db.users.find_one({"id": payload.user_id}, {"_id": 0, "password_hash": 0})
    if not acct or acct.get("role") != "student":
        raise HTTPException(status_code=400, detail="Only student login accounts can be linked")
    if acct.get("linked_student_id") and acct["linked_student_id"] != student_id:
        raise HTTPException(status_code=409, detail="This account is already linked to another student record")
    if await db.users.find_one({"linked_student_id": student_id, "id": {"$ne": acct["id"]}}):
        raise HTTPException(status_code=409, detail="This student already has a linked account. Unlink it first.")
    await db.users.update_one({"id": acct["id"]}, {"$set": {"linked_student_id": student_id, "updated_at": now_iso()}})
    await audit(user, "link_account", "student", student_id, f"Linked login {acct['email']} to {student['name']}")
    return {"message": "Account linked", "account": await db.users.find_one({"id": acct["id"]}, ACCOUNT_FIELDS)}


@router.post("/students/{student_id}/unlink-account")
async def unlink_student_account(student_id: str, user=Staff):
    acct = await db.users.find_one({"linked_student_id": student_id}, ACCOUNT_FIELDS)
    if not acct:
        raise HTTPException(status_code=404, detail="No login account is linked to this student")
    await db.users.update_one({"id": acct["id"]}, {"$set": {"linked_student_id": None, "updated_at": now_iso()}})
    await audit(user, "unlink_account", "student", student_id, f"Unlinked login {acct['email']}")
    return {"message": "Account unlinked"}


@router.post("/students")
async def create_student(payload: StudentIn, user=Staff):
    doc = await _create_student(payload, user)
    doc.pop("_id", None)
    return doc


@router.put("/students/{student_id}")
async def update_student(student_id: str, payload: StudentUpdateIn, user=Staff):
    if not await db.students.find_one({"id": student_id}):
        raise HTTPException(status_code=404, detail="Student not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.students.update_one({"id": student_id}, {"$set": updates})
    await audit(user, "update", "student", student_id, "Updated student record")
    return await db.students.find_one({"id": student_id}, {"_id": 0})


@router.post("/students/{student_id}/enroll")
async def enroll_student(student_id: str, payload: EnrollIn, user=Staff):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    batch = await db.batches.find_one({"id": payload.batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch["course_id"] != payload.course_id:
        raise HTTPException(status_code=400, detail="Batch does not belong to selected course")
    active = await db.students.count_documents(
        {"batch_id": payload.batch_id, "status": "active", "id": {"$ne": student_id}})
    if active >= batch.get("capacity", 0) and not payload.override_capacity:
        raise HTTPException(status_code=409, detail="Batch is at full capacity. Use override if authorized.")
    prev_batch = student.get("batch_id")
    # close previous active enrollment (preserve history)
    await db.enrollments.update_many(
        {"student_id": student_id, "status": "active"}, {"$set": {"status": "transferred"}})
    await db.enrollments.insert_one({
        "id": gen_id(), "student_id": student_id, "course_id": payload.course_id,
        "batch_id": payload.batch_id, "status": "active", "from_batch_id": prev_batch,
        "override": payload.override_capacity, "override_reason": payload.override_reason,
        "created_at": now_iso(),
    })
    await db.students.update_one({"id": student_id}, {"$set": {
        "course_id": payload.course_id, "batch_id": payload.batch_id, "updated_at": now_iso()}})
    note = "Transferred" if prev_batch else "Enrolled"
    if payload.override_capacity:
        note += f" (capacity override: {payload.override_reason})"
    await audit(user, "enroll", "student", student_id, note)
    return {"message": f"{note} successfully"}


@router.post("/students/{student_id}/toggle-status")
async def toggle_student(student_id: str, user=Staff):
    s = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    new_status = "inactive" if s.get("status") == "active" else "active"
    await db.students.update_one({"id": student_id}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    await audit(user, "update", "student", student_id, f"Set status to {new_status}")
    return {"status": new_status}


# =========================================================================
# ENQUIRIES (CRM)
# =========================================================================
@router.get("/enquiries")
async def admin_enquiries(user=Staff, search: Optional[str] = None, status: Optional[str] = None,
                          assigned_to: Optional[str] = None, skip: int = 0, limit: int = 20):
    q = {}
    if status and status != "all":
        q["status"] = status
    if assigned_to and assigned_to != "all":
        q["assigned_to"] = assigned_to
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"phone": {"$regex": search, "$options": "i"}},
                    {"reference": {"$regex": search, "$options": "i"}}]
    total = await db.enquiries.count_documents(q)
    items = await db.enquiries.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    staff = {u["id"]: u["name"] for u in await db.users.find(
        {"role": {"$in": ["admin", "super_admin"]}}, {"_id": 0}).to_list(200)}
    today = today_str()
    for e in items:
        e["assigned_name"] = staff.get(e.get("assigned_to"), "")
        e["overdue"] = bool(e.get("follow_up_date") and e["follow_up_date"] < today
                            and e.get("status") not in ("converted", "closed", "not_interested"))
    return {"items": items, "total": total}


@router.put("/enquiries/{enquiry_id}")
async def update_enquiry(enquiry_id: str, payload: EnquiryUpdateIn, user=Staff):
    e = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.enquiries.update_one({"id": enquiry_id}, {"$set": updates})
    await audit(user, "update", "enquiry", enquiry_id, f"Updated enquiry {e['reference']}")
    if payload.status and payload.status != e.get("status") and e.get("email"):
        await notify("admission_status", e["email"], {"name": e["name"], "status": payload.status})
    return await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})


@router.post("/enquiries/{enquiry_id}/followup")
async def add_followup(enquiry_id: str, payload: FollowUpIn, user=Staff):
    e = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    note = {"id": gen_id(), "note": payload.note, "by": user["name"],
            "at": now_iso(), "next_date": payload.next_date}
    updates = {"updated_at": now_iso()}
    if payload.next_date:
        updates["follow_up_date"] = payload.next_date
    if payload.status:
        updates["status"] = payload.status
    await db.enquiries.update_one({"id": enquiry_id},
                                  {"$push": {"notes": note}, "$set": updates})
    await audit(user, "followup", "enquiry", enquiry_id, f"Follow-up on {e['reference']}")
    return await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})


@router.post("/enquiries/{enquiry_id}/convert")
async def convert_enquiry(enquiry_id: str, payload: ConvertIn, user=Staff):
    e = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if e.get("converted_student_id"):
        raise HTTPException(status_code=409, detail="Enquiry already converted")
    student_payload = StudentIn(
        name=e["name"], phone=e["phone"], email=e.get("email"),
        course_id=payload.course_id, batch_id=payload.batch_id,
        admission_date=payload.admission_date or today_str(),
        fee_total=payload.fee_total, status="active",
    )
    student = await _create_student(student_payload, user)
    await db.enquiries.update_one({"id": enquiry_id}, {"$set": {
        "status": "converted", "converted_student_id": student["id"], "updated_at": now_iso()}})
    await audit(user, "convert", "enquiry", enquiry_id,
                f"Converted {e['reference']} to student {student['student_code']}")
    return {"message": "Enquiry converted", "student_id": student["id"],
            "student_code": student["student_code"]}


@router.get("/enquiries/export")
async def export_enquiries(user=Staff):
    items = await db.enquiries.find({}, {"_id": 0}).to_list(10000)
    rows = [[e["reference"], e["name"], e["phone"], e.get("email", ""), e.get("course_title", ""),
             e.get("source"), e.get("status"), e.get("follow_up_date", "")] for e in items]
    return csv_response(["Reference", "Name", "Phone", "Email", "Course", "Source", "Status", "Follow-up"],
                        rows, "enquiries.csv")


# =========================================================================
# DEMO SLOTS & BOOKINGS
# =========================================================================
@router.get("/demo-slots")
async def admin_demo_slots(user=Staff):
    slots = await db.demo_slots.find({}, {"_id": 0}).sort("date", 1).to_list(500)
    cmap = {c["id"]: c["title"] for c in await db.courses.find({}, {"_id": 0}).to_list(500)}
    for s in slots:
        s["course_title"] = cmap.get(s["course_id"], "")
        s["available"] = max(0, s.get("capacity", 0) - s.get("booked_count", 0))
    return slots


@router.post("/demo-slots")
async def create_demo_slot(payload: DemoSlotIn, user=Staff):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["booked_count"] = 0
    doc["created_at"] = now_iso()
    await db.demo_slots.insert_one(doc)
    await audit(user, "create", "demo_slot", doc["id"], "Created demo slot")
    doc.pop("_id", None)
    return doc


@router.get("/demo-bookings")
async def admin_demo_bookings(user=Staff, status: Optional[str] = None):
    q = {}
    if status and status != "all":
        q["status"] = status
    return await db.demo_bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.put("/demo-bookings/{booking_id}")
async def update_demo_booking(booking_id: str, status: str = Query(...), user=Staff):
    b = await db.demo_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.demo_bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    await audit(user, "update", "demo_booking", booking_id, f"Demo booking {b['reference']} -> {status}")
    return {"status": status}


# =========================================================================
# ATTENDANCE
# =========================================================================
@router.get("/attendance")
async def get_attendance(batch_id: str, session_date: str, user=Staff):
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    students = await db.students.find({"batch_id": batch_id, "status": "active"}, {"_id": 0}).to_list(500)
    existing = await db.attendance.find({"batch_id": batch_id, "session_date": session_date},
                                        {"_id": 0}).to_list(500)
    emap = {a["student_id"]: a for a in existing}
    roster = [{"student_id": s["id"], "name": s["name"], "student_code": s["student_code"],
               "status": emap.get(s["id"], {}).get("status")} for s in students]
    return {"batch": batch, "roster": roster, "marked": len(existing) > 0}


@router.post("/attendance")
async def mark_attendance(payload: AttendanceMarkIn, user=Staff):
    batch = await db.batches.find_one({"id": payload.batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    enrolled = {s["id"] for s in await db.students.find(
        {"batch_id": payload.batch_id, "status": "active"}, {"_id": 0, "id": 1}).to_list(500)}
    saved = 0
    for entry in payload.entries:
        if entry.student_id not in enrolled:
            continue
        existing = await db.attendance.find_one(
            {"batch_id": payload.batch_id, "session_date": payload.session_date,
             "student_id": entry.student_id})
        if existing:
            await db.attendance.update_one({"id": existing["id"]}, {"$set": {
                "status": entry.status, "updated_by": user["name"], "updated_at": now_iso()}})
        else:
            await db.attendance.insert_one({
                "id": gen_id(), "batch_id": payload.batch_id, "session_date": payload.session_date,
                "student_id": entry.student_id, "status": entry.status,
                "marked_by": user["name"], "marked_at": now_iso(),
                "updated_by": None, "updated_at": None,
            })
        saved += 1
    await audit(user, "attendance", "batch", payload.batch_id,
                f"Marked attendance for {payload.session_date} ({saved} students)")
    return {"saved": saved, "message": "Attendance saved"}


@router.get("/attendance/export")
async def export_attendance(batch_id: str, user=Staff):
    recs = await db.attendance.find({"batch_id": batch_id}, {"_id": 0}).to_list(10000)
    smap = {s["id"]: s for s in await db.students.find({}, {"_id": 0}).to_list(5000)}
    rows = [[r["session_date"], smap.get(r["student_id"], {}).get("student_code", ""),
             smap.get(r["student_id"], {}).get("name", ""), r["status"], r.get("marked_by", "")]
            for r in sorted(recs, key=lambda x: x["session_date"])]
    return csv_response(["Date", "Code", "Student", "Status", "Marked By"], rows, "attendance.csv")


# =========================================================================
# FEES
# =========================================================================
@router.get("/fees/overview")
async def fees_overview(user=Staff):
    students = await db.students.find({}, {"_id": 0}).to_list(5000)
    insts = await db.installments.find({}, {"_id": 0}).to_list(10000)
    pays = await db.payments.find({"reversed": {"$ne": True}}, {"_id": 0}).to_list(10000)
    due_by_student, paid_by_student = {}, {}
    for i in insts:
        due_by_student[i["student_id"]] = due_by_student.get(i["student_id"], 0) + i["amount"] - i.get("discount", 0)
    for p in pays:
        paid_by_student[p["student_id"]] = paid_by_student.get(p["student_id"], 0) + p["amount"]
    rows = []
    total_due = total_paid = 0
    for s in students:
        due = due_by_student.get(s["id"], 0)
        paid = paid_by_student.get(s["id"], 0)
        if due == 0 and paid == 0:
            continue
        total_due += due
        total_paid += paid
        rows.append({"student_id": s["id"], "student_code": s["student_code"], "name": s["name"],
                     "total": round(due, 2), "paid": round(paid, 2), "outstanding": round(due - paid, 2)})
    rows.sort(key=lambda x: x["outstanding"], reverse=True)
    return {"summary": {"total": round(total_due, 2), "paid": round(total_paid, 2),
                        "outstanding": round(total_due - total_paid, 2)}, "students": rows}


@router.post("/installments")
async def add_installment(payload: InstallmentIn, user=Staff):
    if not await db.students.find_one({"id": payload.student_id}):
        raise HTTPException(status_code=404, detail="Student not found")
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    await db.installments.insert_one(doc)
    await audit(user, "create", "installment", doc["id"], f"Added installment of {payload.amount}")
    doc.pop("_id", None)
    return doc


@router.post("/payments")
async def record_payment(payload: PaymentIn, user=Staff):
    student = await db.students.find_one({"id": payload.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    reference = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    doc = {
        "id": gen_id(), "reference": reference, "student_id": payload.student_id,
        "installment_id": payload.installment_id, "amount": float(payload.amount),
        "method": payload.method, "payment_ref": payload.payment_ref, "note": payload.note,
        "status": "paid", "reversed": False, "recorded_by": user["name"],
        "created_at": now_iso(),
    }
    await db.payments.insert_one(doc)
    await audit(user, "payment", "student", payload.student_id,
                f"Recorded offline payment {reference} of {payload.amount} via {payload.method}")
    doc.pop("_id", None)
    return doc


@router.post("/payments/{payment_id}/reverse")
async def reverse_payment(payment_id: str, user=Staff):
    p = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if p.get("reversed"):
        raise HTTPException(status_code=409, detail="Payment already reversed")
    await db.payments.update_one({"id": payment_id}, {"$set": {
        "reversed": True, "status": "reversed", "reversed_by": user["name"], "reversed_at": now_iso()}})
    await audit(user, "reverse", "payment", payment_id, f"Reversed payment {p['reference']}")
    return {"message": "Payment reversed"}


@router.get("/payments/{payment_id}/receipt")
async def payment_receipt(payment_id: str, user=Staff):
    p = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    student = await db.students.find_one({"id": p["student_id"]}, {"_id": 0})
    settings = await db.settings.find_one({"id": "institute"}, {"_id": 0})
    course = await db.courses.find_one({"id": student.get("course_id")}, {"_id": 0}) if student else None
    return {"payment": p, "student": student, "institute": settings,
            "course_title": course["title"] if course else ""}


# =========================================================================
# ANNOUNCEMENTS
# =========================================================================
@router.get("/announcements")
async def admin_announcements(user=Staff):
    return await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/announcements")
async def create_announcement(payload: AnnouncementIn, user=Staff):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["publish_date"] = payload.publish_date or today_str()
    doc["created_by"] = user["name"]
    doc["created_at"] = now_iso()
    await db.announcements.insert_one(doc)
    await audit(user, "create", "announcement", doc["id"], f"Published announcement {payload.title}")
    doc.pop("_id", None)
    return doc


@router.put("/announcements/{ann_id}")
async def update_announcement(ann_id: str, payload: AnnouncementIn, user=Staff):
    if not await db.announcements.find_one({"id": ann_id}):
        raise HTTPException(status_code=404, detail="Announcement not found")
    doc = payload.model_dump()
    await db.announcements.update_one({"id": ann_id}, {"$set": doc})
    await audit(user, "update", "announcement", ann_id, f"Updated announcement {payload.title}")
    return await db.announcements.find_one({"id": ann_id}, {"_id": 0})


# =========================================================================
# REPORTS
# =========================================================================
@router.get("/reports")
async def reports(user=Staff, start: Optional[str] = None, end: Optional[str] = None):
    enquiries = await db.enquiries.find({}, {"_id": 0}).to_list(10000)
    if start:
        enquiries = [e for e in enquiries if (e.get("created_at") or "")[:10] >= start]
    if end:
        enquiries = [e for e in enquiries if (e.get("created_at") or "")[:10] <= end]
    converted = [e for e in enquiries if e.get("status") == "converted"]
    conv_rate = round(len(converted) * 100 / len(enquiries), 1) if enquiries else 0

    pays = await db.payments.find({"reversed": {"$ne": True}}, {"_id": 0}).to_list(10000)
    if start:
        pays = [p for p in pays if (p.get("created_at") or "")[:10] >= start]
    if end:
        pays = [p for p in pays if (p.get("created_at") or "")[:10] <= end]
    collected = sum(p["amount"] for p in pays)
    by_method = {}
    for p in pays:
        by_method[p["method"]] = by_method.get(p["method"], 0) + p["amount"]

    att = await db.attendance.find({}, {"_id": 0}).to_list(20000)
    present = sum(1 for a in att if a["status"] in ("present", "late"))
    att_rate = round(present * 100 / len(att), 1) if att else 0

    source_counts = {}
    for e in enquiries:
        source_counts[e.get("source", "website")] = source_counts.get(e.get("source", "website"), 0) + 1

    return {
        "enquiries": {"total": len(enquiries), "converted": len(converted), "conversion_rate": conv_rate,
                      "by_source": [{"source": k, "count": v} for k, v in source_counts.items()]},
        "fees": {"collected": round(collected, 2), "payments": len(pays),
                 "by_method": [{"method": k, "amount": round(v, 2)} for k, v in by_method.items()]},
        "attendance": {"records": len(att), "present": present, "rate": att_rate},
    }


# =========================================================================
# STAFF & ROLES (super_admin only)
# =========================================================================
@router.get("/staff")
async def list_staff(user=Super):
    return await db.users.find(
        {"role": {"$in": ["admin", "super_admin", "teacher"]}},
        {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(200)


@router.post("/staff")
async def create_staff(payload: StaffIn, user=Super):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    if payload.role not in ("admin", "teacher", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    doc = {
        "id": gen_id(), "email": email, "name": payload.name, "role": payload.role,
        "phone": payload.phone, "password_hash": hash_password(payload.password or "ChangeMe@123"),
        "auth_provider": "password", "linked_faculty_id": payload.faculty_id,
        "linked_student_id": None, "active": payload.active,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await audit(user, "create", "staff", doc["id"], f"Created {payload.role} account {email}")
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, payload: StaffUpdateIn, user=Super):
    target = await db.users.find_one({"id": staff_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {}
    for k, v in payload.model_dump().items():
        if v is None:
            continue
        if k == "password":
            updates["password_hash"] = hash_password(v)
        else:
            updates[k] = v
    updates["updated_at"] = now_iso()
    await db.users.update_one({"id": staff_id}, {"$set": updates})
    await audit(user, "update", "staff", staff_id, f"Updated account {target['email']}")
    u = await db.users.find_one({"id": staff_id}, {"_id": 0, "password_hash": 0})
    return u


# =========================================================================
# SETTINGS (super_admin only)
# =========================================================================
@router.get("/settings")
async def get_settings(user=Super):
    return await db.settings.find_one({"id": "institute"}, {"_id": 0}) or {}


@router.put("/settings")
async def update_settings(payload: SettingsIn, user=Super):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.settings.update_one({"id": "institute"}, {"$set": updates}, upsert=True)
    await audit(user, "update", "settings", "institute", "Updated institute settings")
    return await db.settings.find_one({"id": "institute"}, {"_id": 0})


# =========================================================================
# AUDIT (super_admin only)
# =========================================================================
@router.get("/audit")
async def get_audit(user=Super, skip: int = 0, limit: int = 50):
    total = await db.audit_logs.count_documents({})
    items = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total}


# =========================================================================
# LOOKUPS (shared dropdown data)
# =========================================================================
@router.get("/lookups")
async def lookups(user=Staff):
    courses = await db.courses.find({"status": {"$ne": "archived"}}, {"_id": 0, "id": 1, "title": 1}).to_list(500)
    batches = await db.batches.find({}, {"_id": 0, "id": 1, "name": 1, "course_id": 1, "capacity": 1}).to_list(500)
    faculty = await db.faculty.find({"active": True}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    staff = await db.users.find({"role": {"$in": ["admin", "super_admin"]}},
                                {"_id": 0, "id": 1, "name": 1}).to_list(200)
    return {"courses": courses, "batches": batches, "faculty": faculty, "staff": staff}
