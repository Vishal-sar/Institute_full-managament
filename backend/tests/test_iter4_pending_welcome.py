"""Iteration 4: Pending sign-ups (suggested_student) + welcome_linked email notifications."""
import os
import time
import uuid

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

STAFF = ("staff@eduprime-demo.com", "Staff@123")
STUDENT = ("student@eduprime-demo.com", "Student@123")
USERS, STUDENTS, EMAILS = [], [], []


def login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, r.text
    return s


def phone():
    return "98" + str(uuid.uuid4().int)[:8]


def register(email=None, ph=None, name="TEST_QA Signup"):
    mdb.rate_limits.delete_many({})
    email = email or f"qa+{uuid.uuid4().hex[:10]}@example.com"
    payload = {"name": name, "email": email, "password": "Pass1234"}
    if ph:
        payload["phone"] = ph
    s = requests.Session()
    t = time.time()
    r = s.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    USERS.append(r.json()["id"]); EMAILS.append(email.lower())
    return r.json(), s, time.time() - t


def make_student(staff, ph, email=None):
    c = mdb.courses.find_one({}, {"_id": 0, "id": 1})
    b = mdb.batches.find_one({"course_id": c["id"]}, {"_id": 0, "id": 1})
    body = {"name": f"TEST_Stu {uuid.uuid4().hex[:5]}", "phone": ph, "course_id": c["id"],
            "batch_id": b["id"] if b else None}
    if email:
        body["email"] = email
    r = staff.post(f"{API}/admin/students", json=body, timeout=20)
    assert r.status_code == 200, r.text
    STUDENTS.append(r.json()["id"])
    return r.json()


def welcome_docs(email, wait=12):
    end = time.time() + wait
    while time.time() < end:
        docs = list(mdb.notifications.find({"kind": "welcome_linked", "to": email.lower()}, {"_id": 0}))
        if docs:
            return docs
        time.sleep(1)
    return []


@pytest.fixture(scope="module")
def staff():
    return login(*STAFF)


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    mdb.users.delete_many({"id": {"$in": USERS}})
    mdb.students.delete_many({"id": {"$in": STUDENTS}})
    mdb.notifications.delete_many({"to": {"$in": EMAILS}})
    mdb.audit_logs.delete_many({"entity_id": {"$in": STUDENTS}})
    mdb.enrollments.delete_many({"student_id": {"$in": STUDENTS}})
    mdb.rate_limits.delete_many({})


# RBAC
def test_student_forbidden(staff):
    s = login(*STUDENT)
    assert s.get(f"{API}/admin/student-accounts").status_code == 403


# Unlinked sign-up without match -> listed, suggested null, no welcome
def test_unmatched_signup_listed_no_welcome(staff):
    u, _, _ = register(ph=phone())
    assert u["linked_student_id"] is None
    accts = staff.get(f"{API}/admin/student-accounts").json()
    a = next((x for x in accts if x["id"] == u["id"]), None)
    assert a is not None and a["suggested_student"] is None
    assert "_id" not in a and "password_hash" not in a
    assert welcome_docs(u["email"], wait=4) == []


# Phone match suggestion + email case-insensitive suggestion, and never suggest linked record
def test_suggestions_and_quick_link_welcome(staff):
    ph = phone()
    st = make_student(staff, ph)
    u, us, _ = register(ph=ph)
    accts = staff.get(f"{API}/admin/student-accounts").json()
    a = next(x for x in accts if x["id"] == u["id"])
    assert a["suggested_student"] == {"id": st["id"], "name": st["name"], "student_code": st["student_code"]}
    # email case-insensitive suggestion: student email uppercase variant, user signs up lowercase via different path
    em = f"qa+ci{uuid.uuid4().hex[:8]}@example.com"
    st2 = make_student(staff, phone(), email=em.upper().replace("@EXAMPLE.COM", "@example.com"))
    stored = mdb.students.find_one({"id": st2["id"]})["email"]
    # create unlinked user directly (register would auto-link exact match)
    uid = uuid.uuid4().hex
    mdb.users.insert_one({"id": uid, "email": em, "name": "TEST_CI", "role": "student", "phone": None,
                          "linked_student_id": None, "active": True, "created_at": "2026-01-01T00:00:00+00:00"})
    USERS.append(uid); EMAILS.append(em)
    accts = staff.get(f"{API}/admin/student-accounts").json()
    ci = next(x for x in accts if x["id"] == uid)
    if stored != em:
        assert ci["suggested_student"] and ci["suggested_student"]["id"] == st2["id"], stored
    # quick link (time it)
    t = time.time()
    r = staff.post(f"{API}/admin/students/{st['id']}/link-account", json={"user_id": u["id"]})
    dt = time.time() - t
    assert r.status_code == 200, r.text
    assert dt < 5, f"link slow {dt}"
    accts = staff.get(f"{API}/admin/student-accounts").json()
    assert all(x["id"] != u["id"] for x in accts)
    docs = welcome_docs(u["email"])
    assert len(docs) == 1 and docs[0]["status"] in ("sent", "failed", "skipped"), docs
    # student portal sees data
    me = us.get(f"{API}/auth/me").json()
    assert me["linked_student_id"] == st["id"]
    prof = staff.get(f"{API}/admin/students/{st['id']}").json()
    assert prof["account"]["id"] == u["id"]
    # another sign-up with same phone must NOT get the already-linked record suggested
    u2, _, _ = register(ph=ph)
    accts = staff.get(f"{API}/admin/student-accounts").json()
    a2 = next(x for x in accts if x["id"] == u2["id"])
    assert a2["suggested_student"] is None
    # linking u2 to the already-linked student -> 409
    r = staff.post(f"{API}/admin/students/{st['id']}/link-account", json={"user_id": u2["id"]})
    assert r.status_code == 409
    assert welcome_docs(u2["email"], wait=3) == []


# Auto-link on sign-up with matching email -> welcome
def test_autolink_signup_sends_welcome(staff):
    em = f"qa+auto{uuid.uuid4().hex[:8]}@example.com"
    st = make_student(staff, phone(), email=em)
    u, _, dt = register(email=em)
    assert u["linked_student_id"] == st["id"]
    assert dt < 8, f"register slow {dt}"
    docs = welcome_docs(em)
    assert len(docs) == 1, docs
    print("welcome status:", docs[0]["status"], docs[0].get("reason"))


# Choose-student flow via detail-page style link + unlink regression
def test_link_unlink_regression(staff):
    st = make_student(staff, phone())
    u, _, _ = register(ph=phone())
    r = staff.post(f"{API}/admin/students/{st['id']}/link-account", json={"user_id": u["id"]})
    assert r.status_code == 200
    assert len(welcome_docs(u["email"])) == 1
    r = staff.post(f"{API}/admin/students/{st['id']}/unlink-account")
    assert r.status_code == 200
    accts = staff.get(f"{API}/admin/student-accounts").json()
    a = next(x for x in accts if x["id"] == u["id"])
    # unlinked record with no matching phone/email -> no suggestion
    assert a["suggested_student"] is None


def test_search_special_chars(staff):
    r = staff.get(f"{API}/admin/students", params={"search": "(", "limit": 8})
    assert r.status_code in (200, 400), r.status_code


@pytest.mark.parametrize("creds", [("panditkaushal850@gmail.com", "EduPrime@Admin2026"), STAFF,
                                   ("teacher@eduprime-demo.com", "Teacher@123"), STUDENT])
def test_login_roles(creds):
    login(*creds)


def test_seeded_student_still_linked():
    u = mdb.users.find_one({"email": "student@eduprime-demo.com"})
    assert u["linked_student_id"]
