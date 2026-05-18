import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { LEAVE_TYPE_LABELS, formatTanggalID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { API } from "@/lib/api";

export default function AdminAllRequests() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/leave-requests?scope=all").then((r) => setRows(r.data));
  }, []);

  const openPdf = async (id) => {
    const token = localStorage.getItem("cuti_token");
    const res = await fetch(`${API}/leave-requests/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Administrator</div>
        <h1 className="font-heading text-3xl font-black">Semua Pengajuan Cuti</h1>
      </div>
      <Card className="border-stone-200">
        <CardHeader><CardTitle className="font-heading">Riwayat Pengajuan</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Formulir</TableHead>
                <TableHead>Pegawai</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Lama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.form_no}</TableCell>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell>{LEAVE_TYPE_LABELS[r.jenis_cuti]}</TableCell>
                  <TableCell className="text-xs">{formatTanggalID(r.tanggal_mulai)} – {formatTanggalID(r.tanggal_selesai)}</TableCell>
                  <TableCell>{r.lamanya} hari</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openPdf(r.id)}>
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-stone-500 py-8">Belum ada pengajuan</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
