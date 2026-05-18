import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LEAVE_TYPE_LABELS, diffDays, formatTanggalID } from "@/lib/constants";
import { Send } from "lucide-react";

export default function AjukanCutiPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jenis, setJenis] = useState("cuti_tahunan");
  const [alasan, setAlasan] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [alamat, setAlamat] = useState(user?.alamat || "");
  const [telepon, setTelepon] = useState(user?.telepon || "");
  const [busy, setBusy] = useState(false);

  const lamanya = useMemo(() => diffDays(tanggalMulai, tanggalSelesai), [tanggalMulai, tanggalSelesai]);

  const submit = async (e) => {
    e.preventDefault();
    if (lamanya <= 0) {
      toast.error("Tanggal cuti tidak valid");
      return;
    }
    setBusy(true);
    try {
      await api.post("/leave-requests", {
        jenis_cuti: jenis,
        alasan,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alamat_selama_cuti: alamat,
        telepon_selama_cuti: telepon,
      });
      toast.success("Pengajuan cuti berhasil dikirim");
      navigate("/pegawai");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Formulir</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black">Ajukan Cuti</h1>
        <p className="text-stone-600 text-sm mt-1">Lengkapi formulir di bawah ini. Pengajuan akan diteruskan ke Kepala UPTD Puskesmas Bugangan.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-stone-200">
          <CardHeader><CardTitle className="font-heading text-lg">I. Data Pegawai</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-[10px] uppercase tracking-wider text-stone-500">Nama</div><div className="font-semibold">{user?.name}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-stone-500">NIP / NIK</div><div className="font-mono">{user?.is_asn ? user?.nip : `Non ASN${user?.nik ? ` · ${user.nik}` : ""}`}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-stone-500">Jabatan</div><div>{user?.jabatan}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-stone-500">Masa Kerja</div><div>{String(user?.masa_kerja_tahun||0).padStart(2,"0")} th {String(user?.masa_kerja_bulan||0).padStart(2,"0")} bln</div></div>
            <div className="col-span-2"><div className="text-[10px] uppercase tracking-wider text-stone-500">Unit Kerja</div><div>{user?.unit_kerja}</div></div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader><CardTitle className="font-heading text-lg">II. Jenis Cuti</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup value={jenis} onValueChange={setJenis} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(LEAVE_TYPE_LABELS).filter(([k]) => k !== "cuti_besar").map(([k, lbl], idx) => (
                <label
                  key={k}
                  htmlFor={`jenis-${k}`}
                  className={`flex items-center gap-3 border rounded-md p-3 cursor-pointer transition-colors ${
                    jenis === k ? "border-[#1A4331] bg-[#EAF4F0]" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <RadioGroupItem value={k} id={`jenis-${k}`} data-testid={`jenis-${k}`} />
                  <div>
                    <div className="text-[10px] font-mono text-stone-500">{idx + 1}.</div>
                    <div className="font-semibold text-sm">{lbl}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader><CardTitle className="font-heading text-lg">III. Alasan Cuti</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              data-testid="input-alasan"
              required rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Jelaskan alasan cuti dengan ringkas dan jelas..."
            />
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader><CardTitle className="font-heading text-lg">IV. Lamanya Cuti</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input data-testid="input-tanggal-mulai" type="date" required value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input data-testid="input-tanggal-selesai" type="date" required value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Lamanya</Label>
              <div className="h-10 flex items-center px-3 bg-[#EAF4F0] rounded-md border border-stone-200">
                <span className="font-heading text-2xl font-black text-[#1A4331]" data-testid="text-lamanya">{lamanya}</span>
                <span className="text-stone-500 text-sm ml-2">hari</span>
              </div>
            </div>
            {tanggalMulai && tanggalSelesai && lamanya > 0 && (
              <div className="md:col-span-3 text-xs text-stone-600">
                {formatTanggalID(tanggalMulai)} sampai dengan {formatTanggalID(tanggalSelesai)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader><CardTitle className="font-heading text-lg">V. Alamat Selama Menjalankan Cuti</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Alamat</Label>
              <Textarea data-testid="input-alamat-cuti" required rows={2} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input data-testid="input-telp-cuti" required value={telepon} onChange={(e) => setTelepon(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
          <Button type="submit" disabled={busy} data-testid="submit-cuti-btn" className="bg-[#1A4331] hover:bg-[#133224]">
            <Send className="w-4 h-4 mr-1" /> {busy ? "Mengirim..." : "Kirim Pengajuan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
