from typing import List, Optional, Annotated
from pydantic import BaseModel, EmailStr, Field, BeforeValidator


def _empty_to_none(v):
    return None if v == "" else v


# Optional email that tolerates blank strings from forms ("" -> None)
OptionalEmailStr = Annotated[Optional[EmailStr], BeforeValidator(_empty_to_none)]


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class StaffIn(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None
    role: str = "admin"  # admin | teacher | super_admin
    phone: Optional[str] = None
    faculty_id: Optional[str] = None
    active: bool = True


class StaffUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    faculty_id: Optional[str] = None
    active: Optional[bool] = None


# ---------- Courses ----------
class CourseIn(BaseModel):
    title: str
    description: str = ""
    category: str = "General"
    duration: str = ""
    level: str = "Beginner"
    curriculum: List[str] = []
    outcomes: List[str] = []
    fee_amount: float = 0
    currency: str = "INR"
    faculty_ids: List[str] = []
    image_url: str = ""
    status: str = "published"  # published | draft | archived
    admission_open: bool = True
    prerequisites: str = ""
    faqs: List[dict] = []


# ---------- Faculty ----------
class FacultyIn(BaseModel):
    name: str
    photo_url: str = ""
    subjects: List[str] = []
    qualifications: List[str] = []
    bio: str = ""
    experience: str = ""
    languages: List[str] = []
    course_ids: List[str] = []
    active: bool = True


class FacultyProfileIn(BaseModel):
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    photo_url: Optional[str] = None


# ---------- Batches ----------
class BatchIn(BaseModel):
    name: str
    code: str = ""
    course_id: str
    teacher_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days: List[str] = []
    start_time: str = ""
    end_time: str = ""
    timezone: str = "Asia/Kolkata"
    mode: str = "classroom"  # classroom | online
    location: str = ""
    capacity: int = 30
    status: str = "active"  # active | upcoming | closed | archived


# ---------- Students ----------
class StudentIn(BaseModel):
    name: str
    phone: str
    email: OptionalEmailStr = None
    admission_date: Optional[str] = None
    course_id: Optional[str] = None
    batch_id: Optional[str] = None
    status: str = "active"  # active | inactive
    fee_total: Optional[float] = None
    notes: str = ""
    emergency_contact: str = ""
    create_login: bool = False
    password: Optional[str] = None


class StudentUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: OptionalEmailStr = None
    status: Optional[str] = None
    notes: Optional[str] = None
    emergency_contact: Optional[str] = None


class EnrollIn(BaseModel):
    course_id: str
    batch_id: str
    override_capacity: bool = False
    override_reason: str = ""


class StudentContactIn(BaseModel):
    phone: Optional[str] = None
    email: OptionalEmailStr = None


# ---------- Enquiries ----------
class EnquiryIn(BaseModel):
    name: str
    phone: str
    email: OptionalEmailStr = None
    course_id: Optional[str] = None
    preferred_batch: str = ""
    message: str = ""
    source: str = "website"
    consent: bool = False


class EnquiryUpdateIn(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[str] = None


class FollowUpIn(BaseModel):
    note: str
    next_date: Optional[str] = None
    status: Optional[str] = None


class ConvertIn(BaseModel):
    course_id: str
    batch_id: str
    fee_total: Optional[float] = None
    admission_date: Optional[str] = None


# ---------- Demo ----------
class DemoSlotIn(BaseModel):
    course_id: str
    date: str
    time: str
    capacity: int = 15
    active: bool = True


class DemoBookingIn(BaseModel):
    name: str
    phone: str
    email: OptionalEmailStr = None
    course_id: str
    slot_id: str
    consent: bool = False


# ---------- Attendance ----------
class AttendanceEntry(BaseModel):
    student_id: str
    status: str  # present | absent | late | excused


class AttendanceMarkIn(BaseModel):
    batch_id: str
    session_date: str
    entries: List[AttendanceEntry]


# ---------- Fees ----------
class InstallmentIn(BaseModel):
    student_id: str
    label: str = "Installment"
    amount: float
    due_date: Optional[str] = None
    discount: float = 0


class PaymentIn(BaseModel):
    student_id: str
    installment_id: Optional[str] = None
    amount: float
    method: str = "cash"  # cash | upi | card | bank_transfer | cheque
    payment_ref: str = ""
    note: str = ""


# ---------- Announcements ----------
class AnnouncementIn(BaseModel):
    title: str
    body: str
    audience: str = "all"  # public | students | faculty | all
    course_id: Optional[str] = None
    batch_id: Optional[str] = None
    publish_date: Optional[str] = None
    status: str = "published"  # draft | published | archived


# ---------- Settings / Contact ----------
class SettingsIn(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    about: Optional[str] = None
    mission: Optional[str] = None
    methodology: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    hours: Optional[str] = None
    whatsapp: Optional[str] = None
    map_url: Optional[str] = None
    social: Optional[dict] = None
    privacy_policy: Optional[str] = None
    terms: Optional[str] = None
    fee_policy: Optional[str] = None
    logo_url: Optional[str] = None
    hero_image: Optional[str] = None


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    message: str
