import React, { useEffect, useState } from "react";
import api, { API, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { LEAVE_TYPE_LABELS, formatTanggalID } from "@/lib/constants";
import { CheckCircle2, XCircle, Clock, Pencil, FileText, ChevronRight } from "lucide-react";

export default function KepalaDashboard({ mode = "pending" }) {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState(null);
  const [decision, setDecision] = useState("disetujui");
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/leave-requests?scope=${mode === "pending" ? "pending" : "all"}`).then((r) => {
      const list = mode === "history" ? r.data.filter((x) => x.status !== "menunggu") : r.data;
      setRows(list);
    });
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode]);

  const decide = async () => {
    setBusy(true);
    try {
      await api.post(`/leave-requests/${active.id}/decide`, { decision, pesan });
      toast.success("Keputusan disimpan");
      setActive(null); setPesan(""); setDecision("disetujui");
      load();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const openPdf = (id) => {
    const token = localStorage.getItem("cuti_token");
    window.open(`${API}/leave-requests/${id}/pdf?token=${encodeURIComponent(token)}`, "_blank");
  };

  const decisionIcons = {
    disetujui: <CheckCircle2 className="w-4 h-4" />,
    perubahan: <Pencil className="w-4 h-4" />,
    ditangguhkan: <Clock className="w-4 h-4" />,
    tidak_disetujui: <XCircle className="w-4 h-4" />,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Kepala Puskesmas</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black">
            {mode === "pending" ? "Antrian Persetujuan" : "Riwayat Keputusan"}
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            {mode === "pending" ? "Tinjau dan putuskan pengajuan cuti yang masuk." : "Daftar pengajuan yang telah Anda proses."}
          </p>
        </div>
        {mode === "pending" && (
          <div className="text-right">
            <div className="font-heading text-4xl font-black text-[#1A4331]">{rows.filter((r) => r.status === "menunggu").length}</div>
            <div className="text-xs uppercase tracking-wider text-stone-500">Menunggu</div>
          </div>
        )}
      </div>

      {mode === "pending" && (
        <div className="hidden" />
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {rows.map((r) => (
          <Card key={r.id} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-mono text-stone-500 mb-1">{r.form_no}</div>
                  <div className="font-heading text-lg font-bold">{r.user_name}</div>
                  <div className="text-xs text-stone-600">{LEAVE_TYPE_LABELS[r.jenis_cuti]}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Mulai</div>
                  <div className="font-medium">{formatTanggalID(r.tanggal_mulai)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Selesai</div>
                  <div className="font-medium">{formatTanggalID(r.tanggal_selesai)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Alasan</div>
                  <div className="text-sm">{r.alasan}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Lamanya</div>
                  <div className="font-bold text-[#1A4331]">{r.lamanya} hari</div>
                </div>
              </div>
              {r.pesan_kepala && (
                <div className="bg-stone-50 border border-stone-200 rounded p-3 text-xs mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Catatan Kepala</div>
                  {r.pesan_kepala}
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-stone-200">
                <Button variant="ghost" size="sm" onClick={() => openPdf(r.id)}>
                  <FileText className="w-4 h-4 mr-1" /> Lihat PDF
                </Button>
                {r.status === "menunggu" && mode === "pending" && (
                  <Button
                    data-testid={`process-btn-${r.id}`}
                    className="bg-[#1A4331] hover:bg-[#133224]"
                    onClick={() => setActive(r)}
                  >
                    Proses <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="border-stone-200 border-dashed lg:col-span-2">
            <CardContent className="p-12 text-center text-stone-500">
              {mode === "pending" ? "Tidak ada antrian. Semua sudah diproses." : "Belum ada riwayat keputusan."}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Pertimbangan Kepala</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded p-4 text-sm">
                <div className="font-semibold">{active.user_name}</div>
                <div className="text-xs text-stone-600">{LEAVE_TYPE_LABELS[active.jenis_cuti]} · {active.lamanya} hari</div>
                <div className="text-xs text-stone-600 mt-1">{formatTanggalID(active.tanggal_mulai)} – {formatTanggalID(active.tanggal_selesai)}</div>
                <div className="text-sm mt-2"><span className="text-xs text-stone-500">Alasan: </span>{active.alasan}</div>
              </div>
              <div className="space-y-2">
                <Label>Keputusan</Label>
                <Select value={decision} onValueChange={setDecision}>
                  <SelectTrigger data-testid="decision-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disetujui">Disetujui</SelectItem>
                    <SelectItem value="perubahan">Perubahan</SelectItem>
                    <SelectItem value="ditangguhkan">Ditangguhkan</SelectItem>
                    <SelectItem value="tidak_disetujui">Tidak Disetujui</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pesan / Catatan (opsional)</Label>
                <Textarea data-testid="decision-pesan" rows={4} value={pesan} onChange={(e) => setPesan(e.target.value)} placeholder="Catatan untuk pegawai..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Batal</Button>
            <Button data-testid="confirm-decision-btn" className="bg-[#1A4331] hover:bg-[#133224]" disabled={busy} onClick={decide}>
              {decisionIcons[decision]} <span className="ml-1">Simpan Keputusan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
