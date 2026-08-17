import { Link, Outlet, useRouteContext, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Network,
  PenLine,
  User,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AiChatWidget from "../components/AiChatWidget";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { to: "/dashboard/terlambat", label: "Terlambat", icon: AlertTriangle },
      { to: "/dashboard/tidak-hadir", label: "Tidak Hadir", icon: XCircle },
    ],
  },
  { to: "/data-karyawan", label: "Data Karyawan", icon: Users },
  { to: "/data-divisi", label: "Data Divisi", icon: Network },
  { to: "/jam-kerja", label: "Jam Kerja", icon: Clock },
  { to: "/input-absensi-manual", label: "Absensi Manual", icon: PenLine },
  { to: "/laporan-absensi", label: "Laporan Absensi", icon: FileBarChart },
];

export default function AdminLayout() {
  const router = useRouter();
  const { auth } = useRouteContext({ strict: false });
  const { user, logout } = auth;

  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">
            <UserCog className="size-5" />
          </div>
          <div>
            <div className="sidebar__brand-title">Absensi IoT</div>
            <div className="sidebar__brand-sub">RFID System</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "sidebar__link sidebar__link--active" }}
                  inactiveProps={{ className: "sidebar__link" }}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.children && (
                    <ChevronDown className="sidebar__link-chevron size-3.5" />
                  )}
                </Link>
                {item.children && (
                  <div className="sidebar__subnav">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          activeProps={{ className: "sidebar__link sidebar__link--sub sidebar__link--active" }}
                          inactiveProps={{ className: "sidebar__link sidebar__link--sub" }}
                        >
                          <ChildIcon className="size-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <small className="text-muted-foreground">v1.0.0</small>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <h6 className="topbar__title mb-0">
              Sistem Absensi IoT
            </h6>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className="topbar__user-btn" />}
            >
              <div className="topbar__avatar">
                <User className="size-4" />
              </div>
              <span className="hidden sm:inline">{user?.nama || "Admin"}</span>
              <ChevronDown className="ms-1 size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="topbar__dropdown">
              <div className="px-1.5 py-1.5">
                <div className="font-semibold">{user?.nama}</div>
                <small className="text-muted-foreground">{user?.email}</small>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut data-icon="inline-start" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}