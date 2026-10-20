"""Iteration 2 focused tests:
1. New /api/auth/register endpoint (student self-signup)
2. OptionalEmailStr fix: empty email string accepted for enquiries/demo-bookings
3. Login still works, student 403 on admin
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"

SUPER = ("panditkaushal850@gmail.com", "EduPrime@Admin2026")
ADMIN = ("staff@eduprime-demo.com", "Staff@123")
TEACHER = ("teacher@eduprime-demo.com", "Teacher@123")
STUDENT = ("student@eduprime-demo.com", "Student@123")


# ------------- NEW: /auth/register -------------
class TestRegister:
    def _email(self):
        return f"qa+{uuid.uuid4().hex[:10]}@example.com"

    def test_register_new_student(self):
        s = requests.Session()
        email = self._email()
        r = s.post(f"{API}/auth/register", json={
            "name": "QA Signup", "email": email, "phone": "9000012345",
            "password": "Passw0rd!",
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "student"
        assert data["email"] == email.lower()
        # cookies set
        assert any(c.name == "access_token" for c in s.cookies), f"No access_token cookie set: {s.cookies}"
        # /me works -> logged in
        me = s.get(f"{API}/auth/me", timeout=20)
        assert me.status_code == 200
        assert me.json()["role"] == "student"

    def test_register_duplicate_409(self):
        s = requests.Session()
        email = self._email()
        payload = {"name": "QA Dup", "email": email, "phone": "9000012345",
                   "password": "Passw0rd!"}
        r1 = s.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r1.status_code == 200
        # New session; try again
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r2.status_code == 409
        assert "exist" in (r2.json().get("detail", "") or "").lower() or r2.json().get("detail")

    def test_register_short_password_400(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={
            "name": "QA Short", "email": self._email(), "phone": "9000012345",
            "password": "abc",
        }, timeout=20)
        # Could be 400 (our explicit check) or 422 (pydantic min_length).
        assert r.status_code in (400, 422), r.text

    def test_register_invalid_email_422(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={
            "name": "QA Bad", "email": "not-an-email", "phone": "900001",
            "password": "Passw0rd!",
        }, timeout=20)
        assert r.status_code == 422

    def test_registered_user_can_login_again(self):
        s = requests.Session()
        email = self._email()
        pw = "Passw0rd!"
        r = s.post(f"{API}/auth/register", json={
            "name": "QA Relogin", "email": email, "phone": "9000012345",
            "password": pw,
        }, timeout=20)
        assert r.status_code == 200
        # fresh session login
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["role"] == "student"

    def test_registered_student_cannot_access_admin(self):
        s = requests.Session()
        email = self._email()
        pw = "Passw0rd!"
        r = s.post(f"{API}/auth/register", json={
            "name": "QA RBAC", "email": email, "phone": "9000012345", "password": pw,
        }, timeout=20)
        assert r.status_code == 200
        r2 = s.get(f"{API}/admin/students", timeout=20)
        assert r2.status_code == 403


# ------------- Enquiry with blank email (regression fix) -------------
class TestEnquiryBlankEmail:
    def test_enquiry_blank_email_accepted(self):
        courses = requests.get(f"{API}/courses", timeout=20).json()
        cid = courses[0]["id"]
        phone = f"9{uuid.uuid4().int % 1000000000:09d}"
        r = requests.post(f"{API}/enquiries", json={
            "name": "TEST Blank Email", "phone": phone, "email": "",
            "course_id": cid, "consent": True, "source": "website",
        }, timeout=20)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("reference", "").startswith("ENQ-")

    def test_enquiry_valid_email_still_works(self):
        courses = requests.get(f"{API}/courses", timeout=20).json()
        cid = courses[0]["id"]
        phone = f"9{uuid.uuid4().int % 1000000000:09d}"
        r = requests.post(f"{API}/enquiries", json={
            "name": "TEST With Email", "phone": phone,
            "email": f"qa_enq_{uuid.uuid4().hex[:6]}@example.com",
            "course_id": cid, "consent": True,
        }, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("reference", "").startswith("ENQ-")

    def test_enquiry_omitted_email_works(self):
        courses = requests.get(f"{API}/courses", timeout=20).json()
        cid = courses[0]["id"]
        phone = f"9{uuid.uuid4().int % 1000000000:09d}"
        r = requests.post(f"{API}/enquiries", json={
            "name": "TEST Omit Email", "phone": phone,
            "course_id": cid, "consent": True,
        }, timeout=20)
        assert r.status_code == 200, r.text


# ------------- Demo booking blank email -------------
class TestDemoBookingBlankEmail:
    def test_demo_booking_blank_email(self):
        slots = requests.get(f"{API}/demo-slots", timeout=20).json()
        if not slots:
            pytest.skip("No demo slots")
        slot = next((s for s in slots if s.get("available", 0) > 0), slots[0])
        phone = f"9{uuid.uuid4().int % 1000000000:09d}"
        r = requests.post(f"{API}/demo-bookings", json={
            "name": "TEST Demo BlankEmail", "phone": phone, "email": "",
            "course_id": slot["course_id"], "slot_id": slot["id"], "consent": True,
        }, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("reference", "").startswith("DEMO-")


# ------------- Quick login regression -------------
@pytest.mark.parametrize("creds,expected_role", [
    (SUPER, "super_admin"), (ADMIN, "admin"),
    (TEACHER, "teacher"), (STUDENT, "student"),
])
def test_login_all_roles(creds, expected_role):
    r = requests.post(f"{API}/auth/login",
                      json={"email": creds[0], "password": creds[1]}, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["role"] == expected_role


def test_login_wrong_password_returns_401_json():
    r = requests.post(f"{API}/auth/login",
                      json={"email": STUDENT[0], "password": "WRONG!!!"}, timeout=20)
    assert r.status_code == 401
    d = r.json()
    assert "detail" in d
