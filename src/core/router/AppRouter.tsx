import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/auth/ProtectedRoute";

// Auth pages (new custom auth)
import LoginPage from "@/pages/login";
import SignupForm from "@/pages/signup";
import LogoutPage from "@/pages/logout";

// Main pages (updated with custom auth)
import Index from "@/pages/index";
import Calculator from "@/pages/calculator";
import Operations from "@/pages/operations";
import Favorites from "@/pages/favorites";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";

export const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/signup' element={<SignupForm />} />
      <Route path='/logout' element={<LogoutPage />} />

      {/* Protected routes */}
      <Route path='/' element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path='/calculator' element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
      <Route path='/operations' element={<ProtectedRoute><Operations /></ProtectedRoute>} />
      <Route path='/favorites' element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
      <Route path='/history' element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path='/settings' element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    </Routes>
  );
};
