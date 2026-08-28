import { lazy } from "react";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Link,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
  useParams,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { useAuth } from "./hooks/useAuth";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const DataKaryawan = lazy(() => import("./pages/DataKaryawan"));
const DataDivisi = lazy(() => import("./pages/DataDivisi"));
const JamKerja = lazy(() => import("./pages/JamKerja"));
const InputAbsensiManual = lazy(() => import("./pages/InputAbsensiManual"));
const LaporanAbsensi = lazy(() => import("./pages/LaporanAbsensi"));
const DetailKaryawan = lazy(() => import("./pages/DetailKaryawan"));
const DetailDivisi = lazy(() => import("./pages/DetailDivisi"));
const DetailDashboard = lazy(() => import("./pages/DetailDashboard"));
const LiveMonitoring = lazy(() => import("./pages/LiveMonitoring"));
const SemuaAbsensi = lazy(() => import("./pages/SemuaAbsensi"));
const PerangkatIoT = lazy(() => import("./pages/PerangkatIoT"));
const PengaturanSistem = lazy(() => import("./pages/PengaturanSistem"));

function RootComponent() {
  const auth = useAuth();
  if (auth.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
        >
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }
  return <Outlet context={{ auth }} />;
}

const rootRoute = createRootRouteWithContext()({
  component: RootComponent,
  notFoundComponent: () => <Navigate to="/" replace />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: ({ context }) => {
    if (context.auth.user) throw redirect({ to: "/" });
  },
  component: Login,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin",
  beforeLoad: async ({ context }) => {
    if (context.auth.loading) await context.auth.ready;
    if (!context.auth.user) throw redirect({ to: "/login" });
  },
  component: AdminLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: Dashboard,
});

const dashboardTypeRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/dashboard/$type",
  component: DetailDashboard,
});

const dataKaryawanRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/data-karyawan",
  component: DataKaryawan,
});

const detailKaryawanRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/data-karyawan/$id",
  component: DetailKaryawan,
});

const dataDivisiRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/data-divisi",
  component: DataDivisi,
});

const detailDivisiRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/data-divisi/$id",
  component: DetailDivisi,
});

const jamKerjaRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/jam-kerja",
  component: JamKerja,
});

const inputAbsensiManualRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/input-absensi-manual",
  component: InputAbsensiManual,
});

const laporanAbsensiRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/laporan-absensi",
  component: LaporanAbsensi,
});

const liveMonitoringRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/live-monitoring",
  component: LiveMonitoring,
});

const semuaAbsensiRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/semua-absensi",
  component: SemuaAbsensi,
});

const perangkatIoTRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/perangkat-iot",
  component: PerangkatIoT,
});

const pengaturanSistemRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/pengaturan-sistem",
  component: PengaturanSistem,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute.addChildren([
    indexRoute,
    dashboardTypeRoute,
    dataKaryawanRoute,
    detailKaryawanRoute,
    dataDivisiRoute,
    detailDivisiRoute,
    jamKerjaRoute,
    inputAbsensiManualRoute,
    laporanAbsensiRoute,
    liveMonitoringRoute,
    semuaAbsensiRoute,
    perangkatIoTRoute,
    pengaturanSistemRoute,
  ]),
]);

const router = createRouter({ routeTree, context: { auth: undefined } });

export { Link, useParams, useRouteContext, useRouter, router };

export default function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}