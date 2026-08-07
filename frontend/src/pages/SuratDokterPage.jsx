import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Stethoscope, ArrowLeft } from "lucide-react";
import { formatTanggalID } from "@/lib/constants";

export default function SuratDokterPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API}/public/surat-dokter/${token}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || "Dokumen tidak ditemukan"))
      .finally(() => setLoading(false));
  }, [token]);

  const isImage = data?.surat_dokter_base64?.startsWith("data:image");
  const isPdf = data?.surat_dokter_base64?.startsWith("data:application/pdf");

  const download = () => {
    if (!data?.surat_dokter_base64) return;
    const a = document.createElement("a");
    a.href = data.surat_dokter_base64;
    a.download = `surat-dokter-${data.form_no?.replaceAll("/", "-") || token}.${isImage ? "png" : "pdf"}`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#1A4331] flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-black text-sm">Surat Keterangan Dokter</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">UPTD Puskesmas Bugangan</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <Link to="/login" className="text-sm text-stone-600 hover:text-[#1A4331] inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Login
        </Link>

        <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Lampiran Pengajuan Cuti</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black mb-6">
          <FileText className="w-8 h-8 inline mr-2 text-[#1A4331]" />
          Surat Keterangan Dokter
        </h1>

        {loading ? (
          <div className="text-stone-500">Memuat...</div>
        ) : err ? (
          <Card className="border-rose-300 bg-rose-50">
            <CardContent className="p-8 text-center">
              <div className="font-heading text-xl font-bold text-rose-900">Tidak Ditemukan</div>
              <div className="text-sm text-rose-800 mt-2">{err}</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-stone-200">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-stone-200">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">No. Formulir</div>
                  <div className="font-mono font-semibold text-sm">{data.form_no || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Pegawai</div>
                  <div className="font-semibold text-sm">{data.pegawai_name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Periode Cuti</div>
                  <div className="text-sm">{formatTanggalID(data.tanggal_mulai)} – {formatTanggalID(data.tanggal_selesai)}</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={download} data-testid="download-surat-btn">
                  <Download className="w-4 h-4 mr-1" /> Unduh
                </Button>
              </div>

              <div className="bg-stone-100 rounded-md p-4 flex justify-center">
                {isImage ? (
                  <img src={data.surat_dokter_base64} alt="Surat Dokter" className="max-w-full max-h-[70vh] rounded shadow" />
                ) : isPdf ? (
                  <iframe src={data.surat_dokter_base64} title="Surat Dokter" className="w-full h-[70vh] rounded" />
                ) : (
                  <div className="text-stone-500">Format file tidak didukung untuk preview. Silakan unduh.</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
