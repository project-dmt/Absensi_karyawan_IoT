import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  Cpu,
  FileBarChart,
  LayoutDashboard,
  PenLine,
  Settings,
  Timer,
  User,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_GROUPS = [
  {
    label: "RINGKASAN",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/live-monitoring", label: "Live Monitoring", icon: Activity },
    ],
  },
  {
    label: "ABSENSI",
    items: [
      { to: "/semua-absensi", label: "Semua Absensi", icon: CalendarDays },
      { to: "/dashboard/terlambat", label: "Terlambat", icon: Clock },
      { to: "/dashboard/tidak-hadir", label: "Tidak Hadir", icon: UserX },
      { to: "/input-absensi-manual", label: "Absensi Manual", icon: PenLine },
    ],
  },
  {
    label: "DATA MASTER",
    items: [
      { to: "/data-karyawan", label: "Data Karyawan", icon: Users },
      { to: "/data-divisi", label: "Data Divisi", icon: Building2 },
      { to: "/jam-kerja", label: "Jam Kerja", icon: Timer },
    ],
  },
  {
    label: "LAPORAN",
    items: [
      { to: "/laporan-absensi", label: "Laporan Absensi", icon: FileBarChart },
      { to: "/laporan-grafik", label: "Grafik Kehadiran", icon: BarChart3 },
    ],
  },
  {
    label: "PERANGKAT",
    items: [
      { to: "/perangkat-iot", label: "Perangkat IoT", icon: Cpu },
    ],
  },
];

function NavLink({ to, icon: Icon, label, onClose }) {
  const isRoot = to === "/";
  return (
    <Link
      to={to}
      activeOptions={isRoot ? { exact: true } : undefined}
      activeProps={{ className: "sidebar__link sidebar__link--active" }}
      inactiveProps={{ className: "sidebar__link" }}
      onClick={onClose}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

const ROLE_LABELS = {
  superadmin: "Super Admin",
  admin: "Admin",
};

export default function Sidebar({ isOpen, onClose, user, onLogout }) {
  const displayName = user?.nama || "Admin";
  const displayRole = ROLE_LABELS[user?.role] || user?.role || "-";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {isOpen && (
        <div
          className="sidebar__overlay lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        {/* Header */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">
            <UserCog className="size-5" />
          </div>
          <div>
            <div className="sidebar__brand-title">Absensi IoT</div>
            <div className="sidebar__brand-sub">RFID System</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" aria-label="Navigasi utama">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="sidebar__group">
              <div className="sidebar__group-label">{group.label}</div>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink key={item.to} {...item} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom pinned */}
        <div className="sidebar__bottom">
          <Link
            to="/pengaturan-sistem"
            activeProps={{ className: "sidebar__link sidebar__link--active" }}
            inactiveProps={{ className: "sidebar__link" }}
            onClick={onClose}
          >
            <Settings className="size-4 shrink-0" />
            <span>Pengaturan Sistem</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button type="button" className="sidebar__profile" />
              }
            >
              <div className="sidebar__profile-avatar">
                {avatarInitial}
              </div>
              <div className="sidebar__profile-info">
                <div className="sidebar__profile-name">{displayName}</div>
                <div className="sidebar__profile-role">{displayRole}</div>
              </div>
              <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <div className="px-1.5 py-1.5">
                <div className="font-semibold flex items-center gap-2">
                  <User className="size-3.5" />
                  {displayName}
                </div>
                <small className="text-muted-foreground">{user?.email || "admin@example.com"}</small>
              </div>
              <div className="px-1.5 py-1 text-xs text-muted-foreground">
                Role: {displayRole}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
