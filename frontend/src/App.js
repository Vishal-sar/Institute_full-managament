import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "@/App.css";

import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

import { PublicLayout } from "@/components/public/PublicLayout";
import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Courses from "@/pages/public/Courses";
import CourseDetail from "@/pages/public/CourseDetail";
import FacultyList from "@/pages/public/FacultyList";
import FacultyDetail from "@/pages/public/FacultyDetail";
import Admissions from "@/pages/public/Admissions";
import DemoBooking from "@/pages/public/DemoBooking";
import Contact from "@/pages/public/Contact";
import Faq from "@/pages/public/Faq";
import AnnouncementsPage from "@/pages/public/Announcements";
import Policy from "@/pages/public/Policy";
import NotFound from "@/pages/public/NotFound";

import Login from "@/pages/auth/Login";
import AuthCallback from "@/pages/auth/AuthCallback";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

import { AdminLayout } from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Students from "@/pages/admin/Students";
import StudentDetail from "@/pages/admin/StudentDetail";
import CoursesAdmin from "@/pages/admin/CoursesAdmin";
import Batches from "@/pages/admin/Batches";
import FacultyAdmin from "@/pages/admin/FacultyAdmin";
import Enquiries from "@/pages/admin/Enquiries";
import DemoBookingsAdmin from "@/pages/admin/DemoBookingsAdmin";
import Attendance from "@/pages/admin/Attendance";
import Fees from "@/pages/admin/Fees";
import AnnouncementsAdmin from "@/pages/admin/AnnouncementsAdmin";
import Reports from "@/pages/admin/Reports";
import Staff from "@/pages/admin/Staff";
import SettingsAdmin from "@/pages/admin/SettingsAdmin";
import Audit from "@/pages/admin/Audit";

import StudentPortal from "@/pages/portal/StudentPortal";
import FacultyPortal from "@/pages/portal/FacultyPortal";

function AppRoutes() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        <Route path="/faculty" element={<FacultyList />} />
        <Route path="/faculty/:slug" element={<FacultyDetail />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/demo" element={<DemoBooking />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/privacy" element={<Policy kind="privacy_policy" title="Privacy Policy" />} />
        <Route path="/terms" element={<Policy kind="terms" title="Terms & Conditions" />} />
        <Route path="/fees-policy" element={<Policy kind="fee_policy" title="Fee & Refund Policy" />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin", "super_admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="courses" element={<CoursesAdmin />} />
        <Route path="batches" element={<Batches />} />
        <Route path="faculty" element={<FacultyAdmin />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="demo" element={<DemoBookingsAdmin />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="fees" element={<Fees />} />
        <Route path="announcements" element={<AnnouncementsAdmin />} />
        <Route path="reports" element={<Reports />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={<SettingsAdmin />} />
        <Route path="audit" element={<Audit />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={["student", "super_admin"]}>
            <StudentPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty-portal"
        element={
          <ProtectedRoute roles={["teacher", "super_admin"]}>
            <FacultyPortal />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <SettingsProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </SettingsProvider>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </div>
  );
}

export default App;
