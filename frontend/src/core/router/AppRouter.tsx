// src/core/router/AppRouter.tsx

import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { Capacitor } from "@capacitor/core";
import { ProtectedRoute } from "@/shared/components/auth/ProtectedRoute";
import { PersistentAdSystem } from "@/shared/components/ads/PersistentAdSystem";

// Admin components
import { AdminLayout } from "@/admin/components/AdminLayout";
import AdminDashboard from "@/admin/pages/Dashboard";
import Clients from "@/admin/pages/Clients";
import Advertisements from "@/admin/pages/Advertisements";
import AnnouncementsPage from "@/admin/pages/AnnouncementsPage";
import AdminSettingsPage from "@/admin/pages/SettingsPage";
import UsersPage from "@/admin/pages/UsersPage";
import SubscriptionsPage from "@/admin/pages/SubscriptionsPage";
import DirectoriesPage from "@/admin/pages/DirectoriesPage";

// Auth pages
import LoginPage from "@/pages/login";
import SignupForm from "@/pages/signup";
import LogoutPage from "@/pages/logout";
import VerifyEmailPage from "@/pages/verify-email";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import CompleteProfilePage from "@/pages/complete-profile";
import InvitePage from "@/pages/InvitePage";

// Landing page
import LandingPage from "@/pages/landing";
import TestersPage from "@/pages/testers";
import NotFoundPage from "@/pages/not-found";

// Main pages
import Index from "@/pages/index";
import CasesPage from "@/pages/cases";
import NewCase from "@/pages/cases/new";
import NewAnesthesiaCase from "@/pages/cases/new-anesthesia";
import EditAnesthesiaCase from "@/pages/cases/edit-anesthesia";
import AnesthesiaEditorPage from "@/pages/cases/AnesthesiaEditorPage";
import CaseDetail from "@/pages/cases/detail";
import EditCase from "@/pages/cases/edit";
import Operations from "@/pages/operations";
import HospitalsPage from "@/pages/hospitals";
import InsurancesPage from "@/pages/insurances";
import CalculatorPage from "@/pages/calculator";
import Favorites from "@/pages/favorites";
import NovedadesPage from "@/pages/novedades";
import SettingsPage from "@/pages/settings";
import DebugFavorites from "@/pages/debug-favorites";
import ColleaguesPage from "@/pages/ColleaguesPage";
import CalendarPage from "@/pages/calendar";
import StatsPage from "@/pages/stats";

export const AppRouter = () => {
  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Public routes */}
      <Route path='/' element={
        Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <LandingPage />
      } />
      <Route path='/testers' element={<TestersPage />} />
      <Route path='/login' element={<LoginPage />} />
      <Route path='/signup' element={<SignupForm />} />
      <Route path='/logout' element={<LogoutPage />} />
      <Route path='/verify-email' element={<VerifyEmailPage />} />
      <Route path='/forgot-password' element={<ForgotPasswordPage />} />
      <Route path='/reset-password' element={<ResetPasswordPage />} />
      <Route path='/invite' element={<InvitePage />} />

      {/* Admin routes */}
      <Route
        path='/admin'
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path='users' element={<UsersPage />} />
        <Route path='subscriptions' element={<SubscriptionsPage />} />
        <Route path='clients' element={<Clients />} />
        <Route path='advertisements' element={<Advertisements />} />
        <Route path='announcements' element={<AnnouncementsPage />} />
        <Route path='directories' element={<DirectoriesPage />} />
        <Route path='settings' element={<AdminSettingsPage />} />
      </Route>

      {/* Profile completion — protected but outside ad system */}
      <Route path='/complete-profile' element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />

      {/* Protected routes — wrapped in PersistentAdSystem so ad timers survive navigation */}
      <Route element={<ProtectedRoute><PersistentAdSystem /></ProtectedRoute>}>
        <Route path='/dashboard' element={<Index />} />
        <Route path='/cases' element={<CasesPage />} />
        <Route path='/cases/new' element={<NewCase />} />
        <Route path='/cases/new/anesthesia' element={<NewAnesthesiaCase />} />
        <Route path='/cases/:id' element={<CaseDetail />} />
        <Route path='/cases/:id/edit' element={<EditCase />} />
        <Route path='/cases/:id/edit/anesthesia' element={<EditAnesthesiaCase />} />
        <Route path='/cases/:id/anesthesia' element={<AnesthesiaEditorPage />} />
        <Route path='/operations' element={<Operations />} />
        <Route path='/hospitals' element={<HospitalsPage />} />
        <Route path='/insurances' element={<InsurancesPage />} />
        <Route path='/calculator' element={<CalculatorPage />} />
        <Route path='/favorites' element={<Favorites />} />
        <Route path='/colleagues' element={<ColleaguesPage />} />
        <Route path='/novedades' element={<NovedadesPage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/debug-favorites' element={<DebugFavorites />} />
        <Route path='/calendar' element={<CalendarPage />} />
        <Route path='/stats' element={<StatsPage />} />
      </Route>
      <Route path='*' element={<NotFoundPage />} />
    </Routes>
    </>
  );
};