# EduPrime Academy — PRD

## Original problem statement (summary of user's master prompt)
Build EduPrime, a premium coaching institute website + management system: public marketing/admissions site, secure role-based auth, admin console (students, courses, batches, faculty, enquiries CRM, demo bookings, attendance, fees, announcements, reports, staff, settings, audit), student and faculty portals, SEO, security, demo data clearly marked fictional, honest status reporting.
Follow-up (2026-10-20): "bhai create new account bhi add karo" — add a public create-new-account option.

## User choices
- Sign-in: email + password accounts controlled by institute AND Sign in with Google (Emergent-managed)
- Payments: skipped -> manual/offline payment recording only (no online gateway)
- Email: skipped -> Emergent-managed Resend (best-effort notifications)
- Single institute

## Architecture
React (CRA + craco, shadcn, Tailwind) / FastAPI / MongoDB. Routes: routes_public, routes_auth, routes_admin, routes_portal (/api/portal/*). JWT httpOnly cookies + Emergent Google session. Roles: super_admin, admin, teacher, student. Server-side role + object checks.

## Implemented
- 2026-10-20: Full public site, admin console, student + faculty portals, seed demo data, auth (password + Google), audit log, rate limits on public forms.
- 2026-10-20: Fixed seed empty-update error, .test demo emails, /faculty/{slug} vs portal route collision, missing frontend modules.
- 2026-10-20: Public self sign-up ("Create Account" tab on /login) -> student account, duplicate 409, min-6 password, rate limit 5/10min.
- 2026-10-20: Fixed blank-email enquiry/demo 422 (OptionalEmailStr), visible login error + toast, page titles for admin/portal.
- Testing: iteration_1 backend 57/57; iteration_2 15/15 backend + 6/6 UI flows pass.

## Backlog
- P1: Self-signed-up students are not linked to a student record until admin links/creates one (portal shows limited data) — admin "link account" action
- P1: Online payment gateway (Razorpay/Stripe) if desired
- P2: Email verification / forgot-password flow for self sign-up
- P2: README / deployment handover doc, sitemap.xml
