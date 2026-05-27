import React, { useEffect, useState } from "react";
import api, { API, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { LEAVE_TYPE_LABELS, formatTanggalID } from "@/lib/constants";
import { CheckCircle2, Pencil, XCircle, FileText, Trash2, Send, History as HistoryIcon, Search } from "lucide-react";

function HistoryDialog({ open, onOpenChange, request }) {
  if (!request) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Histori — {request.user_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {(request.history || []).map((h, i) => (
            <div key={i} className="border-l-2 border-stone-200 pl-3">
              <div className="text-xs text-stone-500">{formatTanggalID(h.at)} · {new Date(h.at).toLocaleTimeString("id-ID")}</div>
              <div className="font-semibold text-sm">{h.by} · {h.action}</div>
              <div className="text-sm text-stone-700">{h.note}</div>
            </div>
          ))}
          {(request.history || []).length === 0 && <div className="text-stone-500 text-sm">Belum ada histori</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionDialog({ open, onOpenChange, request, onDone }) {
  const [action, setAction] = useState("acc");
  const [formNo, setFormNo] = useState("");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [formNoCheck, setFormNoCheck] = useState(null);

  useEffect(() => {
    if (request && open) {
      setAction("acc"); setFormNo(""); setCatatan(""); setFormNoCheck(null);
    }
  }, [request, open]);

  const checkFormNo = async () => {
    if (!formNo.trim()) return;
    try {
      const r = await api.get(`/admin/check-form-no`, { params: { form_no: formNo.trim() } });
      setFormNoCheck(r.data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/leave-requests/${request.id}/admin-action`, {
        action,
        form_no: action === "acc" ? formNo : undefined,
        catatan,
      });
      toast.success("Aksi berhasil dijalankan");
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally { setBusy(false); }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Proses Pengajuan — {request.user_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-stone-500">Jenis:</span> {LEAVE_TYPE_LABELS[request.jenis_cuti]}</div>
              <div><span className="text-stone-500">Lama:</span> {request.lamanya} hari</div>
              <div className="col-span-2"><span className="text-stone-500">Periode:</span> {formatTanggalID(request.tanggal_mulai)} – {formatTanggalID(request.tanggal_selesai)}</div>
              <div className="col-span-2"><span className="text-stone-500">Alasan:</span> {request.alasan}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aksi</Label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" data-testid="action-acc"
                onClick={() => setAction("acc")}
                className={`p-3 rounded-md border text-sm font-semibold transition-colors ${
                  action === "acc" ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-stone-200 hover:bg-stone-50"
                }`}>
                <CheckCircle2 className="w-4 h-4 inline mr-1" /> ACC + Kirim
              </button>
              <button type="button" data-testid="action-revisi"
                onClick={() => setAction("revisi")}
                className={`p-3 rounded-md border text-sm font-semibold transition-colors ${
                  action === "revisi" ? "border-sky-500 bg-sky-50 text-sky-900" : "border-stone-200 hover:bg-stone-50"
                }`}>
                <Pencil className="w-4 h-4 inline mr-1" /> Revisi
              </button>
              <button type="button" data-testid="action-tolak"
                onClick={() => setAction("tolak")}
                className={`p-3 rounded-md border text-sm font-semibold transition-colors ${
                  action === "tolak" ? "border-rose-500 bg-rose-50 text-rose-900" : "border-stone-200 hover:bg-stone-50"
                }`}>
                <XCircle className="w-4 h-4 inline mr-1" /> Tolak
              </button>
            </div>
          </div>

          {action === "acc" && (
            <div className="space-y-2">
              <Label>Nomor Surat</Label>
              <div className="flex gap-2">
                <Input data-testid="input-admin-form-no" value={formNo} onChange={(e) => { setFormNo(e.target.value); setFormNoCheck(null); }} placeholder="B/001/851/06/2026" className="font-mono" />
                <Button type="button" variant="outline" onClick={checkFormNo}><Search className="w-4 h-4 mr-1" /> Cek</Button>
              </div>
              {formNoCheck && (
                formNoCheck.used ? (
                  <div className="text-xs p-2 rounded bg-rose-50 border border-rose-200 text-rose-900">
                    ⚠️ Sudah digunakan: {formNoCheck.pegawai} ({formNoCheck.status}){formNoCheck.deleted_at ? ` — dihapus oleh ${formNoCheck.deleted_by}` : ""}
                  </div>
                ) : (
                  <div className="text-xs p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">✓ Nomor surat tersedia</div>
                )
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Catatan Admin {action !== "acc" && <span className="text-rose-500">*</span>}</Label>
            <Textarea data-testid="input-catatan-admin" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={action === "acc" ? "Catatan opsional" : "Jelaskan alasan revisi / penolakan"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={busy || (action === "acc" && !formNo.trim()) || (action !== "acc" && !catatan.trim())} className="bg-[#1A4331] hover:bg-[#133224]" data-testid="confirm-admin-action">
            {action === "acc" ? <><Send className="w-4 h-4 mr-1" /> Kirim ke Kepala</> : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestRow({ r, onAction, onDelete, onHistory, openPdf, showDelete = true }) {
  return (
    <TableRow data-testid={`admin-row-${r.id}`}>
      <TableCell className="font-mono text-xs">{r.form_no || <span className="text-stone-400">—</span>}</TableCell>
      <TableCell className="font-medium">{r.user_name}</TableCell>
      <TableCell className="text-sm">{LEAVE_TYPE_LABELS[r.jenis_cuti]}</TableCell>
      <TableCell className="text-xs">{formatTanggalID(r.tanggal_mulai)} – {formatTanggalID(r.tanggal_selesai)}</TableCell>
      <TableCell>{r.lamanya} hari</TableCell>
      <TableCell><StatusBadge status={r.status} /></TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button variant="ghost" size="sm" onClick={() => onHistory(r)} title="Histori"><HistoryIcon className="w-4 h-4" /></Button>
        {r.form_no && (
          <Button variant="ghost" size="sm" onClick={() => openPdf(r.id)} title="PDF"><FileText className="w-4 h-4" /></Button>
        )}
        {onAction && r.status === "menunggu_admin" && (
          <Button variant="default" size="sm" className="bg-[#1A4331] hover:bg-[#133224] ml-1" onClick={() => onAction(r)} data-testid={`process-btn-${r.id}`}>Proses</Button>
        )}
        {showDelete && r.status !== "dihapus" && (
          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => onDelete(r)} title="Hapus"><Trash2 className="w-4 h-4" /></Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function AdminInbox() {
  const [tab, setTab] = useState("menunggu_admin");
  const [all, setAll] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [active, setActive] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const load = async () => {
    const [a, d] = await Promise.all([
      api.get("/leave-requests?scope=all"),
      api.get("/leave-requests?scope=deleted"),
    ]);
    setAll(a.data);
    setDeleted(d.data);
  };
  useEffect(() => { load(); }, []);

  const openPdf = (id) => {
    const token = localStorage.getItem("cuti_token");
    window.open(`${API}/leave-requests/${id}/pdf?token=${encodeURIComponent(token)}`, "_blank");
  };

  const onDelete = async (r) => {
    const reason = window.prompt(`Alasan hapus pengajuan "${r.form_no || r.user_name}":`);
    if (reason === null) return;
    try {
      const res = await api.delete(`/leave-requests/${r.id}`, { data: { reason } });
      toast.success(res.data?.refunded ? "Pengajuan dihapus + saldo cuti dikembalikan" : "Pengajuan dihapus");
      load();
    } catch (err) { toast.error(formatApiError(err?.response?.data?.detail)); }
  };

  const checkFormNoSearch = async () => {
    if (!search.trim()) return;
    try {
      const r = await api.get(`/admin/check-form-no`, { params: { form_no: search.trim() } });
      setSearchResult(r.data);
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
  };

  const filter = (status) => all.filter((r) => r.status === status);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Administrator</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black">Inbox Pengajuan Cuti</h1>
        <p className="text-stone-600 text-sm mt-1">Tinjau pengajuan dari pegawai, beri nomor surat, dan teruskan ke Kepala UPTD Puskesmas Bugangan.</p>
      </div>

      <Card className="border-stone-200">
        <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Search className="w-5 h-5" /> Cek / Validasi Nomor Surat</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-xl">
            <Input data-testid="search-form-no" placeholder="Cari nomor surat (mis. B/001/851/06/2026)" value={search} onChange={(e) => { setSearch(e.target.value); setSearchResult(null); }} className="font-mono" />
            <Button onClick={checkFormNoSearch} className="bg-[#1A4331] hover:bg-[#133224]"><Search className="w-4 h-4 mr-1" /> Cek</Button>
          </div>
          {searchResult && (
            <div className={`mt-3 p-3 rounded-md border text-sm ${searchResult.used ? "bg-stone-50 border-stone-300" : "bg-emerald-50 border-emerald-300 text-emerald-900"}`}>
              {!searchResult.used ? <span>✓ Nomor surat <b>{search}</b> belum pernah digunakan.</span> : (
                <div className="space-y-1">
                  <div><b>Status:</b> {searchResult.status} {searchResult.deleted_at ? "(record sudah dihapus admin)" : ""}</div>
                  <div><b>Pegawai:</b> {searchResult.pegawai}</div>
                  <div><b>Periode:</b> {formatTanggalID(searchResult.tanggal_mulai)} – {formatTanggalID(searchResult.tanggal_selesai)}</div>
                  {searchResult.deleted_at && <div><b>Dihapus oleh:</b> {searchResult.deleted_by} pada {formatTanggalID(searchResult.deleted_at)} — alasan: {searchResult.deleted_reason || "-"}</div>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="menunggu_admin" data-testid="tab-menunggu-admin">Menunggu Admin ({filter("menunggu_admin").length})</TabsTrigger>
          <TabsTrigger value="menunggu_kepala" data-testid="tab-menunggu-kepala">Di Kepala ({filter("menunggu_kepala").length})</TabsTrigger>
          <TabsTrigger value="selesai" data-testid="tab-selesai">Selesai</TabsTrigger>
          <TabsTrigger value="dihapus" data-testid="tab-dihapus">Dihapus ({deleted.length})</TabsTrigger>
        </TabsList>

        {["menunggu_admin", "menunggu_kepala"].map((s) => (
          <TabsContent key={s} value={s}>
            <Card className="border-stone-200">
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>No. Surat</TableHead><TableHead>Pegawai</TableHead><TableHead>Jenis</TableHead>
                    <TableHead>Periode</TableHead><TableHead>Lama</TableHead><TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filter(s).map((r) => (
                      <RequestRow key={r.id} r={r} onAction={s === "menunggu_admin" ? setActive : null} onDelete={onDelete} onHistory={setHistoryRow} openPdf={openPdf} />
                    ))}
                    {filter(s).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-stone-500">Tidak ada pengajuan</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="selesai">
          <Card className="border-stone-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>No. Surat</TableHead><TableHead>Pegawai</TableHead><TableHead>Jenis</TableHead>
                  <TableHead>Periode</TableHead><TableHead>Lama</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {all.filter((r) => ["disetujui","perubahan","ditangguhkan","tidak_disetujui","ditolak_admin","revisi"].includes(r.status)).map((r) => (
                    <RequestRow key={r.id} r={r} onDelete={onDelete} onHistory={setHistoryRow} openPdf={openPdf} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dihapus">
          <Card className="border-stone-200">
            <CardHeader><CardTitle className="font-heading text-base">Histori Hapus</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>No. Surat</TableHead><TableHead>Pegawai</TableHead><TableHead>Periode</TableHead>
                  <TableHead>Dihapus Oleh</TableHead><TableHead>Tgl Hapus</TableHead><TableHead>Alasan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {deleted.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.form_no || "—"}</TableCell>
                      <TableCell>{r.user_name}</TableCell>
                      <TableCell className="text-xs">{formatTanggalID(r.tanggal_mulai)} – {formatTanggalID(r.tanggal_selesai)}</TableCell>
                      <TableCell>{r.deleted_by}</TableCell>
                      <TableCell className="text-xs">{formatTanggalID(r.deleted_at)}</TableCell>
                      <TableCell className="text-xs">{r.deleted_reason || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setHistoryRow(r)}><HistoryIcon className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deleted.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-stone-500">Belum ada pengajuan yang dihapus</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ActionDialog open={!!active} onOpenChange={(v) => !v && setActive(null)} request={active} onDone={load} />
      <HistoryDialog open={!!historyRow} onOpenChange={(v) => !v && setHistoryRow(null)} request={historyRow} />
    </div>
  );
}
