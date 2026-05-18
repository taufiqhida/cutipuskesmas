export const LEAVE_TYPE_LABELS = {
  cuti_tahunan: "Cuti Tahunan",
  cuti_bersama: "Cuti Bersama",
  cuti_sakit: "Cuti Sakit",
  cuti_melahirkan: "Cuti Melahirkan",
  cuti_alasan_penting: "Cuti Karena Alasan Penting",
  cuti_luar_tanggungan: "Cuti di Luar Tanggungan Negara",
  cuti_besar: "Cuti Besar",
};

export const STATUS_LABELS = {
  menunggu: "Menunggu Keputusan",
  disetujui: "Disetujui",
  perubahan: "Perubahan",
  ditangguhkan: "Ditangguhkan",
  tidak_disetujui: "Tidak Disetujui",
};

export const STATUS_VARIANTS = {
  menunggu: "bg-amber-100 text-amber-900 border-amber-300",
  disetujui: "bg-emerald-100 text-emerald-900 border-emerald-300",
  perubahan: "bg-sky-100 text-sky-900 border-sky-300",
  ditangguhkan: "bg-orange-100 text-orange-900 border-orange-300",
  tidak_disetujui: "bg-rose-100 text-rose-900 border-rose-300",
};

export const ROLE_LABELS = {
  admin: "Administrator",
  kepala: "Kepala Puskesmas",
  pegawai: "Pegawai",
};

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export function formatTanggalID(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function diffDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}
