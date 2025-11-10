import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/auth/ProtectedRoute";

// Auth pages (new custom auth)
import LoginPage from "@/pages/login";
import SignupForm from "@/pages/signup";
import LogoutPage from "@/pages/logout";

// Main pages (updated with custom auth)
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

export const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/signup' element={<SignupForm />} />
      <Route path='/logout' element={<LogoutPage />} />

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
      <Route path='/history' element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path='/settings' element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path='/debug-favorites' element={<ProtectedRoute><DebugFavorites /></ProtectedRoute>} />
    </Routes>
  );
};
