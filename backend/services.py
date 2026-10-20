from db import db, today_str


async def fee_summary(student_id: str) -> dict:
    insts = await db.installments.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    pays = await db.payments.find(
        {"student_id": student_id, "reversed": {"$ne": True}}, {"_id": 0}
    ).to_list(2000)
    pay_by_inst, general = {}, 0.0
    for p in pays:
        if p.get("installment_id"):
            pay_by_inst[p["installment_id"]] = pay_by_inst.get(p["installment_id"], 0) + p["amount"]
        else:
            general += p["amount"]
    today = today_str()
    total_due = 0.0
    for i in insts:
        net = i["amount"] - i.get("discount", 0)
        total_due += net
        paid = pay_by_inst.get(i["id"], 0)
        if net > 0 and paid >= net:
            i["payment_status"] = "paid"
        elif paid > 0:
            i["payment_status"] = "partial"
        elif i.get("due_date") and i["due_date"] < today:
            i["payment_status"] = "overdue"
        else:
            i["payment_status"] = "due"
        i["paid_amount"] = round(paid, 2)
        i["net_amount"] = round(net, 2)
    total_paid = sum(p["amount"] for p in pays)
    return {
        "total": round(total_due, 2),
        "paid": round(total_paid, 2),
        "outstanding": round(total_due - total_paid, 2),
        "installments": sorted(insts, key=lambda x: x.get("due_date") or ""),
        "payments": sorted(pays, key=lambda x: x.get("created_at") or "", reverse=True),
    }


async def attendance_summary(student_id: str, batch_id: str = None) -> dict:
    q = {"student_id": student_id}
    if batch_id:
        q["batch_id"] = batch_id
    recs = await db.attendance.find(q, {"_id": 0}).to_list(5000)
    total = len(recs)
    present = sum(1 for r in recs if r["status"] in ("present", "late"))
    absent = sum(1 for r in recs if r["status"] == "absent")
    excused = sum(1 for r in recs if r["status"] == "excused")
    pct = round(present * 100 / total, 1) if total else 0
    return {
        "total": total,
        "present": present,
        "absent": absent,
        "excused": excused,
        "percentage": pct,
        "records": sorted(recs, key=lambda x: x.get("session_date") or "", reverse=True),
    }
