import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Password lama wajib diisi"),
    new_password: z.string().min(6, "Password baru minimal 6 karakter"),
    new_password_confirmation: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: "Konfirmasi password tidak cocok",
    path: ["new_password_confirmation"],
  });

export const divisiSchema = z.object({
  nama_divisi: z.string().min(1, "Nama divisi wajib diisi"),
});

export const karyawanSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  nip: z.string().min(1, "NIP wajib diisi"),
  jabatan: z.string().optional(),
  divisi_id: z.string().optional(),
  rfid_uid: z.string().min(1, "RFID UID wajib diisi"),
  status: z.string().default("aktif"),
});

export const jadwalSchema = z.object({
  jam_masuk_standar: z.string().min(1, "Jam masuk wajib diisi"),
  jam_pulang_standar: z.string().min(1, "Jam pulang wajib diisi"),
  toleransi_menit: z.coerce.number().min(0, "Toleransi minimal 0 menit"),
});

// Keterangan wajib untuk status Izin (sesuai placeholder di form)
export const absensiManualSchema = z
  .object({
    employee_id: z.string().min(1, "Karyawan wajib dipilih"),
    tanggal: z.string().min(1, "Tanggal wajib diisi"),
    status: z.string().default("Hadir"),
    jam_masuk: z.string().optional(),
    jam_pulang: z.string().optional(),
    keterangan: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "Izin" && !data.keterangan?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keterangan"],
        message: "Keterangan wajib diisi untuk status Izin",
      });
    }
  });

export const absensiUpdateSchema = z
  .object({
    status: z.string().min(1, "Status wajib dipilih"),
    jam_pulang: z.string().optional(),
    keterangan: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "Izin" && !data.keterangan?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keterangan"],
        message: "Keterangan wajib diisi untuk status Izin",
      });
    }
  });
