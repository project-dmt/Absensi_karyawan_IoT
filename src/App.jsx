import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DataKaryawan from "./pages/DataKaryawan";
import DataDivisi from "./pages/DataDivisi";
import JamKerja from "./pages/JamKerja";
import InputAbsensiManual from "./pages/InputAbsensiManual";
import LaporanAbsensi from "./pages/LaporanAbsensi";
import DetailKaryawan from "./pages/DetailKaryawan";
import DetailDivisi from "./pages/DetailDivisi";
import DetailDashboard from "./pages/DetailDashboard";

function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <Login onLogin={login} />
          }
        />
        <Route
          element={
            <ProtectedRoute user={user} loading={loading}>
              <AdminLayout user={user} onLogout={logout} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard/terlambat" element={<DetailDashboard />} />
          <Route path="/dashboard/hadir" element={<DetailDashboard />} />
          <Route path="/dashboard/tidak-hadir" element={<DetailDashboard />} />
          <Route path="/data-karyawan" element={<DataKaryawan />} />
          <Route path="/data-karyawan/:id" element={<DetailKaryawan />} />
          <Route path="/data-divisi" element={<DataDivisi />} />
          <Route path="/data-divisi/:id" element={<DetailDivisi />} />
          <Route path="/jam-kerja" element={<JamKerja />} />
          <Route path="/input-absensi-manual" element={<InputAbsensiManual />} />
          <Route path="/laporan-absensi" element={<LaporanAbsensi />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
