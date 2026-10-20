# EduPrime Auth Testing Notes

Base API: `${REACT_APP_BACKEND_URL}/api`

## Accounts (also in /app/memory/test_credentials.md)
- Super Admin: panditkaushal850@gmail.com / EduPrime@Admin2026
- Admin/Staff: staff@eduprime-demo.com / Staff@123
- Teacher: teacher@eduprime-demo.com / Teacher@123
- Student: student@eduprime-demo.com / Student@123

## Auth model
- JWT email/password → sets httpOnly `access_token` + `refresh_token` cookies (SameSite=None, Secure).
- Emergent Google login → POST /api/auth/google/session {session_id} → sets `session_token` cookie.
- get_current_user resolves access_token cookie → session_token cookie → Authorization Bearer.

## API quick test
```
curl -c cookies.txt -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"email":"panditkaushal850@gmail.com","password":"EduPrime@Admin2026"}'
curl -b cookies.txt $API/auth/me
curl -b cookies.txt $API/admin/dashboard
```

## RBAC expectations
- Student token on /api/admin/* → 403
- Admin (not super) token on /api/admin/audit, /api/admin/staff, /api/admin/settings → 403
- Student A cannot read Student B's record (portal only exposes own linked_student_id)
- Faculty can mark attendance only for batches where teacher_id == their linked_faculty_id (else 403)
