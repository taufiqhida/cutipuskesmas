import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { API, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { LEAVE_TYPE_LABELS, formatTanggalID } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, CalendarDays, Wallet, Pencil, Check, X } from "lucide-react";

const BALANCE_LABELS = {
  cuti_tahunan: "Cuti Tahunan",
  cuti_besar: "Cuti Besar",
  cuti_sakit: "Cuti Sakit",
  cuti_melahirkan: "Cuti Melahirkan",
  cuti_alasan_penting: "Cuti Alasan Penting",
  cuti_luar_tanggungan: "Cuti Luar Tanggungan Negara",
};

export default function PegawaiDashboard() {
  const { user, setUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const refresh = async () => {
    const [me, lr] = await Promise.all([
      api.get("/auth/me"),
      api.get("/leave-requests?scope=mine"),
    ]);
    setUser(me.data);
    setRows(lr.data);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const openPdf = (id) => {
    const token = localStorage.getItem("cuti_token");
    window.open(`${API}/leave-requests/${id}/pdf?token=${encodeURIComponent(token)}`, "_blank");
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditValue(r.form_no);
  };
  const cancelEdit = () => { setEditingId(null); setEditValue(""); };
  const saveFormNo = async (id) => {
    try {
      await api.put(`/leave-requests/${id}/form-no`, { form_no: editValue });
      toast.success("Nomor surat diperbarui");
      cancelEdit();
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    }
  };

  const balances = user?.balances || {};
  const stats = {
    total: rows.length,
    disetujui: rows.filter((r) => r.status === "disetujui").length,
    menunggu: rows.filter((r) => r.status === "menunggu").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Pegawai</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black">Halo, {user?.name?.split(" ")[0]}</h1>
          <p className="text-stone-600 text-sm mt-1">{user?.jabatan} · {user?.unit_kerja}</p>
        </div>
        <Link to="/pegawai/ajukan">
          <Button data-testid="goto-ajukan-btn" className="bg-[#1A4331] hover:bg-[#133224]">
            <Plus className="w-4 h-4 mr-1" /> Ajukan Cuti
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-stone-200 bg-[#1A4331] text-white">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-white/70">Total Pengajuan</div>
            <div className="font-heading text-4xl font-black mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200"><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-stone-500">Disetujui</div>
          <div className="font-heading text-4xl font-black mt-1 text-emerald-700">{stats.disetujui}</div>
        </CardContent></Card>
        <Card className="border-stone-200"><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-stone-500">Menunggu</div>
          <div className="font-heading text-4xl font-black mt-1 text-amber-700">{stats.menunggu}</div>
        </CardContent></Card>
        <Card className="border-stone-200"><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-stone-500">Sisa Cuti Tahunan</div>
          <div className="font-heading text-4xl font-black mt-1 text-[#1A4331]">{balances.cuti_tahunan ?? 0}</div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mt-1">hari</div>
        </CardContent></Card>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2"><Wallet className="w-5 h-5" /> Saldo Cuti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(BALANCE_LABELS).map(([k, lbl]) => (
              <div key={k} className="border border-stone-200 rounded-md p-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500">{lbl}</div>
                <div className="font-heading text-2xl font-black mt-1">{balances[k] ?? 0}</div>
                <div className="text-[10px] text-stone-500">hari</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Riwayat Pengajuan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Formulir</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Lama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan Kepala</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid={`request-row-${r.id}`}>
                  <TableCell className="font-mono text-xs">
                    {editingId === r.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-xs font-mono w-44"
                          data-testid={`edit-form-no-input-${r.id}`}
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-700" onClick={() => saveFormNo(r.id)} data-testid={`save-form-no-${r.id}`}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-stone-500" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span>{r.form_no}</span>
                        {r.status === "menunggu" && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(r)} data-testid={`edit-form-no-${r.id}`} title="Edit nomor surat">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{LEAVE_TYPE_LABELS[r.jenis_cuti]}</TableCell>
                  <TableCell className="text-xs">{formatTanggalID(r.tanggal_mulai)} – {formatTanggalID(r.tanggal_selesai)}</TableCell>
                  <TableCell>{r.lamanya} hari</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-stone-600 max-w-[200px] truncate">{r.pesan_kepala || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openPdf(r.id)} data-testid={`pdf-btn-${r.id}`}>
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-stone-500 py-8">
                  Belum ada pengajuan. <Link to="/pegawai/ajukan" className="text-[#1A4331] font-semibold">Ajukan sekarang →</Link>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
