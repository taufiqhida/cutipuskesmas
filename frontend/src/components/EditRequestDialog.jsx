import React, { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LEAVE_TYPE_LABELS, diffDays, formatTanggalID } from "@/lib/constants";
import { Save } from "lucide-react";

export default function EditRequestDialog({ open, onOpenChange, request, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (request && open) {
      setForm({
        form_no: request.form_no || "",
        jenis_cuti: request.jenis_cuti,
        alasan: request.alasan || "",
        tanggal_mulai: request.tanggal_mulai || "",
        tanggal_selesai: request.tanggal_selesai || "",
        alamat_selama_cuti: request.alamat_selama_cuti || "",
        telepon_selama_cuti: request.telepon_selama_cuti || "",
      });
    }
  }, [request, open]);

  const lamanya = useMemo(
    () => diffDays(form.tanggal_mulai, form.tanggal_selesai),
    [form.tanggal_mulai, form.tanggal_selesai]
  );

  const save = async (e) => {
    e.preventDefault();
    if (lamanya <= 0) {
      toast.error("Tanggal cuti tidak valid");
      return;
    }
    setBusy(true);
    try {
      await api.put(`/leave-requests/${request.id}`, form);
      toast.success("Pengajuan diperbarui");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Pengajuan Cuti</DialogTitle>
        </DialogHeader>

        <form onSubmit={save} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>No. Formulir</Label>
            <Input
              data-testid="edit-input-form-no"
              value={form.form_no || ""}
              onChange={(e) => setForm({ ...form, form_no: e.target.value })}
              className="font-mono"
              placeholder="B/001/851/06/2026"
            />
            <p className="text-xs text-stone-500">Nomor surat harus unik. Kosongkan untuk tetap auto-generate.</p>
          </div>

          <div className="space-y-2">
            <Label>Jenis Cuti</Label>
            <RadioGroup
              value={form.jenis_cuti}
              onValueChange={(v) => setForm({ ...form, jenis_cuti: v })}
              className="grid grid-cols-2 gap-2"
            >
              {Object.entries(LEAVE_TYPE_LABELS).filter(([k]) => k !== "cuti_besar").map(([k, lbl]) => (
                <label
                  key={k}
                  htmlFor={`edit-jenis-${k}`}
                  className={`flex items-center gap-2 border rounded-md p-2 text-sm cursor-pointer transition-colors ${
                    form.jenis_cuti === k ? "border-[#1A4331] bg-[#EAF4F0]" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <RadioGroupItem value={k} id={`edit-jenis-${k}`} data-testid={`edit-jenis-${k}`} />
                  <span>{lbl}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Alasan Cuti</Label>
            <Textarea
              data-testid="edit-input-alasan"
              required rows={2}
              value={form.alasan || ""}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                data-testid="edit-input-tanggal-mulai"
                type="date" required
                value={form.tanggal_mulai || ""}
                onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input
                data-testid="edit-input-tanggal-selesai"
                type="date" required
                value={form.tanggal_selesai || ""}
                onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lamanya</Label>
              <div className="h-10 flex items-center px-3 bg-[#EAF4F0] rounded-md border border-stone-200">
                <span className="font-heading text-xl font-black text-[#1A4331]">{lamanya}</span>
                <span className="text-stone-500 text-xs ml-2">hari</span>
              </div>
            </div>
          </div>
          {form.tanggal_mulai && form.tanggal_selesai && lamanya > 0 && (
            <div className="text-xs text-stone-600 -mt-2">
              {formatTanggalID(form.tanggal_mulai)} sampai dengan {formatTanggalID(form.tanggal_selesai)}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Alamat Selama Cuti</Label>
              <Textarea
                data-testid="edit-input-alamat"
                required rows={2}
                value={form.alamat_selama_cuti || ""}
                onChange={(e) => setForm({ ...form, alamat_selama_cuti: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                data-testid="edit-input-telepon"
                required
                value={form.telepon_selama_cuti || ""}
                onChange={(e) => setForm({ ...form, telepon_selama_cuti: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={busy} className="bg-[#1A4331] hover:bg-[#133224]" data-testid="save-edit-request-btn">
              <Save className="w-4 h-4 mr-1" /> {busy ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
