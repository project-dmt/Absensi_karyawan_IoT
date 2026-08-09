import { NavLink, Outlet, useNavigate } from "react-router-dom";
import AiChatWidget from "../components/AiChatWidget";

const NAV_ITEMS = [
  {
    to: "/", label: "Dashboard", icon: "bi-speedometer2",
    children: [
      { to: "/dashboard/terlambat", label: "Terlambat", icon: "bi-exclamation-triangle" },
      { to: "/dashboard/tidak-hadir", label: "Tidak Hadir", icon: "bi-x-circle" },
    ],
  },
  { to: "/data-karyawan", label: "Data Karyawan", icon: "bi-people" },
  { to: "/data-divisi", label: "Data Divisi", icon: "bi-diagram-3" },
  { to: "/jam-kerja", label: "Jam Kerja", icon: "bi-clock-history" },
  { to: "/input-absensi-manual", label: "Absensi Manual", icon: "bi-pencil-square" },
  { to: "/laporan-absensi", label: "Laporan Absensi", icon: "bi-file-earmark-bar-graph" },
];

export default function AdminLayout({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">
            <i className="bi bi-person-badge" />
          </div>
          <div>
            <div className="sidebar__brand-title">Absensi IoT</div>
            <div className="sidebar__brand-sub">RFID System</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <div key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                }
              >
                <i className={`bi ${item.icon} sidebar__link-icon`} />
                <span>{item.label}</span>
                {item.children && (
                  <i className="bi bi-chevron-down sidebar__link-chevron" />
                )}
              </NavLink>
              {item.children && (
                <div className="sidebar__subnav">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `sidebar__link sidebar__link--sub ${isActive ? "sidebar__link--active" : ""}`
                      }
                    >
                      <i className={`bi ${child.icon} sidebar__link-icon`} />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <small className="text-muted">v1.0.0</small>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="d-flex align-items-center gap-3">
            <h6 className="topbar__title mb-0">
              Sistem Absensi IoT
            </h6>
          </div>

          <div className="dropdown">
            <button
              className="topbar__user-btn"
              data-bs-toggle="dropdown"
            >
              <div className="topbar__avatar">
                <i className="bi bi-person-fill" />
              </div>
              <span className="d-none d-sm-inline">{user?.nama || "Admin"}</span>
              <i className="bi bi-chevron-down ms-1" style={{ fontSize: "0.7rem" }} />
            </button>
            <ul className="dropdown-menu dropdown-menu-end topbar__dropdown">
              <li>
                <div className="dropdown-item-text">
                  <div className="fw-semibold">{user?.nama}</div>
                  <small className="text-muted">{user?.email}</small>
                </div>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}
