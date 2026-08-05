# Instruksi: Sub Halaman Dashboard Detail

## Endpoint Baru (Backend sudah push ke branch `be`)

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/dashboard/terlambat` | GET | `[{id, nama, nip, divisi, jam_masuk, jam_standar, keterlambatan}]` |
| `/api/dashboard/hadir` | GET | `[{id, nama, nip, divisi, jam_masuk}]` |
| `/api/dashboard/tidak-hadir` | GET | `[{id, nama, nip, divisi}]` |

Semua pakai `auth:sanctum`.

---

## File 1: `src/pages/Dashboard.jsx`

### Yang diubah:

1. Import `useNavigate` dari `react-router-dom`
2. Tambah `const navigate = useNavigate()` di dalam component
3. Tambah field `link` di setiap object `cards`:
   - Total Karyawan: `link: null` (gak bisa diklik)
   - Hadir Hari Ini: `link: "/dashboard/hadir"`
   - Terlambat: `link: "/dashboard/terlambat"`
   - Tidak Hadir: `link: "/dashboard/tidak-hadir"`
4. Di bagian render, bungkus div `stat-card` dengan properti:
   - `cursor: "pointer"` kalau link ada
   - `onClick={() => card.link && navigate(card.link)}`

### Contoh perubahan cards:

```js
const cards = [
  {
    label: "Total Karyawan",
    value: stats.totalKaryawan,
    bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)",
    icon: "bi-people",
    link: null,
  },
  {
    label: "Hadir Hari Ini",
    value: stats.hadir,
    bg: "linear-gradient(135deg, #10b981, #34d399)",
    icon: "bi-check-circle",
    link: "/dashboard/hadir",
  },
  {
    label: "Terlambat",
    value: stats.terlambat,
    bg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    icon: "bi-exclamation-triangle",
    link: "/dashboard/terlambat",
  },
  {
    label: "Tidak Hadir",
    value: stats.tidakHadir,
    bg: "linear-gradient(135deg, #ef4444, #f87171)",
    icon: "bi-x-circle",
    link: "/dashboard/tidak-hadir",
  },
];
```

### Contoh perubahan render card:

```jsx
<div className="row g-3 mb-4">
  {cards.map((card) => (
    <div key={card.label} className="col-sm-6 col-xl-3">
      <div
        className="stat-card"
        style={{
          background: card.bg,
          cursor: card.link ? "pointer" : "default",
        }}
        onClick={() => card.link && navigate(card.link)}
      >
        <i className={`bi ${card.icon} stat-card__icon`} />
        <div className="stat-card__value">{card.value}</div>
        <div className="stat-card__label">{card.label}</div>
      </div>
    </div>
  ))}
</div>
```

---

## File 2: `src/pages/DetailDashboard.jsx` (FILE BARU)

Buat file baru `src/pages/DetailDashboard.jsx`

Komponen ini reusable untuk ketiga type (terlambat, hadir, tidak-hadir).

### Cara kerja:

1. Baca parameter `type` dari URL pakai `useParams` (`/dashboard/:type`)
2. Tentukan endpoint berdasarkan type
3. Fetch data dari endpoint yang sesuai
4. Tampilkan tabel sesuai type

### Konfigurasi per type:

| Type | Endpoint | Kolom Tabel |
|------|----------|-------------|
| `terlambat` | `/dashboard/terlambat` | No, Nama, NIP, Divisi, Jam Masuk, Jam Standar, Keterlambatan (menit) |
| `hadir` | `/dashboard/hadir` | No, Nama, NIP, Divisi, Jam Masuk |
| `tidak-hadir` | `/dashboard/tidak-hadir` | No, Nama, NIP, Divisi |

### Fitur yang harus ada:

- Tombol "Kembali" yang navigate ke "/" (dashboard)
- Tampilkan tanggal hari ini di bawah judul
- Tampilkan total jumlah karyawan di bawah tabel
- Badge warna kuning untuk keterlambatan dengan format "+X menit"
- `EmptyState` kalau data kosong
- `LoadingSpinner` saat loading

### Kode lengkap:

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const PAGE_CONFIG = {
  terlambat: {
    title: "Karyawan Terlambat Hari Ini",
    endpoint: "/dashboard/terlambat",
    columns: ["No", "Nama", "NIP", "Divisi", "Jam Masuk", "Jam Standar", "Keterlambatan"],
  },
  hadir: {
    title: "Karyawan Hadir Hari Ini",
    endpoint: "/dashboard/hadir",
    columns: ["No", "Nama", "NIP", "Divisi", "Jam Masuk"],
  },
  "tidak-hadir": {
    title: "Karyawan Tidak Hadir Hari Ini",
    endpoint: "/dashboard/tidak-hadir",
    columns: ["No", "Nama", "NIP", "Divisi"],
  },
};

export default function DetailDashboard() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const config = PAGE_CONFIG[type];

  useEffect(() => {
    if (!config) return;
    api
      .get(config.endpoint)
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  if (!config) {
    return <EmptyState message="Halaman tidak ditemukan" />;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header d-flex align-items-center gap-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate("/")}
        >
          <i className="bi bi-arrow-left" /> Kembali
        </button>
        <div>
          <h4>{config.title}</h4>
          <small className="text-muted">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </small>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {data.length === 0 ? (
            <EmptyState
              message={`Tidak ada data ${config.title.toLowerCase()}`}
              icon="bi-check-circle"
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    {config.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{item.nama}</td>
                      <td><code>{item.nip}</code></td>
                      <td>{item.divisi}</td>
                      {type !== "tidak-hadir" && <td>{item.jam_masuk}</td>}
                      {type === "terlambat" && (
                        <>
                          <td>{item.jam_standar}</td>
                          <td>
                            <span className="badge bg-warning text-dark">
                              +{item.keterlambatan} menit
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <small className="text-muted">
          Total: {data.length} karyawan
        </small>
      </div>
    </div>
  );
}
```

---

## File 3: `src/App.jsx`

### Yang diubah:

1. Import `DetailDashboard` dari `./pages/DetailDashboard`
2. Tambah 3 route baru di dalam `<Routes>`, setelah route Dashboard

### Kode yang ditambahkan:

```jsx
import DetailDashboard from "./pages/DetailDashboard";

// di dalam <Routes>, setelah route Dashboard:
<Route path="/dashboard/terlambat" element={<DetailDashboard />} />
<Route path="/dashboard/hadir" element={<DetailDashboard />} />
<Route path="/dashboard/tidak-hadir" element={<DetailDashboard />} />
```

---

## File 4 (Opsional): `src/index.css` atau `src/App.css`

Tambah hover effect di stat-card supaya ada animasi waktu hover:

```css
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}
```

---

## Ringkasan

| Apa | Keterangan |
|-----|------------|
| **Backend** | 3 endpoint baru, sudah push ke `be` |
| **FE File 1** | `Dashboard.jsx` — card jadi clickable |
| **FE File 2** | `DetailDashboard.jsx` — komponen baru (reusable untuk 3 type) |
| **FE File 3** | `App.jsx` — tambah 3 route |
| **FE File 4** | CSS opsional — hover effect |
| **Total endpoint** | 28 (25 asli + SSE stream + 3 dashboard detail) |

Backend commit: `34b136f2` di branch `be`
