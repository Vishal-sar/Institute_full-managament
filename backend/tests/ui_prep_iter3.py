"""Helper: create a fresh self-signup student + a valid reset token for UI testing. Prints JSON."""
import os, json, uuid, hashlib, secrets, requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
mdb.rate_limits.delete_many({})
base = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0].rstrip("/")
email = f"qa+ui{uuid.uuid4().hex[:8]}@example.com"
r = requests.post(f"{base}/api/auth/register", json={"name": "TEST_UI Student", "email": email,
                                                     "password": "OldPass123", "phone": "9222200000"})
uid = r.json()["id"]
raw = secrets.token_urlsafe(32)
mdb.password_reset_tokens.insert_one({"id": str(uuid.uuid4()), "user_id": uid,
    "token_hash": hashlib.sha256(raw.encode()).hexdigest(), "used": False,
    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=60),
    "created_at": datetime.now(timezone.utc).isoformat()})
linked = {u["linked_student_id"] for u in mdb.users.find({"linked_student_id": {"$type": "string"}})}
stu = next(s for s in mdb.students.find({}, {"_id": 0}).sort("created_at", -1) if s["id"] not in linked)
print(json.dumps({"email": email, "uid": uid, "token": raw, "student_id": stu["id"], "student_name": stu["name"]}))
