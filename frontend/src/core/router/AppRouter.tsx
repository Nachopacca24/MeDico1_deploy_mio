// src/core/router/AppRouter.tsx

import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/auth/ProtectedRoute";

// Admin components
import { AdminLayout } from "@/admin/components/AdminLayout";
import AdminDashboard from "@/admin/pages/Dashboard";
import Clients from "@/admin/pages/Clients";
import Advertisements from "@/admin/pages/Advertisements";
import UsersPage from "@/admin/pages/UsersPage";

// Auth pages
import LoginPage from "@/pages/login";
import SignupForm from "@/pages/signup";
import LogoutPage from "@/pages/logout";
import VerifyEmailPage from "@/pages/verify-email";

// Main pages
import Index from "@/pages/index";
import CasesPage from "@/pages/cases";
import NewCase from "@/pages/cases/new";
import CaseDetail from "@/pages/cases/detail";
import EditCase from "@/pages/cases/edit";
import Calculator from "@/pages/calculator";
import Operations from "@/pages/operations";
import HospitalsPage from "@/pages/hospitals";
import Favorites from "@/pages/favorites";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import DebugFavorites from "@/pages/debug-favorites";
import ColleaguesPage from "@/pages/ColleaguesPage"; 
import CalendarPage from "@/pages/calendar";

export const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/signup' element={<SignupForm />} />
      <Route path='/logout' element={<LogoutPage />} />
      <Route path='/verify-email' element={<VerifyEmailPage />} />

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
        <Route path='clients' element={<Clients />} />
        <Route path='advertisements' element={<Advertisements />} />
      </Route>

      {/* Protected routes */}
      <Route path='/' element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path='/cases' element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
      <Route path='/cases/new' element={<ProtectedRoute><NewCase /></ProtectedRoute>} />
      <Route path='/cases/:id' element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
      <Route path='/cases/:id/edit' element={<ProtectedRoute><EditCase /></ProtectedRoute>} />
      <Route path='/calculator' element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
      <Route path='/operations' element={<ProtectedRoute><Operations /></ProtectedRoute>} />
      <Route path='/hospitals' element={<ProtectedRoute><HospitalsPage /></ProtectedRoute>} />
      <Route path='/favorites' element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
      <Route path='/colleagues' element={<ProtectedRoute><ColleaguesPage /></ProtectedRoute>} /> 
      <Route path='/history' element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path='/settings' element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path='/debug-favorites' element={<ProtectedRoute><DebugFavorites /></ProtectedRoute>} />
      <Route path='/calendar' element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
    </Routes>
  );
};