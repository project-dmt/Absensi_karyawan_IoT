import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "bi-speedometer2" },
  { to: "/data-karyawan", label: "Data Karyawan", icon: "bi-people" },
  { to: "/data-divisi", label: "Data Divisi", icon: "bi-diagram-3" },
  { to: "/jam-kerja", label: "Jam Kerja", icon: "bi-clock-history" },
  { to: "/input-absensi-manual", label: "Absensi Manual", icon: "bi-pencil-square" },
  { to: "/laporan-absensi", label: "Laporan Absensi", icon: "bi-file-earmark-bar-graph" },
];

export default function AdminLayout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/login");
  };

  return (
    <div className="d-flex vh-100 overflow-hidden">
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-md-none"
          style={{ zIndex: 1040, backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`d-flex flex-column flex-shrink-0 bg-light border-end position-fixed position-md-relative h-100 ${
          sidebarOpen ? "d-block" : "d-none"
        } d-md-flex`}
        style={{
          width: "240px",
          zIndex: 1050,
          transition: "transform 0.2s ease",
        }}
      >
        <div className="p-3 border-bottom fw-bold fs-6 text-primary">
          <i className="bi bi-person-badge me-2" />
          Absensi IoT
        </div>
        <nav className="flex-grow-1 p-2 overflow-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `d-flex align-items-center gap-2 px-3 py-2 rounded text-decoration-none mb-1 ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-dark hover-bg-light"
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        <header
          className="d-flex align-items-center justify-content-between px-3 bg-primary text-white flex-shrink-0"
          style={{ height: "56px" }}
        >
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-light d-md-none"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list fs-5" />
            </button>
            <span className="fw-bold d-none d-md-inline">
              Sistem Absensi IoT
            </span>
          </div>
          <div className="dropdown">
            <button
              className="btn btn-sm btn-outline-light dropdown-toggle"
              data-bs-toggle="dropdown"
            >
              <i className="bi bi-person-circle me-1" />
              {user?.nama || "Admin"}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </header>

        <main className="flex-grow-1 overflow-auto p-4 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
