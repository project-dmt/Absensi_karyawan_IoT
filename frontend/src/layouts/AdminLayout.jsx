import { Suspense, useState } from "react";
import { Outlet, useRouteContext, useRouter } from "@tanstack/react-router";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AiChatWidget from "../components/AiChatWidget";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  const router = useRouter();
  const { auth } = useRouteContext({ strict: false });
  const { user, logout } = auth;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="app-main">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background lg:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <Menu className="size-4" />
            </button>
            <h6 className="topbar__title mb-0">Sistem Absensi IoT</h6>
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
            <DropdownMenuContent align="end" sideOffset={8} className="topbar__dropdown w-64">
              <div className="px-2 py-2">
                <div className="text-sm font-semibold leading-tight">{user?.nama || "Admin"}</div>
                <div className="text-xs leading-tight text-muted-foreground truncate">{user?.email || "admin@example.com"}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout} className="py-2">
                <LogOut data-icon="inline-start" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="app-content">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}
