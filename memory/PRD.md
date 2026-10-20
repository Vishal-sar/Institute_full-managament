# EduPrime Academy — PRD

## Original problem statement (summary of user's master prompt)
Build EduPrime, a premium coaching institute website + management system: public marketing/admissions site, secure role-based auth, admin console (students, courses, batches, faculty, enquiries CRM, demo bookings, attendance, fees, announcements, reports, staff, settings, audit), student and faculty portals, SEO, security, demo data clearly marked fictional, honest status reporting.
Follow-ups (2026-10-20):
- "bhai create new account bhi add karo" — add a public create-new-account option.
- "Link Student Accounts: Add a button for admin to link self-signed-up accounts to student records so their fees and attendance show"
- "Forgot Password: Let students reset a forgotten password with a link sent to their email"
- "New Sign-ups List: Display a \"new sign-ups waiting\" list on the Students page for easier linking by admins."
- "Welcome Email: Send new students a branded welcome email containing course and batch details once their account is linked."

## User choices
- Sign-in: email + password accounts controlled by institute AND Sign in with Google (Emergent-managed)
- Payments: skipped -> manual/offline payment recording only (no online gateway)
- Email: skipped -> Emergent-managed Resend (best-effort notifications)
- Single institute

## Architecture
React (CRA + craco, shadcn, Tailwind) / FastAPI / MongoDB. Routes: routes_public, routes_auth, routes_admin, routes_portal (/api/portal/*). JWT httpOnly cookies + Emergent Google session. Roles: super_admin, admin, teacher, student. Server-side role + object checks.
- Password reset: sha256-hashed single-use tokens in `password_reset_tokens` (TTL index, 60 min), link = FRONTEND_URL/reset-password?token=..., generic response (no enumeration), rate limited.
- Account linking: users.linked_student_id (partial unique index -> one login per student record). Auto-link on sign-up/Google only if the matching student record isn't already linked.

## Implemented
- 2026-10-20: Full public site, admin console, student + faculty portals, seed demo data, auth (password + Google), audit log, rate limits on public forms.
- 2026-10-20: Fixed seed empty-update error, .test demo emails, /faculty/{slug} vs portal route collision, missing frontend modules.
- 2026-10-20: Public self sign-up ("Create Account" tab on /login) -> student account, duplicate 409, min-6 password, rate limit 5/10min.
- 2026-10-20: Fixed blank-email enquiry/demo 422 (OptionalEmailStr), visible login error + toast, page titles for admin/portal.
- 2026-10-20: Forgot/Reset password (/forgot-password, /reset-password, email template), "Forgot password?" link on login.
- 2026-10-20: Admin Link/Unlink login account panel on Student Detail (search, likely-match badge), GET /admin/student-accounts, link/unlink endpoints with audit; fixed sign-up 500 when matching student already linked.
- 2026-10-20: "New sign-ups waiting" panel on Students page (suggested match by email/phone, one-click link, choose-student picker with 'Already linked' badge); branded welcome email (course, batch, schedule, portal button) on admin link and on auto-link at sign-up/Google; no re-send on same re-link.
- 2026-10-20: Fixes: student search regex escaped (500 on special chars), case-insensitive auto-link email, student code generation (dup STU code after deletions), admin layout mobile overflow.
- Testing: iteration_4 backend 10/11 (the 1 failure was the search bug, since fixed and checked by hand), frontend 100%; follow-up fixes checked by curl + screenshots.
- Testing (earlier): iteration_1 backend 57/57; iteration_2 15/15 + UI 6/6; iteration_3 backend 13/14 (500 edge case, since fixed + verified by curl), frontend 100%.

## Backlog
- P1: Online payment gateway (Razorpay/Stripe) if desired
- P2: Normalise phone numbers (+91/spaces) so sign-up suggestions match more reliably
- P2: Email verification for self sign-up
- P2: README / deployment handover doc, sitemap.xml
