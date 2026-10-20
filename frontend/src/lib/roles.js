export function homeFor(role) {
  if (role === "student") return "/student";
  if (role === "teacher") return "/faculty-portal";
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/";
}

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Faculty",
  student: "Student",
};
