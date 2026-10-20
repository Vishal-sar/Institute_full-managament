"""UI prep for iteration 4: create 1 suggested-match signup + 1 unmatched signup. Run with 'cleanup' arg to remove."""
import sys, json, uuid
sys.path.insert(0, "/app/backend/tests")
import test_iter4_pending_welcome as t

if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
    ids = json.load(open("/tmp/iter4_ui.json"))
    t.mdb.users.delete_many({"id": {"$in": ids["users"]}})
    t.mdb.students.delete_many({"id": {"$in": ids["students"]}})
    t.mdb.notifications.delete_many({"to": {"$in": ids["emails"]}})
    t.mdb.audit_logs.delete_many({"entity_id": {"$in": ids["students"]}})
    t.mdb.enrollments.delete_many({"student_id": {"$in": ids["students"]}})
    t.mdb.rate_limits.delete_many({})
    print("cleaned")
    sys.exit()

staff = t.login(*t.STAFF)
ph = t.phone()
st = t.make_student(staff, ph)
st_pick = t.make_student(staff, t.phone())
u1, _, _ = t.register(ph=ph, name="TEST_Suggested Signup")
u2, _, _ = t.register(ph=t.phone(), name="TEST_Unmatched Signup")
seeded = t.mdb.users.find_one({"email": "student@eduprime-demo.com"})["linked_student_id"]
seeded_code = t.mdb.students.find_one({"id": seeded})["student_code"]
out = {"users": t.USERS, "students": t.STUDENTS, "emails": t.EMAILS, "u1": u1, "u2": u2, "st": st,
       "st_pick": st_pick, "seeded_student": seeded, "seeded_code": seeded_code, "u1pw": "Pass1234"}
json.dump(out, open("/tmp/iter4_ui.json", "w"), default=str)
print(json.dumps({"u1": u1["id"], "u1email": u1["email"], "u2": u2["id"], "st": st["id"], "st_name": st["name"],
                  "st_code": st["student_code"], "st_pick": st_pick["id"], "st_pick_code": st_pick["student_code"],
                  "seeded": seeded, "seeded_code": seeded_code}))
