import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./axios";

// Normalize list responses: { data: { data: [...] } } (paginated) OR { data: [...] }
export const normalizeList = (res) => {
  const raw = res?.data?.data;
  if (Array.isArray(raw)) return raw;
  return Array.isArray(raw?.data) ? raw.data : [];
};

// Ambil semua karyawan dengan loop pagination (ceiling 500 hardcoded bisa memotong karyawan ke-501+)
export async function fetchAllKaryawan(params = {}) {
  const perPage = 100;
  let page = 1;
  const all = [];
  while (true) {
    const res = await api.get("/karyawan", { params: { ...params, per_page: perPage, page } });
    const items = normalizeList(res);
    all.push(...items);
    // ponytail: loop sampai halaman terakhir; pakai meta.last_page jika butuh lebih tepat
    if (items.length < perPage) return all;
    page++;
  }
}

export const karyawanKeys = {
  all: ["karyawan"],
  detail: (id) => ["karyawan", id],
  absensi: (id) => ["karyawan", id, "absensi"],
};

export const divisiKeys = {
  all: ["divisi"],
  detail: (id) => ["divisi", id],
};

export const laporanKeys = {
  all: ["laporan"],
  filtered: (params) => ["laporan", params],
};

// === QUERIES ===
export function useKaryawanList() {
  return useQuery({
    queryKey: karyawanKeys.all,
    // Backend sudah paginate; ambil satu halaman besar biar pencarian client-side tetap kena semua data.
    queryFn: () => fetchAllKaryawan(),
  });
}

export function useKaryawanDetail(id) {
  return useQuery({
    queryKey: karyawanKeys.detail(id),
    queryFn: async () => (await api.get(`/karyawan/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function useKaryawanAbsensi(id) {
  return useQuery({
    queryKey: karyawanKeys.absensi(id),
    queryFn: async () => {
      const perPage = 100;
      let page = 1;
      let list = [];
      while (true) {
        const res = await api.get(`/karyawan/${id}/absensi`, {
          params: { per_page: perPage, page },
        });
        // Backend kirim { employee, absensi, summary }
        const payload = res.data.data;
        const data = payload?.absensi ?? payload?.riwayat;
        const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        list = [...list, ...items];
        if (items.length < perPage) break;
        page++;
      }
      return list;
    },
    enabled: Boolean(id),
  });
}

export function useDivisiList() {
  return useQuery({
    queryKey: divisiKeys.all,
    queryFn: async () => normalizeList(await api.get("/divisi")),
  });
}

export function useDivisiDetail(id) {
  return useQuery({
    queryKey: divisiKeys.detail(id),
    queryFn: async () => (await api.get(`/divisi/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function useLaporan(params, options = {}) {
  return useQuery({
    queryKey: laporanKeys.filtered(params),
    queryFn: async () => normalizeList(await api.get("/laporan", { params })),
    enabled: Boolean(params?.dari && params?.sampai),
    ...options,
  });
}

export function useLaporanGrafik(params, options = {}) {
  return useQuery({
    queryKey: ["laporan", "grafik", params],
    queryFn: async () => (await api.get("/laporan/grafik", { params })).data.data,
    enabled: Boolean(params?.dari && params?.sampai && params?.periode),
    ...options,
  });
}

export function useJadwal() {
  return useQuery({
    queryKey: ["jadwal"],
    queryFn: async () => (await api.get("/jadwal")).data.data,
  });
}

export function useDashboardDetail(type) {
  return useQuery({
    queryKey: ["dashboard", type],
    queryFn: async () => normalizeList(await api.get(`/dashboard/${type}`)),
    enabled: Boolean(type),
  });
}

// === MUTATIONS ===
export function useCreateKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/karyawan", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: karyawanKeys.all }),
  });
}

export function useUpdateKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/karyawan/${id}`, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: karyawanKeys.all });
      qc.invalidateQueries({ queryKey: karyawanKeys.detail(id) });
    },
  });
}

export function useDeleteKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/karyawan/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: karyawanKeys.all }),
  });
}

export function useCreateDivisi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/divisi", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: divisiKeys.all }),
  });
}

export function useUpdateDivisi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/divisi/${id}`, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: divisiKeys.all });
      qc.invalidateQueries({ queryKey: divisiKeys.detail(id) });
    },
  });
}

export function useDeleteDivisi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/divisi/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: divisiKeys.all }),
  });
}

export function useUpdateJadwal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put("/jadwal", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jadwal"] }),
  });
}

export function useCreateAbsensiManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/absensi/manual", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: laporanKeys.all }),
  });
}

export function useUpdateAbsensi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/absensi/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: laporanKeys.all });
      qc.invalidateQueries({ queryKey: karyawanKeys.all });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload) => api.post("/change-password", payload),
  });
}
