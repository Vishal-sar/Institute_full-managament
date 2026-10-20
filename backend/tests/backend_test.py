"""EduPrime backend regression suite.

Covers:
- Public: courses, faculty, enquiry, demo booking, contact
- Auth: login all roles, invalid, me
- RBAC: 401 unauth, 403 student->admin, 403 non-super admin->super routes
- Admin: dashboard, courses CRUD, batches, students (CRUD + capacity 409),
  enquiry CRM (update/followup/convert 409), demo-bookings, attendance (idempotent),
  fees overview + installment + payment + reversal + receipt, announcements CRUD,
  reports, staff (super), settings (super), audit (super)
- Portal: student overview/fees/attendance/contact, faculty overview/roster/mark
  attendance, faculty cannot mark unassigned batch (403)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env (file is adjacent in dev container)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass
API = f"{BASE_URL}/api"

SUPER = ("panditkaushal850@gmail.com", "EduPrime@Admin2026")
ADMIN = ("staff@eduprime-demo.com", "Staff@123")
TEACHER = ("teacher@eduprime-demo.com", "Teacher@123")
STUDENT = ("student@eduprime-demo.com", "Student@123")


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="session")
def super_sess():
    s, u = _login(*SUPER)
    assert u["role"] == "super_admin"
    return s


@pytest.fixture(scope="session")
def admin_sess():
    s, u = _login(*ADMIN)
    assert u["role"] == "admin"
    return s


@pytest.fixture(scope="session")
def teacher_sess():
    s, u = _login(*TEACHER)
    assert u["role"] == "teacher"
    return s, u


@pytest.fixture(scope="session")
def student_sess():
    s, u = _login(*STUDENT)
    assert u["role"] == "student"
    return s, u


# ---------------- Public ----------------
class TestPublic:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=20)
        assert r.status_code == 200

    def test_settings(self):
        r = requests.get(f"{API}/settings", timeout=20)
        assert r.status_code == 200

    def test_courses_list(self):
        r = requests.get(f"{API}/courses", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_courses_filter(self):
        r = requests.get(f"{API}/courses?level=Beginner&search=math", timeout=20)
        assert r.status_code == 200

    def test_course_categories(self):
        r = requests.get(f"{API}/courses/meta/categories", timeout=20)
        assert r.status_code == 200
        assert "categories" in r.json()

    def test_course_detail(self):
        courses = requests.get(f"{API}/courses", timeout=20).json()
        assert courses, "No courses seeded"
        slug = courses[0]["slug"]
        r = requests.get(f"{API}/courses/{slug}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "faculty" in d and "batches" in d

    def test_course_detail_404(self):
        r = requests.get(f"{API}/courses/does-not-exist-xyz", timeout=20)
        assert r.status_code == 404

    def test_faculty_list(self):
        r = requests.get(f"{API}/faculty", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_faculty_detail(self):
        fac = requests.get(f"{API}/faculty", timeout=20).json()
        assert fac, "No faculty seeded"
        slug = fac[0]["slug"]
        r = requests.get(f"{API}/faculty/{slug}", timeout=20)
        assert r.status_code == 200
        assert "courses" in r.json()

    def test_upcoming_batches(self):
        r = requests.get(f"{API}/batches/upcoming", timeout=20)
        assert r.status_code == 200

    def test_announcements_public(self):
        r = requests.get(f"{API}/announcements/public", timeout=20)
        assert r.status_code == 200

    def test_demo_slots(self):
        r = requests.get(f"{API}/demo-slots", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_enquiry_without_consent(self):
        courses = requests.get(f"{API}/courses", timeout=20).json()
        cid = courses[0]["id"]
        r = requests.post(f"{API}/enquiries", json={
            "name": "TEST No Consent", "phone": f"9{uuid.uuid4().int % 1000000000:09d}",
            "course_id": cid, "consent": False,
        }, timeout=20)
        assert r.status_code == 400

    def test_enquiry_flow_and_duplicate(self):
        courses = requests.get(f"{API}/courses", timeout=20).json()
        cid = courses[0]["id"]
        phone = f"9{uuid.uuid4().int % 1000000000:09d}"
        payload = {"name": "TEST Enquiry", "phone": phone, "email": "test_enq@example.com",
                   "course_id": cid, "consent": True, "source": "website"}
        r1 = requests.post(f"{API}/enquiries", json=payload, timeout=20)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1.get("reference", "").startswith("ENQ-")
        # duplicate within 10 min
        r2 = requests.post(f"{API}/enquiries", json=payload, timeout=20)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("duplicate") is True
        assert d2["reference"] == d1["reference"]

    def test_demo_booking_flow(self):
        slots = requests.get(f"{API}/demo-slots", timeout=20).json()
        if not slots:
            pytest.skip("No demo slots seeded")
        slot = next((s for s in slots if s.get("available", 0) > 0), None)
        if not slot:
            pytest.skip("No available demo slot")
        phone = f"9{uuid.uuid4().int % 1000000000:09d}"
        r = requests.post(f"{API}/demo-bookings", json={
            "name": "TEST Demo", "phone": phone, "course_id": slot["course_id"],
            "slot_id": slot["id"], "consent": True,
        }, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("reference", "").startswith("DEMO-")
        assert d.get("status") == "pending"

    def test_demo_booking_no_consent(self):
        slots = requests.get(f"{API}/demo-slots", timeout=20).json()
        if not slots:
            pytest.skip("No demo slots")
        slot = slots[0]
        r = requests.post(f"{API}/demo-bookings", json={
            "name": "TEST", "phone": "9000000000", "course_id": slot["course_id"],
            "slot_id": slot["id"], "consent": False,
        }, timeout=20)
        assert r.status_code == 400

    def test_contact(self):
        r = requests.post(f"{API}/contact", json={
            "name": "TEST Contact", "email": "test_contact@example.com",
            "phone": "9000000000", "message": "Hello",
        }, timeout=20)
        assert r.status_code == 200


# ---------------- Auth / RBAC ----------------
class TestAuth:
    def test_login_super(self):
        _, u = _login(*SUPER)
        assert u["role"] == "super_admin"

    def test_login_admin(self):
        _, u = _login(*ADMIN)
        assert u["role"] == "admin"

    def test_login_teacher(self):
        _, u = _login(*TEACHER)
        assert u["role"] == "teacher"
        assert u.get("linked_faculty_id")

    def test_login_student(self):
        _, u = _login(*STUDENT)
        assert u["role"] == "student"
        assert u.get("linked_student_id")

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": SUPER[0], "password": "WRONGPASS"}, timeout=20)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_me_authenticated(self, super_sess):
        r = super_sess.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == SUPER[0].lower()


class TestRBAC:
    def test_dashboard_unauth(self):
        r = requests.get(f"{API}/admin/dashboard", timeout=20)
        assert r.status_code == 401

    def test_student_cannot_access_admin_students(self, student_sess):
        s, _ = student_sess
        r = s.get(f"{API}/admin/students", timeout=20)
        assert r.status_code == 403

    def test_admin_cannot_access_audit(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/audit", timeout=20)
        assert r.status_code == 403

    def test_admin_cannot_access_staff(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/staff", timeout=20)
        assert r.status_code == 403

    def test_admin_cannot_access_settings(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/settings", timeout=20)
        assert r.status_code == 403


# ---------------- Admin modules ----------------
class TestAdminDashboard:
    def test_dashboard(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/dashboard", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "metrics" in d and "charts" in d
        for k in ("active_students", "outstanding", "fees_collected_month"):
            assert k in d["metrics"]

    def test_lookups(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/lookups", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("courses", "batches", "faculty", "staff"):
            assert k in d


class TestAdminCourses:
    def test_courses_list(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/courses", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_update_course(self, admin_sess):
        payload = {"title": f"TEST Course {uuid.uuid4().hex[:6]}",
                   "description": "Test course", "category": "General",
                   "level": "Beginner", "fee_amount": 5000, "status": "published"}
        r = admin_sess.post(f"{API}/admin/courses", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["id"] and c["slug"]
        # verify in list
        lst = admin_sess.get(f"{API}/admin/courses", timeout=20).json()
        assert any(x["id"] == c["id"] for x in lst)
        # update
        payload["title"] = c["title"] + " Updated"
        r2 = admin_sess.put(f"{API}/admin/courses/{c['id']}", json=payload, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["title"].endswith("Updated")


class TestAdminBatches:
    def test_batches_list(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/batches", timeout=20)
        assert r.status_code == 200

    def test_create_batch(self, admin_sess):
        look = admin_sess.get(f"{API}/admin/lookups", timeout=20).json()
        assert look["courses"] and look["faculty"]
        payload = {"name": f"TEST Batch {uuid.uuid4().hex[:6]}", "course_id": look["courses"][0]["id"],
                   "teacher_id": look["faculty"][0]["id"], "days": ["Monday", "Wednesday"],
                   "start_time": "10:00", "end_time": "11:30", "capacity": 2, "mode": "classroom",
                   "location": "Room 1", "status": "active"}
        r = admin_sess.post(f"{API}/admin/batches", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        pytest.batch_id_small = r.json()["id"]
        pytest.batch_course_id = look["courses"][0]["id"]


class TestAdminStudents:
    def test_students_list(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/students?limit=5", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d

    def test_create_student(self, admin_sess):
        look = admin_sess.get(f"{API}/admin/lookups", timeout=20).json()
        cid = look["courses"][0]["id"]
        bid = next((b["id"] for b in look["batches"] if b["course_id"] == cid), None)
        payload = {"name": f"TEST Student {uuid.uuid4().hex[:4]}", "phone": f"9{uuid.uuid4().int % 1000000000:09d}",
                   "course_id": cid, "batch_id": bid, "status": "active"}
        r = admin_sess.post(f"{API}/admin/students", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        pytest.stu_id = r.json()["id"]
        # fetch
        r2 = admin_sess.get(f"{API}/admin/students/{pytest.stu_id}", timeout=20)
        assert r2.status_code == 200
        assert "fees" in r2.json() and "attendance" in r2.json()

    def test_capacity_409(self, admin_sess):
        # Create a dedicated tiny-capacity batch so this test is self-contained
        look = admin_sess.get(f"{API}/admin/lookups", timeout=20).json()
        cid = look["courses"][0]["id"]
        fid = look["faculty"][0]["id"]
        br = admin_sess.post(f"{API}/admin/batches", json={
            "name": f"TEST Cap {uuid.uuid4().hex[:6]}", "course_id": cid,
            "teacher_id": fid, "days": ["Monday"], "start_time": "10:00",
            "end_time": "11:00", "capacity": 1, "mode": "classroom",
            "location": "RoomCap", "status": "active"}, timeout=20)
        assert br.status_code == 200, br.text
        bid = br.json()["id"]
        for _ in range(3):
            payload = {"name": f"TEST CapFill {uuid.uuid4().hex[:4]}",
                       "phone": f"9{uuid.uuid4().int % 1000000000:09d}",
                       "course_id": cid, "batch_id": bid, "status": "active"}
            r = admin_sess.post(f"{API}/admin/students", json=payload, timeout=20)
            if r.status_code == 409:
                return
            assert r.status_code == 200, r.text
        pytest.fail("Expected 409 for batch capacity")


class TestFees:
    def test_fees_overview(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/fees/overview", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d and "students" in d

    def test_installment_payment_reverse_receipt(self, admin_sess):
        sid = getattr(pytest, "stu_id", None)
        if not sid:
            pytest.skip("No student created")
        # add installment
        r = admin_sess.post(f"{API}/admin/installments",
                            json={"student_id": sid, "label": "TEST Inst", "amount": 1000}, timeout=20)
        assert r.status_code == 200
        inst = r.json()
        # before paid
        before = admin_sess.get(f"{API}/admin/students/{sid}", timeout=20).json()["fees"]
        out0 = before["outstanding"]
        # payment
        rp = admin_sess.post(f"{API}/admin/payments",
                             json={"student_id": sid, "installment_id": inst["id"],
                                   "amount": 500, "method": "cash"}, timeout=20)
        assert rp.status_code == 200
        pay = rp.json()
        after = admin_sess.get(f"{API}/admin/students/{sid}", timeout=20).json()["fees"]
        assert after["outstanding"] < out0, f"Outstanding did not decrease: {out0} -> {after['outstanding']}"
        # receipt
        rr = admin_sess.get(f"{API}/admin/payments/{pay['id']}/receipt", timeout=20)
        assert rr.status_code == 200
        # reverse
        rv = admin_sess.post(f"{API}/admin/payments/{pay['id']}/reverse", timeout=20)
        assert rv.status_code == 200
        after2 = admin_sess.get(f"{API}/admin/students/{sid}", timeout=20).json()["fees"]
        assert after2["outstanding"] >= out0 - 0.01, "Outstanding did not revert"
        # idempotent reverse → 409
        rv2 = admin_sess.post(f"{API}/admin/payments/{pay['id']}/reverse", timeout=20)
        assert rv2.status_code == 409


class TestEnquiryCRM:
    def test_list_and_update(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/enquiries?limit=5", timeout=20)
        assert r.status_code == 200
        items = r.json()["items"]
        if not items:
            pytest.skip("No enquiries")
        eid = items[0]["id"]
        up = admin_sess.put(f"{API}/admin/enquiries/{eid}",
                            json={"status": "contacted"}, timeout=20)
        assert up.status_code == 200
        # follow-up persists
        fu = admin_sess.post(f"{API}/admin/enquiries/{eid}/followup",
                             json={"note": "TEST note", "next_date": "2026-02-01"}, timeout=20)
        assert fu.status_code == 200
        notes = fu.json()["notes"]
        assert any(n["note"] == "TEST note" for n in notes)

    def test_convert_and_duplicate_409(self, admin_sess):
        # pick a new, un-converted enquiry
        items = admin_sess.get(f"{API}/admin/enquiries?limit=50", timeout=20).json()["items"]
        target = next((e for e in items if not e.get("converted_student_id")), None)
        if not target:
            pytest.skip("No un-converted enquiry")
        look = admin_sess.get(f"{API}/admin/lookups", timeout=20).json()
        cid = look["courses"][0]["id"]
        bid = next((b["id"] for b in look["batches"] if b["course_id"] == cid), None)
        r = admin_sess.post(f"{API}/admin/enquiries/{target['id']}/convert",
                            json={"course_id": cid, "batch_id": bid, "fee_total": 1000}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("student_id")
        # convert again -> 409
        r2 = admin_sess.post(f"{API}/admin/enquiries/{target['id']}/convert",
                             json={"course_id": cid, "batch_id": bid}, timeout=20)
        assert r2.status_code == 409


class TestDemoBookings:
    def test_list_and_update_status(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/demo-bookings", timeout=20)
        assert r.status_code == 200
        lst = r.json()
        if not lst:
            pytest.skip("No bookings")
        bid = lst[0]["id"]
        up = admin_sess.put(f"{API}/admin/demo-bookings/{bid}?status=confirmed", timeout=20)
        assert up.status_code == 200
        assert up.json()["status"] == "confirmed"


class TestAttendance:
    def test_attendance_idempotent(self, admin_sess):
        # pick a batch that has students
        batches = admin_sess.get(f"{API}/admin/batches", timeout=20).json()
        target = next((b for b in batches if b.get("enrolled_count", 0) > 0), None)
        if not target:
            pytest.skip("No batch with students")
        roster = admin_sess.get(
            f"{API}/admin/attendance?batch_id={target['id']}&session_date=2026-01-15",
            timeout=20).json()
        entries = [{"student_id": s["student_id"], "status": "present"} for s in roster["roster"]]
        r1 = admin_sess.post(f"{API}/admin/attendance", json={
            "batch_id": target["id"], "session_date": "2026-01-15", "entries": entries,
        }, timeout=20)
        assert r1.status_code == 200
        # re-mark different status, must update, not duplicate
        for e in entries:
            e["status"] = "absent"
        r2 = admin_sess.post(f"{API}/admin/attendance", json={
            "batch_id": target["id"], "session_date": "2026-01-15", "entries": entries,
        }, timeout=20)
        assert r2.status_code == 200
        again = admin_sess.get(
            f"{API}/admin/attendance?batch_id={target['id']}&session_date=2026-01-15",
            timeout=20).json()
        statuses = {r["status"] for r in again["roster"]}
        assert statuses == {"absent"}, f"Expected all absent, got {statuses}"


class TestAnnouncements:
    def test_create_and_update(self, admin_sess):
        r = admin_sess.post(f"{API}/admin/announcements", json={
            "title": f"TEST Ann {uuid.uuid4().hex[:4]}", "body": "Hello", "audience": "all",
        }, timeout=20)
        assert r.status_code == 200
        aid = r.json()["id"]
        u = admin_sess.put(f"{API}/admin/announcements/{aid}", json={
            "title": "TEST Ann Updated", "body": "Body2", "audience": "students",
        }, timeout=20)
        assert u.status_code == 200
        assert u.json()["title"] == "TEST Ann Updated"


class TestReports:
    def test_reports(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/reports", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("enquiries", "fees", "attendance"):
            assert k in d
        assert "conversion_rate" in d["enquiries"]
        assert "by_method" in d["fees"]
        assert "rate" in d["attendance"]


class TestSuperAdmin:
    def test_staff_crud(self, super_sess):
        email = f"test_staff_{uuid.uuid4().hex[:6]}@example.com"
        r = super_sess.post(f"{API}/admin/staff", json={
            "name": "TEST Staff", "email": email, "password": "StaffPwd@123", "role": "admin",
        }, timeout=20)
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        u = super_sess.put(f"{API}/admin/staff/{uid}", json={"name": "TEST Staff Updated"}, timeout=20)
        assert u.status_code == 200
        assert u.json()["name"] == "TEST Staff Updated"
        # duplicate email -> 409
        r2 = super_sess.post(f"{API}/admin/staff", json={
            "name": "Dup", "email": email, "password": "x", "role": "admin",
        }, timeout=20)
        assert r2.status_code == 409

    def test_settings(self, super_sess):
        r = super_sess.get(f"{API}/admin/settings", timeout=20)
        assert r.status_code == 200
        orig_name = (r.json() or {}).get("name")
        new_name = f"EduPrime TEST {uuid.uuid4().hex[:4]}"
        u = super_sess.put(f"{API}/admin/settings", json={"name": new_name}, timeout=20)
        assert u.status_code == 200
        assert u.json()["name"] == new_name
        # restore
        if orig_name:
            super_sess.put(f"{API}/admin/settings", json={"name": orig_name}, timeout=20)

    def test_audit(self, super_sess):
        r = super_sess.get(f"{API}/admin/audit?limit=5", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d
        assert d["total"] >= 1  # we've been auditing throughout tests


# ---------------- Portals ----------------
class TestStudentPortal:
    def test_overview(self, student_sess):
        s, _ = student_sess
        r = s.get(f"{API}/portal/student/overview", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("student", "schedule", "fees", "attendance", "announcements"):
            assert k in d

    def test_fees(self, student_sess):
        s, _ = student_sess
        r = s.get(f"{API}/portal/student/fees", timeout=20)
        assert r.status_code == 200

    def test_attendance(self, student_sess):
        s, _ = student_sess
        r = s.get(f"{API}/portal/student/attendance", timeout=20)
        assert r.status_code == 200

    def test_update_contact(self, student_sess):
        s, _ = student_sess
        r = s.put(f"{API}/portal/student/contact", json={"phone": "9000011111"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["phone"] == "9000011111"


class TestFacultyPortal:
    def test_overview(self, teacher_sess):
        s, _ = teacher_sess
        r = s.get(f"{API}/portal/faculty/overview", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "batches" in d

    def test_roster_and_mark_assigned(self, teacher_sess):
        s, _ = teacher_sess
        batches = s.get(f"{API}/portal/faculty/overview", timeout=20).json()["batches"]
        if not batches:
            pytest.skip("Teacher has no assigned batches")
        b = batches[0]
        r = s.get(f"{API}/portal/faculty/batches/{b['id']}/roster?session_date=2026-01-16", timeout=20)
        assert r.status_code == 200
        roster = r.json()["roster"]
        entries = [{"student_id": st["student_id"], "status": "present"} for st in roster]
        mr = s.post(f"{API}/portal/faculty/attendance", json={
            "batch_id": b["id"], "session_date": "2026-01-16", "entries": entries,
        }, timeout=20)
        assert mr.status_code == 200

    def test_cannot_mark_unassigned_batch(self, teacher_sess, admin_sess):
        s, teacher_user = teacher_sess
        batches = admin_sess.get(f"{API}/admin/batches", timeout=20).json()
        tfid = teacher_user.get("linked_faculty_id")
        foreign = next((b for b in batches if b.get("teacher_id") and b.get("teacher_id") != tfid), None)
        if not foreign:
            pytest.skip("No foreign batch")
        r = s.get(f"{API}/portal/faculty/batches/{foreign['id']}/roster", timeout=20)
        assert r.status_code == 403
        mr = s.post(f"{API}/portal/faculty/attendance", json={
            "batch_id": foreign["id"], "session_date": "2026-01-16",
            "entries": [{"student_id": "x", "status": "present"}],
        }, timeout=20)
        assert mr.status_code == 403

    def test_update_profile(self, teacher_sess):
        s, _ = teacher_sess
        r = s.put(f"{API}/portal/faculty/profile", json={"bio": "TEST updated bio"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["bio"] == "TEST updated bio"
