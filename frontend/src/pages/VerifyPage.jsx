import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { formatTanggalID, STATUS_LABELS } from "@/lib/constants";

export default function VerifyPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/verify/${token}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#1A4331] flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-black text-sm">SICUTI · Verifikasi</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">UPTD Puskesmas Bugangan</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Verifikasi Dokumen Cuti</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black mb-6">Keaslian Tanda Tangan</h1>

        {loading ? (
          <div className="text-stone-500">Memuat...</div>
        ) : !data?.valid ? (
          <Card className="border-rose-300 bg-rose-50">
            <CardContent className="p-8 text-center">
              <XCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
              <div className="font-heading text-xl font-bold text-rose-900">Dokumen Tidak Ditemukan</div>
              <div className="text-sm text-rose-800 mt-2">Token QR tidak valid atau dokumen telah dihapus.</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-stone-200">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                {data.status === "disetujui" ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    <div>
                      <div className="font-heading text-2xl font-black text-emerald-700">Dokumen Sah</div>
                      <div className="text-sm text-stone-600">Telah ditandatangani oleh pejabat berwenang.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-10 h-10 text-amber-600" />
                    <div>
                      <div className="font-heading text-2xl font-black">Status: {STATUS_LABELS[data.status]}</div>
                      <div className="text-sm text-stone-600">Dokumen tercatat dalam sistem.</div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-stone-200 pt-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">No. Formulir</div>
                  <div className="font-mono font-semibold">{data.form_no}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Status</div>
                  <div className="font-semibold">{STATUS_LABELS[data.status]}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Pegawai</div>
                  <div className="font-semibold">{data.pegawai_name}</div>
                  <div className="text-xs text-stone-600">{data.jabatan}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Jenis Cuti</div>
                  <div className="font-semibold">{data.jenis_cuti}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Mulai</div>
                  <div>{formatTanggalID(data.tanggal_mulai)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Selesai</div>
                  <div>{formatTanggalID(data.tanggal_selesai)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Lamanya</div>
                  <div>{data.lamanya} hari</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Disahkan oleh</div>
                  <div>{data.approved_by_name || "—"}</div>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-4">
                <Link to="/login">
                  <Button variant="outline">Masuk ke Sistem</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
