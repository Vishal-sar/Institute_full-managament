from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from db import db, now_iso, today_str, audit, gen_id
from security import get_current_user
from services import fee_summary, attendance_summary
from models import AttendanceEntry, AttendanceMarkIn, StudentContactIn, FacultyProfileIn

router = APIRouter(prefix="/portal", tags=["portal"])


# =========================================================================
# STUDENT PORTAL
# =========================================================================
async def _student_self(user: dict):
    if user.get("role") not in ("student",) and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Student access only")
    sid = user.get("linked_student_id")
    if not sid:
        raise HTTPException(status_code=404, detail="No student record linked to this account")
    student = await db.students.find_one({"id": sid}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    return student


def _schedule_for(batch):
    if not batch:
        return None
    return {
        "batch_name": batch.get("name"), "days": batch.get("days", []),
        "start_time": batch.get("start_time"), "end_time": batch.get("end_time"),
        "mode": batch.get("mode"), "location": batch.get("location"),
    }


@router.get("/student/overview")
async def student_overview(user: dict = Depends(get_current_user)):
    student = await _student_self(user)
    course = await db.courses.find_one({"id": student.get("course_id")}, {"_id": 0}) if student.get("course_id") else None
    batch = await db.batches.find_one({"id": student.get("batch_id")}, {"_id": 0}) if student.get("batch_id") else None
    anns = await db.announcements.find(
        {"status": "published", "audience": {"$in": ["students", "all"]}},
        {"_id": 0}).sort("publish_date", -1).to_list(20)
    return {
        "student": student,
        "course": course,
        "batch": batch,
        "schedule": _schedule_for(batch),
        "fees": await fee_summary(student["id"]),
        "attendance": await attendance_summary(student["id"]),
        "announcements": anns,
    }


@router.get("/student/attendance")
async def student_attendance(user: dict = Depends(get_current_user)):
    student = await _student_self(user)
    return await attendance_summary(student["id"])


@router.get("/student/fees")
async def student_fees(user: dict = Depends(get_current_user)):
    student = await _student_self(user)
    return await fee_summary(student["id"])


@router.get("/student/payments/{payment_id}/receipt")
async def student_receipt(payment_id: str, user: dict = Depends(get_current_user)):
    student = await _student_self(user)
    p = await db.payments.find_one({"id": payment_id, "student_id": student["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Receipt not found")
    settings = await db.settings.find_one({"id": "institute"}, {"_id": 0})
    course = await db.courses.find_one({"id": student.get("course_id")}, {"_id": 0}) if student.get("course_id") else None
    return {"payment": p, "student": student, "institute": settings,
            "course_title": course["title"] if course else ""}


@router.put("/student/contact")
async def student_update_contact(payload: StudentContactIn, user: dict = Depends(get_current_user)):
    student = await _student_self(user)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = now_iso()
        await db.students.update_one({"id": student["id"]}, {"$set": updates})
    return await db.students.find_one({"id": student["id"]}, {"_id": 0})


# =========================================================================
# FACULTY PORTAL
# =========================================================================
async def _faculty_self(user: dict):
    if user.get("role") not in ("teacher",) and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Faculty access only")
    fid = user.get("linked_faculty_id")
    if not fid:
        raise HTTPException(status_code=404, detail="No faculty profile linked to this account")
    faculty = await db.faculty.find_one({"id": fid}, {"_id": 0})
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return faculty


@router.get("/faculty/overview")
async def faculty_overview(user: dict = Depends(get_current_user)):
    faculty = await _faculty_self(user)
    batches = await db.batches.find({"teacher_id": faculty["id"]}, {"_id": 0}).to_list(200)
    cmap = {c["id"]: c["title"] for c in await db.courses.find({}, {"_id": 0}).to_list(500)}
    weekday = datetime.now(timezone.utc).strftime("%A")
    for b in batches:
        b["course_title"] = cmap.get(b["course_id"], "")
        b["enrolled_count"] = await db.students.count_documents({"batch_id": b["id"], "status": "active"})
        b["today"] = weekday in b.get("days", [])
    anns = await db.announcements.find(
        {"status": "published", "audience": {"$in": ["faculty", "all"]}},
        {"_id": 0}).sort("publish_date", -1).to_list(20)
    return {"faculty": faculty, "batches": batches, "announcements": anns}


@router.get("/faculty/batches/{batch_id}/roster")
async def faculty_roster(batch_id: str, session_date: str = None, user: dict = Depends(get_current_user)):
    faculty = await _faculty_self(user)
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.get("teacher_id") != faculty["id"] and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="You are not assigned to this batch")
    students = await db.students.find({"batch_id": batch_id, "status": "active"}, {"_id": 0}).to_list(500)
    sd = session_date or today_str()
    existing = await db.attendance.find({"batch_id": batch_id, "session_date": sd}, {"_id": 0}).to_list(500)
    emap = {a["student_id"]: a for a in existing}
    roster = [{"student_id": s["id"], "name": s["name"], "student_code": s["student_code"],
               "status": emap.get(s["id"], {}).get("status")} for s in students]
    return {"batch": batch, "roster": roster, "session_date": sd, "marked": len(existing) > 0}


@router.post("/faculty/attendance")
async def faculty_mark_attendance(payload: AttendanceMarkIn, user: dict = Depends(get_current_user)):
    faculty = await _faculty_self(user)
    batch = await db.batches.find_one({"id": payload.batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.get("teacher_id") != faculty["id"] and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="You are not assigned to this batch")
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
                "updated_by": None, "updated_at": None})
        saved += 1
    await audit(user, "attendance", "batch", payload.batch_id,
                f"Faculty marked attendance {payload.session_date} ({saved} students)")
    return {"saved": saved, "message": "Attendance saved"}


@router.put("/faculty/profile")
async def faculty_update_profile(payload: FacultyProfileIn, user: dict = Depends(get_current_user)):
    faculty = await _faculty_self(user)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = now_iso()
        await db.faculty.update_one({"id": faculty["id"]}, {"$set": updates})
    return await db.faculty.find_one({"id": faculty["id"]}, {"_id": 0})
