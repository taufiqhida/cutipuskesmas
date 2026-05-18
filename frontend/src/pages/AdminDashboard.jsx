import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, ShieldCheck, Wallet } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

const EMPTY = {
  email: "", password: "", name: "", nik: "", is_asn: false, nip: "",
  jabatan: "", masa_kerja_tahun: 0, masa_kerja_bulan: 0,
  unit_kerja: "UPTD Puskesmas Bugangan", alamat: "", telepon: "", role: "pegawai",
  signature_base64: null,
  balances: { cuti_tahunan: 12, cuti_besar: 0, cuti_sakit: 12, cuti_melahirkan: 90, cuti_alasan_penting: 30, cuti_luar_tanggungan: 0 },
};

function UserDialog({ open, onOpenChange, initial, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (initial) setForm({ ...EMPTY, ...initial, password: "" });
    else setForm(EMPTY);
  }, [initial, open]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, signature_base64: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      await onSave(payload, initial);
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal menyimpan");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Edit Pegawai" : "Tambah Pegawai"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="data" className="mt-2">
          <TabsList>
            <TabsTrigger value="data" data-testid="tab-data">Data Pegawai</TabsTrigger>
            <TabsTrigger value="balances" data-testid="tab-balances">Saldo Cuti</TabsTrigger>
            <TabsTrigger value="signature" data-testid="tab-signature">Tanda Tangan</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input data-testid="input-nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input data-testid="input-email" type="email" disabled={isEdit} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Password {isEdit && <span className="text-xs text-stone-500">(kosongkan jika tidak diubah)</span>}</Label>
                <Input data-testid="input-password" type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Peran</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="input-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="kepala">Kepala Puskesmas</SelectItem>
                    <SelectItem value="pegawai">Pegawai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end gap-3 col-span-2">
                <div className="flex items-center gap-3">
                  <Switch data-testid="input-is-asn" checked={form.is_asn} onCheckedChange={(v) => setForm({ ...form, is_asn: v })} />
                  <Label>Status ASN (PNS/PPPK)</Label>
                </div>
              </div>
              {form.is_asn ? (
                <div className="space-y-2">
                  <Label>NIP</Label>
                  <Input data-testid="input-nip" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>NIK (untuk Non ASN)</Label>
                  <Input data-testid="input-nik" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Jabatan</Label>
                <Input data-testid="input-jabatan" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Masa Kerja (Tahun)</Label>
                <Input type="number" min="0" value={form.masa_kerja_tahun} onChange={(e) => setForm({ ...form, masa_kerja_tahun: parseInt(e.target.value || 0) })} />
              </div>
              <div className="space-y-2">
                <Label>Masa Kerja (Bulan)</Label>
                <Input type="number" min="0" max="11" value={form.masa_kerja_bulan} onChange={(e) => setForm({ ...form, masa_kerja_bulan: parseInt(e.target.value || 0) })} />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input data-testid="input-telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Alamat</Label>
                <Textarea data-testid="input-alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="balances" className="space-y-4 pt-4">
            <p className="text-sm text-stone-600">Atur saldo cuti awal pegawai. Saldo otomatis berkurang ketika cuti disetujui Kepala.</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries({
                cuti_tahunan: "Cuti Tahunan",
                cuti_besar: "Cuti Besar",
                cuti_sakit: "Cuti Sakit",
                cuti_melahirkan: "Cuti Melahirkan",
                cuti_alasan_penting: "Cuti Karena Alasan Penting",
                cuti_luar_tanggungan: "Cuti di Luar Tanggungan Negara",
              }).map(([k, lbl]) => (
                <div key={k} className="space-y-2">
                  <Label>{lbl} (hari)</Label>
                  <Input
                    data-testid={`input-saldo-${k}`}
                    type="number" min="0"
                    value={form.balances?.[k] ?? 0}
                    onChange={(e) => setForm({ ...form, balances: { ...form.balances, [k]: parseInt(e.target.value || 0) } })}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="signature" className="space-y-4 pt-4">
            <p className="text-sm text-stone-600">Upload gambar tanda tangan (PNG/JPG dengan latar transparan/putih). Akan tertanam pada formulir cuti yang dicetak, beserta QR code verifikasi.</p>
            <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center">
              {form.signature_base64 ? (
                <img src={form.signature_base64} alt="TTD" className="max-h-32 mx-auto" />
              ) : (
                <div className="text-stone-400 text-sm">Belum ada tanda tangan</div>
              )}
              <label className="mt-4 inline-flex items-center gap-2 cursor-pointer text-[#1A4331] font-medium text-sm">
                <Upload className="w-4 h-4" /> Pilih file
                <input data-testid="input-signature-file" type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
              {form.signature_base64 && (
                <Button variant="ghost" size="sm" className="ml-3" onClick={() => setForm({ ...form, signature_base64: null })}>Hapus</Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="cancel-user-btn">Batal</Button>
          <Button onClick={save} className="bg-[#1A4331] hover:bg-[#133224]" data-testid="save-user-btn">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const r = await api.get("/users");
    setUsers(r.data);
  };
  useEffect(() => { load(); }, []);

  const onSave = async (payload, initial) => {
    if (initial?.id) {
      await api.put(`/users/${initial.id}`, payload);
      toast.success("Data pegawai diperbarui");
    } else {
      await api.post("/users", payload);
      toast.success("Pegawai berhasil ditambahkan");
    }
    await load();
  };

  const del = async (u) => {
    if (!window.confirm(`Hapus akun ${u.name}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success("Pegawai dihapus");
      await load();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    }
  };

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    kepala: users.filter((u) => u.role === "kepala").length,
    pegawai: users.filter((u) => u.role === "pegawai").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Administrator</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black">Manajemen Pegawai</h1>
          <p className="text-stone-600 text-sm mt-1">Kelola akun, peran, saldo cuti & tanda tangan digital seluruh staf.</p>
        </div>
        <Button data-testid="add-user-btn" className="bg-[#1A4331] hover:bg-[#133224]" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Tambah Pegawai
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { lbl: "Total Akun", val: stats.total, icon: ShieldCheck },
          { lbl: "Administrator", val: stats.admin, icon: ShieldCheck },
          { lbl: "Kepala", val: stats.kepala, icon: ShieldCheck },
          { lbl: "Pegawai", val: stats.pegawai, icon: Wallet },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-stone-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-500">{s.lbl}</div>
                    <div className="font-heading text-3xl font-black mt-1">{s.val}</div>
                  </div>
                  <Icon className="w-5 h-5 text-stone-400" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="font-heading">Daftar Pegawai</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIP / NIK</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-mono text-xs">{u.is_asn ? u.nip : u.nik || "Non ASN"}</TableCell>
                  <TableCell>{u.jabatan}</TableCell>
                  <TableCell>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#1A4331]">{ROLE_LABELS[u.role]}</span>
                  </TableCell>
                  <TableCell className="text-sm text-stone-600">{u.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" data-testid={`edit-user-${u.id}`} onClick={() => { setEditing(u); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`delete-user-${u.id}`} className="text-rose-600 hover:text-rose-700" onClick={() => del(u)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDialog open={open} onOpenChange={setOpen} initial={editing} onSave={onSave} />
    </div>
  );
}
