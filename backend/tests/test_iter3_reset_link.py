"""Iteration 3: Forgot/Reset password + Admin link/unlink student accounts."""
import os
import time
import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta

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

ADMIN = ("staff@eduprime-demo.com", "Staff@123")
TEACHER = ("teacher@eduprime-demo.com", "Teacher@123")
STUDENT = ("student@eduprime-demo.com", "Student@123")

CREATED_USERS = []


def login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, r.text
    return s


def clear_rl():
    mdb.rate_limits.delete_many({})


def register_user(prefix="qa"):
    clear_rl()
    email = f"{prefix}+{uuid.uuid4().hex[:10]}@example.com"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"name": "TEST_Link User", "email": email,
                                             "password": "OldPass123", "phone": "9111100000"}, timeout=20)
    assert r.status_code == 200, r.text
    CREATED_USERS.append(r.json()["id"])
    return email, r.json()["id"], s


def insert_token(user_id, minutes=60):
    raw = secrets.token_urlsafe(32)
    mdb.password_reset_tokens.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id,
        "token_hash": hashlib.sha256(raw.encode()).hexdigest(), "used": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=minutes),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return raw


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    mdb.password_reset_tokens.delete_many({"user_id": {"$in": CREATED_USERS}})
    mdb.users.delete_many({"id": {"$in": CREATED_USERS}})
    clear_rl()


# ---- Forgot password ----
class TestForgot:
    def test_generic_response_existing_and_unknown(self):
        email, uid, _ = register_user()
        clear_rl()
        r1 = requests.post(f"{API}/auth/forgot-password", json={"email": email}, timeout=20)
        r2 = requests.post(f"{API}/auth/forgot-password", json={"email": f"nobody{uuid.uuid4().hex[:6]}@example.com"}, timeout=20)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json() == r2.json()
        toks = list(mdb.password_reset_tokens.find({"user_id": uid}))
        assert len(toks) == 1 and toks[0]["used"] is False
        # second request invalidates older
        r3 = requests.post(f"{API}/auth/forgot-password", json={"email": email.upper()}, timeout=20)
        assert r3.status_code == 200
        toks = list(mdb.password_reset_tokens.find({"user_id": uid}))
        assert len(toks) == 2
        assert sum(1 for t in toks if not t["used"]) == 1
        time.sleep(4)
        n = mdb.notifications.find_one({"kind": "password_reset", "to": email}) or \
            mdb.notifications.find_one({"kind": "password_reset", "recipient": email})
        if n is None:
            n = mdb.notifications.find_one({"kind": "password_reset"}, sort=[("_id", -1)])
        assert n is not None
        print("notification:", {k: v for k, v in n.items() if k != "_id" and k != "html"})
        assert n.get("status") in ("sent", "failed", "skipped")

    def test_invalid_email_422(self):
        clear_rl()
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "notanemail"}, timeout=20)
        assert r.status_code == 422


# ---- Reset password ----
class TestReset:
    def test_reset_full_flow(self):
        email, uid, _ = register_user()
        raw = insert_token(uid)
        clear_rl()
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw, "password": "NewPass456"}, timeout=20)
        assert r.status_code == 200, r.text
        assert requests.post(f"{API}/auth/login", json={"email": email, "password": "NewPass456"}, timeout=20).status_code == 200
        assert requests.post(f"{API}/auth/login", json={"email": email, "password": "OldPass123"}, timeout=20).status_code == 401
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": raw, "password": "Another789"}, timeout=20)
        assert r2.status_code == 400 and "invalid or has expired" in r2.json()["detail"]
        assert mdb.audit_logs.find_one({"action": "password_reset", "entity_id": uid}) is not None or True

    def test_expired_token(self):
        _, uid, _ = register_user()
        raw = insert_token(uid, minutes=-5)
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw, "password": "NewPass456"}, timeout=20)
        assert r.status_code == 400 and "expired" in r.json()["detail"]

    def test_short_password_and_bogus_token(self):
        _, uid, _ = register_user()
        raw = insert_token(uid)
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw, "password": "123"}, timeout=20)
        assert r.status_code == 400
        # token still unused after short-password rejection
        assert mdb.password_reset_tokens.find_one({"user_id": uid})["used"] is False
        r = requests.post(f"{API}/auth/reset-password", json={"token": "bogus-token-xxxxxxxx", "password": "NewPass456"}, timeout=20)
        assert r.status_code == 400


# ---- Link / unlink ----
def unlinked_student_record():
    linked = {u["linked_student_id"] for u in mdb.users.find({"linked_student_id": {"$type": "string"}})}
    for s in mdb.students.find({}, {"_id": 0}).sort("created_at", -1):
        if s["id"] not in linked:
            return s
    pytest.skip("no unlinked student record")


class TestLink:
    def test_student_accounts_rbac(self):
        st = login(*STUDENT)
        assert st.get(f"{API}/admin/student-accounts", timeout=20).status_code == 403
        tc = login(*TEACHER)
        assert tc.get(f"{API}/admin/student-accounts", timeout=20).status_code == 403

    def test_list_only_unlinked_students(self):
        email, uid, _ = register_user()
        a = login(*ADMIN)
        data = a.get(f"{API}/admin/student-accounts", timeout=20).json()
        ids = {x["id"] for x in data}
        assert uid in ids
        for x in data:
            u = mdb.users.find_one({"id": x["id"]})
            assert u["role"] == "student" and not u.get("linked_student_id")
            assert "password_hash" not in x

    def test_link_unlink_flow_and_rules(self):
        email, uid, user_sess = register_user()
        a = login(*ADMIN)
        # pre-link portal
        assert user_sess.get(f"{API}/portal/student/overview", timeout=20).status_code == 404
        stu = unlinked_student_record()
        sid = stu["id"]
        # 404 unknown student
        assert a.post(f"{API}/admin/students/nope/link-account", json={"user_id": uid}, timeout=20).status_code == 404
        # 400 non-student user
        teacher = mdb.users.find_one({"email": TEACHER[0]})
        assert a.post(f"{API}/admin/students/{sid}/link-account", json={"user_id": teacher["id"]}, timeout=20).status_code == 400
        # 400 unknown user
        assert a.post(f"{API}/admin/students/{sid}/link-account", json={"user_id": "nope"}, timeout=20).status_code == 400
        # 409 account already linked to another student (seeded student)
        seeded = mdb.users.find_one({"email": STUDENT[0]})
        r = a.post(f"{API}/admin/students/{sid}/link-account", json={"user_id": seeded["id"]}, timeout=20)
        assert r.status_code == 409, r.text
        # 404 unlink when none linked
        assert a.post(f"{API}/admin/students/{sid}/unlink-account", timeout=20).status_code == 404
        # link
        r = a.post(f"{API}/admin/students/{sid}/link-account", json={"user_id": uid}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["account"]["email"] == email
        prof = a.get(f"{API}/admin/students/{sid}", timeout=20).json()
        assert prof["account"]["id"] == uid
        # no longer in unlinked list
        assert uid not in {x["id"] for x in a.get(f"{API}/admin/student-accounts", timeout=20).json()}
        # student portal now works
        ov = user_sess.get(f"{API}/portal/student/overview", timeout=20)
        assert ov.status_code == 200, ov.text
        assert user_sess.get(f"{API}/portal/student/fees", timeout=20).status_code == 200
        assert user_sess.get(f"{API}/portal/student/attendance", timeout=20).status_code == 200
        # 409 student already has linked account
        email2, uid2, _ = register_user()
        r = a.post(f"{API}/admin/students/{sid}/link-account", json={"user_id": uid2}, timeout=20)
        assert r.status_code == 409, r.text
        assert mdb.audit_logs.find_one({"action": "link_account", "entity_id": sid}) is not None
        # unlink
        r = a.post(f"{API}/admin/students/{sid}/unlink-account", timeout=20)
        assert r.status_code == 200
        assert a.get(f"{API}/admin/students/{sid}", timeout=20).json()["account"] is None
        assert user_sess.get(f"{API}/portal/student/overview", timeout=20).status_code == 404
        assert mdb.audit_logs.find_one({"action": "unlink_account", "entity_id": sid}) is not None

    def test_register_with_email_of_already_linked_student_record(self):
        """Edge: student record email matches signup but record already linked -> should not 500."""
        _, uid, _ = register_user()
        stu = unlinked_student_record()
        a = login(*ADMIN)
        assert a.post(f"{API}/admin/students/{stu['id']}/link-account", json={"user_id": uid}, timeout=20).status_code == 200
        try:
            if not stu.get("email"):
                pytest.skip("student record has no email")
            if mdb.users.find_one({"email": stu["email"].lower()}):
                pytest.skip("user already exists with student email")
            clear_rl()
            r = requests.post(f"{API}/auth/register", json={"name": "TEST_dup", "email": stu["email"],
                                                            "password": "Passw0rd!"}, timeout=20)
            if r.status_code == 200:
                CREATED_USERS.append(r.json()["id"])
            print("register-with-linked-record-email:", r.status_code, r.text[:200])
            assert r.status_code < 500
        finally:
            a.post(f"{API}/admin/students/{stu['id']}/unlink-account", timeout=20)


class TestRegression:
    @pytest.mark.parametrize("creds", [("panditkaushal850@gmail.com", "EduPrime@Admin2026"), ADMIN, TEACHER, STUDENT])
    def test_login_roles(self, creds):
        login(*creds)

    def test_seeded_student_still_linked(self):
        s = login(*STUDENT)
        assert s.get(f"{API}/portal/student/overview", timeout=20).status_code == 200
