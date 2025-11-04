import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth";

// Feature pages
import { DashboardPage } from "@/features/dashboard";
import { LoginPage, SignupPage, LogoutPage } from "@/features/auth";
import { CalculatorPage } from "@/features/calculator";
import { OperationsPage } from "@/features/operations";
import FavoritesPage from "@/features/favorites/pages/FavoritesPage";
import HistoryPage from "@/features/history/pages/HistoryPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";

export const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/signup' element={<SignupPage />} />
      <Route path='/logout' element={<LogoutPage />} />

      {/* Protected routes */}
      <Route path='/' element={<ProtectedRoute Component={DashboardPage} />} />
      <Route path='/calculator' element={<ProtectedRoute Component={CalculatorPage} />} />
      <Route path='/operations' element={<ProtectedRoute Component={OperationsPage} />} />
      <Route path='/favorites' element={<ProtectedRoute Component={FavoritesPage} />} />
      <Route path='/history' element={<ProtectedRoute Component={HistoryPage} />} />
      <Route path='/settings' element={<ProtectedRoute Component={SettingsPage} />} />
    </Routes>
  );
};
