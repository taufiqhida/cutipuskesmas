import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminAllRequests from "@/pages/AdminAllRequests";
import AdminInbox from "@/pages/AdminInbox";
import KepalaDashboard from "@/pages/KepalaDashboard";
import PegawaiDashboard from "@/pages/PegawaiDashboard";
import AjukanCutiPage from "@/pages/AjukanCutiPage";
import ProfilePage from "@/pages/ProfilePage";
import VerifyPage from "@/pages/VerifyPage";
import "@/App.css";

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const map = { admin: "/admin", kepala: "/kepala", pegawai: "/pegawai" };
  return <Navigate to={map[user.role] || "/login"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify/:token" element={<VerifyPage />} />

          <Route
            path="/admin"
            element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/admin/pengajuan"
            element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminInbox /></AppLayout></ProtectedRoute>}
          />

          <Route
            path="/kepala"
            element={<ProtectedRoute roles={["kepala"]}><AppLayout><KepalaDashboard mode="pending" /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/kepala/riwayat"
            element={<ProtectedRoute roles={["kepala"]}><AppLayout><KepalaDashboard mode="history" /></AppLayout></ProtectedRoute>}
          />

          <Route
            path="/pegawai"
            element={<ProtectedRoute roles={["pegawai", "kepala"]}><AppLayout><PegawaiDashboard /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/pegawai/ajukan"
            element={<ProtectedRoute roles={["pegawai", "kepala"]}><AppLayout><AjukanCutiPage /></AppLayout></ProtectedRoute>}
          />

          <Route
            path="/profil"
            element={<ProtectedRoute roles={["pegawai", "kepala", "admin"]}><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>}
          />

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
