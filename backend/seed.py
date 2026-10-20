import os
import random
import logging
from datetime import datetime, timezone, timedelta

from db import db, gen_id, now_iso
from security import hash_password

logger = logging.getLogger(__name__)
random.seed(42)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _slug(t):
    import re
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def _date(offset_days):
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).strftime("%Y-%m-%d")


SETTINGS = {
    "id": "institute",
    "name": "EduPrime Academy",
    "tagline": "Where Ambition Meets Academic Excellence",
    "about": "EduPrime Academy is a premium coaching institute helping students excel in competitive examinations, academics, and skill-based programs. This is demonstration content — replace with your institute's verified information before launch.",
    "mission": "To make high-quality, mentor-led education accessible through structured programs, measurable progress, and a supportive learning environment.",
    "methodology": "Small batch sizes, concept-first teaching, weekly assessments, doubt-clearing sessions, and continuous performance tracking.",
    "phone": "+91 98765 43210",
    "email": "hello@eduprime.academy",
    "address": "2nd Floor, Knowledge Tower, MG Road, Bengaluru 560001 (demo address)",
    "hours": "Mon–Sat: 8:00 AM – 8:00 PM | Sun: Closed",
    "whatsapp": "919876543210",
    "map_url": "",
    "social": {"facebook": "#", "instagram": "#", "youtube": "#", "linkedin": "#"},
    "logo_url": "",
    "hero_image": "https://images.pexels.com/photos/8199166/pexels-photo-8199166.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "privacy_policy": "This is a demonstration privacy policy. EduPrime Academy collects only the information required to process admission enquiries and manage student records. We do not sell personal data. Institutes must review and replace this policy with a legally reviewed version before launch.",
    "terms": "These are demonstration terms and conditions. Use of this platform is subject to the institute's academic and administrative policies. Replace with reviewed terms before launch.",
    "fee_policy": "This is a demonstration fee and refund policy. Fees once paid are generally non-refundable except as required by applicable law or specific written policy. Replace with the institute's reviewed policy before launch.",
    "updated_at": now_iso(),
}

FACULTY = [
    {"name": "Dr. Ananya Rao", "subjects": ["Physics", "Mathematics"],
     "qualifications": ["Ph.D. Physics", "M.Sc. Physics"], "experience": "12 years",
     "languages": ["English", "Hindi", "Kannada"],
     "bio": "Dr. Ananya mentors students for engineering entrance examinations with a concept-first approach. (Demo profile)",
     "photo_url": "https://images.unsplash.com/photo-1573894999291-f440466112cc?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
    {"name": "Prof. Rajesh Menon", "subjects": ["Chemistry"],
     "qualifications": ["M.Sc. Chemistry", "B.Ed."], "experience": "10 years",
     "languages": ["English", "Hindi"],
     "bio": "Prof. Rajesh specialises in organic chemistry and exam strategy. (Demo profile)",
     "photo_url": "https://images.pexels.com/photos/8197541/pexels-photo-8197541.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"name": "Ms. Priya Sharma", "subjects": ["English", "Communication"],
     "qualifications": ["M.A. English", "CELTA"], "experience": "8 years",
     "languages": ["English", "Hindi"],
     "bio": "Priya leads language and communication programs with a focus on fluency. (Demo profile)",
     "photo_url": "https://images.unsplash.com/photo-1544717305-2782549b5136?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
    {"name": "Mr. Arjun Nair", "subjects": ["Computer Science", "Coding"],
     "qualifications": ["M.Tech CSE"], "experience": "9 years",
     "languages": ["English", "Malayalam"],
     "bio": "Arjun teaches programming and data structures with project-based learning. (Demo profile)",
     "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
    {"name": "Dr. Kavita Iyer", "subjects": ["Biology"],
     "qualifications": ["Ph.D. Life Sciences"], "experience": "11 years",
     "languages": ["English", "Tamil"],
     "bio": "Dr. Kavita guides medical-entrance aspirants with structured revision plans. (Demo profile)",
     "photo_url": "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
    {"name": "Mr. Sameer Khan", "subjects": ["Quantitative Aptitude", "Reasoning"],
     "qualifications": ["MBA", "B.Tech"], "experience": "7 years",
     "languages": ["English", "Hindi", "Urdu"],
     "bio": "Sameer coaches for banking and management entrance tests. (Demo profile)",
     "photo_url": "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
]

COURSES = [
    {"title": "JEE Main & Advanced Program", "category": "Engineering Entrance", "level": "Advanced",
     "duration": "24 months", "fee_amount": 120000,
     "desc": "Comprehensive preparation for engineering entrance examinations covering Physics, Chemistry and Mathematics.",
     "image": "https://images.pexels.com/photos/8199151/pexels-photo-8199151.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"title": "NEET Medical Program", "category": "Medical Entrance", "level": "Advanced",
     "duration": "24 months", "fee_amount": 125000,
     "desc": "Structured NEET preparation with Biology, Physics and Chemistry and regular mock tests.",
     "image": "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
    {"title": "Full-Stack Coding Bootcamp", "category": "Technology", "level": "Intermediate",
     "duration": "6 months", "fee_amount": 60000,
     "desc": "Hands-on web development bootcamp covering frontend, backend and databases with real projects.",
     "image": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
    {"title": "Spoken English & Communication", "category": "Language", "level": "Beginner",
     "duration": "3 months", "fee_amount": 15000,
     "desc": "Practical spoken English program to build confidence and fluency for interviews and daily use.",
     "image": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
    {"title": "Banking & SSC Foundation", "category": "Competitive Exams", "level": "Intermediate",
     "duration": "12 months", "fee_amount": 45000,
     "desc": "Aptitude, reasoning and general awareness coaching for banking and SSC examinations.",
     "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
    {"title": "Class 12 Science Tuition", "category": "School Academics", "level": "Intermediate",
     "duration": "12 months", "fee_amount": 40000,
     "desc": "Board-focused tuition for Class 12 Science students with weekly tests and revision.",
     "image": "https://images.unsplash.com/photo-1588072432836-e10032774350?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
    {"title": "Data Science Essentials", "category": "Technology", "level": "Advanced",
     "duration": "5 months", "fee_amount": 70000,
     "desc": "Python, statistics, machine learning fundamentals and portfolio projects.",
     "image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
    {"title": "CUET Preparation Program", "category": "Competitive Exams", "level": "Intermediate",
     "duration": "10 months", "fee_amount": 35000,
     "desc": "Targeted preparation for the Common University Entrance Test across core subjects.",
     "image": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=940"},
]

FIRST = ["Aarav", "Diya", "Vivaan", "Ananya", "Aditya", "Isha", "Kabir", "Meera", "Rohan", "Sara",
         "Arnav", "Nisha", "Dev", "Pooja", "Yash", "Tara", "Krish", "Riya", "Aryan", "Sneha",
         "Kiara", "Laksh", "Myra", "Veer"]
LAST = ["Patel", "Sharma", "Reddy", "Nair", "Gupta", "Singh", "Rao", "Das", "Mehta", "Kulkarni",
        "Joshi", "Verma"]
STATUSES = ["new", "contacted", "follow_up", "demo_scheduled", "interested", "converted", "not_interested"]


async def seed_all():
    meta = await db.meta.find_one({"id": "seed"})
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]

    # Always ensure the super admin exists / password synced
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": gen_id(), "email": admin_email, "name": "Institute Owner",
            "role": "super_admin", "password_hash": hash_password(admin_password),
            "auth_provider": "password", "linked_student_id": None, "linked_faculty_id": None,
            "active": True, "created_at": now_iso(), "updated_at": now_iso(),
        })

    if meta:
        return  # demo data already seeded

    logger.info("Seeding demo data...")
    await db.settings.update_one({"id": "institute"}, {"$set": SETTINGS}, upsert=True)

    # Faculty
    faculty_ids = []
    for f in FACULTY:
        fid = gen_id()
        faculty_ids.append(fid)
        await db.faculty.insert_one({
            "id": fid, "slug": _slug(f["name"]), "name": f["name"], "email": None,
            "photo_url": f["photo_url"], "subjects": f["subjects"],
            "qualifications": f["qualifications"], "bio": f["bio"], "experience": f["experience"],
            "languages": f["languages"], "course_ids": [], "active": True,
            "created_at": now_iso(), "updated_at": now_iso(),
        })

    # Courses
    course_ids = []
    for idx, c in enumerate(COURSES):
        cid = gen_id()
        course_ids.append(cid)
        assigned = [faculty_ids[idx % len(faculty_ids)], faculty_ids[(idx + 1) % len(faculty_ids)]]
        await db.courses.insert_one({
            "id": cid, "slug": _slug(c["title"]), "title": c["title"], "description": c["desc"],
            "category": c["category"], "duration": c["duration"], "level": c["level"],
            "curriculum": ["Foundations & fundamentals", "Core concepts with practice",
                           "Advanced problem solving", "Mock tests & revision"],
            "outcomes": ["Strong conceptual clarity", "Exam-ready preparation", "Regular performance tracking"],
            "fee_amount": c["fee_amount"], "currency": "INR", "faculty_ids": assigned,
            "image_url": c["image"], "status": "published", "admission_open": True,
            "prerequisites": "", "faqs": [
                {"q": "What is the batch size?", "a": "Batches are kept small for personalised attention. (Demo)"},
                {"q": "Are demo classes available?", "a": "Yes, you can book a free demo class online. (Demo)"},
            ],
            "created_at": now_iso(), "updated_at": now_iso(),
        })
        for fid in assigned:
            await db.faculty.update_one({"id": fid}, {"$addToSet": {"course_ids": cid}})

    # Batches
    batch_ids = []
    batch_course = {}
    batch_teacher = {}
    for idx, cid in enumerate(course_ids):
        for b in range(2):
            bid = gen_id()
            batch_ids.append(bid)
            batch_course[bid] = cid
            tid = COURSES  # placeholder
            teacher = faculty_ids[(idx + b) % len(faculty_ids)]
            batch_teacher[bid] = teacher
            days = [DAYS[0], DAYS[2], DAYS[4]] if b == 0 else [DAYS[1], DAYS[3], DAYS[5]]
            await db.batches.insert_one({
                "id": bid, "name": f"{COURSES[idx]['title'].split()[0]} Batch {chr(65 + b)}",
                "code": f"B{idx + 1}{chr(65 + b)}", "course_id": cid, "teacher_id": teacher,
                "start_date": _date(-30 + b * 5), "end_date": _date(300),
                "days": days, "start_time": "10:00" if b == 0 else "16:00",
                "end_time": "12:00" if b == 0 else "18:00", "timezone": "Asia/Kolkata",
                "mode": "classroom" if b == 0 else "online",
                "location": "Room 101" if b == 0 else "Google Meet (link shared)",
                "capacity": 30, "status": "active",
                "created_at": now_iso(), "updated_at": now_iso(),
            })

    # Students + enrollments + fees
    student_ids = []
    used_names = set()
    for i in range(20):
        name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        while name in used_names:
            name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        used_names.add(name)
        cid = random.choice(course_ids)
        possible_batches = [b for b in batch_ids if batch_course[b] == cid]
        bid = random.choice(possible_batches)
        sid = gen_id()
        student_ids.append((sid, cid, bid))
        fee = next(c["fee_amount"] for i2, c in enumerate(COURSES) if course_ids[i2] == cid)
        await db.students.insert_one({
            "id": sid, "student_code": f"STU-{i + 1:04d}", "name": name,
            "phone": f"9{random.randint(100000000, 999999999)}",
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "admission_date": _date(-random.randint(10, 120)), "course_id": cid, "batch_id": bid,
            "status": "active" if i < 18 else "inactive", "notes": "DEMO student record",
            "emergency_contact": "", "created_at": now_iso(), "updated_at": now_iso(),
        })
        await db.enrollments.insert_one({
            "id": gen_id(), "student_id": sid, "course_id": cid, "batch_id": bid,
            "status": "active", "from_batch_id": None, "created_at": now_iso(),
        })
        # two installments
        half = round(fee / 2, 2)
        inst1 = gen_id()
        await db.installments.insert_one({"id": inst1, "student_id": sid, "label": "Installment 1",
                                          "amount": half, "discount": 0, "due_date": _date(-random.randint(0, 60)),
                                          "created_at": now_iso()})
        await db.installments.insert_one({"id": gen_id(), "student_id": sid, "label": "Installment 2",
                                          "amount": fee - half, "discount": 0, "due_date": _date(random.randint(10, 90)),
                                          "created_at": now_iso()})
        # ~65% paid first installment
        if random.random() < 0.65:
            await db.payments.insert_one({
                "id": gen_id(), "reference": f"PAY-{gen_id()[:8].upper()}", "student_id": sid,
                "installment_id": inst1, "amount": half, "method": random.choice(["cash", "upi", "card"]),
                "payment_ref": "", "note": "DEMO payment", "status": "paid", "reversed": False,
                "recorded_by": "System Seed", "created_at": _date(-random.randint(0, 50)) + "T10:00:00+00:00",
            })

    # Attendance for first two batches, last 6 sessions
    for bid in batch_ids[:3]:
        roster = await db.students.find({"batch_id": bid, "status": "active"}, {"_id": 0, "id": 1}).to_list(100)
        for d in range(6):
            sd = _date(-(d * 2 + 1))
            for s in roster:
                await db.attendance.insert_one({
                    "id": gen_id(), "batch_id": bid, "session_date": sd, "student_id": s["id"],
                    "status": random.choices(["present", "absent", "late", "excused"], weights=[80, 10, 7, 3])[0],
                    "marked_by": "System Seed", "marked_at": now_iso(),
                    "updated_by": None, "updated_at": None,
                })

    # Enquiries
    for i in range(16):
        name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        cid = random.choice(course_ids)
        ctitle = next(c["title"] for i2, c in enumerate(COURSES) if course_ids[i2] == cid)
        status = random.choice(STATUSES)
        await db.enquiries.insert_one({
            "id": gen_id(), "reference": f"ENQ-{gen_id()[:6].upper()}", "name": name,
            "phone": f"9{random.randint(100000000, 999999999)}",
            "email": f"{name.lower().replace(' ', '.')}@example.com", "course_id": cid,
            "course_title": ctitle, "preferred_batch": "", "message": "Interested in admission. (Demo)",
            "source": random.choice(["website", "phone", "referral", "walk_in"]),
            "assigned_to": None, "status": status,
            "follow_up_date": _date(random.randint(-5, 10)) if status in ("follow_up", "contacted") else None,
            "notes": [], "consent": True, "converted_student_id": None,
            "created_at": _date(-random.randint(0, 30)) + "T09:00:00+00:00", "updated_at": now_iso(),
        })

    # Demo slots + bookings
    for cid in course_ids[:5]:
        for d in [3, 6, 9]:
            slot_id = gen_id()
            booked = random.randint(0, 4)
            await db.demo_slots.insert_one({
                "id": slot_id, "course_id": cid, "date": _date(d), "time": "11:00",
                "capacity": 15, "booked_count": booked, "active": True, "created_at": now_iso(),
            })
    for i in range(6):
        cid = random.choice(course_ids[:5])
        ctitle = next(c["title"] for i2, c in enumerate(COURSES) if course_ids[i2] == cid)
        slot = await db.demo_slots.find_one({"course_id": cid}, {"_id": 0})
        name = f"{random.choice(FIRST)} {random.choice(LAST)}"
        await db.demo_bookings.insert_one({
            "id": gen_id(), "reference": f"DEMO-{gen_id()[:6].upper()}", "name": name,
            "phone": f"9{random.randint(100000000, 999999999)}",
            "email": f"{name.lower().replace(' ', '.')}@example.com", "course_id": cid,
            "course_title": ctitle, "slot_id": slot["id"], "session_date": slot["date"],
            "session_time": slot["time"], "status": random.choice(["pending", "confirmed"]),
            "created_at": now_iso(),
        })

    # Announcements
    anns = [
        ("Admissions Open for 2026 Batches", "New batches for engineering and medical entrance programs are now open. Book a demo class today. (Demo content)", "public"),
        ("Diwali Holiday Notice", "The institute will remain closed for the festival break. Regular classes resume the following Monday. (Demo content)", "all"),
        ("Weekly Test Schedule Updated", "The weekly assessment schedule for all active batches has been updated on the portal. (Demo content)", "students"),
        ("Faculty Meeting", "Monthly academic review meeting for all faculty this Saturday. (Demo content)", "faculty"),
    ]
    for t, b, aud in anns:
        await db.announcements.insert_one({
            "id": gen_id(), "title": t, "body": b, "audience": aud, "course_id": None,
            "batch_id": None, "publish_date": _date(-random.randint(0, 10)), "status": "published",
            "created_by": "Institute Owner", "created_at": now_iso(),
        })

    # Demo staff / teacher / student login accounts
    teacher_faculty = faculty_ids[0]
    demo_student = student_ids[0][0]
    demo_users = [
        {"email": "staff@eduprime-demo.com", "name": "Admissions Staff", "role": "admin",
         "password": "Staff@123", "linked_faculty_id": None, "linked_student_id": None},
        {"email": "teacher@eduprime-demo.com", "name": FACULTY[0]["name"], "role": "teacher",
         "password": "Teacher@123", "linked_faculty_id": teacher_faculty, "linked_student_id": None},
        {"email": "student@eduprime-demo.com", "name": "Demo Student", "role": "student",
         "password": "Student@123", "linked_faculty_id": None, "linked_student_id": demo_student},
    ]
    for u in demo_users:
        if not await db.users.find_one({"email": u["email"]}):
            await db.users.insert_one({
                "id": gen_id(), "email": u["email"], "name": u["name"], "role": u["role"],
                "password_hash": hash_password(u["password"]), "auth_provider": "password",
                "linked_faculty_id": u["linked_faculty_id"], "linked_student_id": u["linked_student_id"],
                "active": True, "created_at": now_iso(), "updated_at": now_iso(),
            })
    # link demo student record to the demo student email as well
    await db.students.update_one({"id": demo_student}, {"$set": {"email": "student@eduprime-demo.com"}})

    # assign a couple of batches to the demo teacher so they have batches to manage
    some_batches = batch_ids[:2]
    for bid in some_batches:
        await db.batches.update_one({"id": bid}, {"$set": {"teacher_id": teacher_faculty}})

    await db.meta.insert_one({"id": "seed", "done": True, "created_at": now_iso()})
    logger.info("Demo data seeding complete.")
