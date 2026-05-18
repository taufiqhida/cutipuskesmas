import React, { useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSignature, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SignatureCard() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimum 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(true);
      try {
        await api.put("/users/me/signature", { signature_base64: reader.result });
        const me = await api.get("/auth/me");
        setUser(me.data);
        toast.success("Tanda tangan diperbarui");
      } catch (err) {
        toast.error(formatApiError(err?.response?.data?.detail));
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeSig = async () => {
    if (!window.confirm("Hapus tanda tangan?")) return;
    setBusy(true);
    try {
      await api.put("/users/me/signature", { signature_base64: "" });
      const me = await api.get("/auth/me");
      setUser(me.data);
      toast.success("Tanda tangan dihapus");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <FileSignature className="w-5 h-5" /> Tanda Tangan Digital
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-full sm:w-64 h-32 border-2 border-dashed border-stone-300 rounded-md flex items-center justify-center bg-white p-2">
            {user?.signature_base64 ? (
              <img src={user.signature_base64} alt="TTD" className="max-h-full max-w-full object-contain" data-testid="my-signature-preview" />
            ) : (
              <div className="text-xs text-stone-400 text-center px-3">Belum ada TTD<br/>Upload gambar tanda tangan</div>
            )}
          </div>
          <div className="flex-1 space-y-2 text-sm">
            <p className="text-stone-600">
              Upload gambar tanda tangan (PNG/JPG, latar putih atau transparan).
              Tanda tangan akan otomatis muncul pada PDF formulir cuti yang dicetak,
              dilengkapi QR code untuk verifikasi keaslian.
            </p>
            <div className="flex gap-2 pt-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={onFile}
                data-testid="my-signature-input"
              />
              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="bg-[#1A4331] hover:bg-[#133224]"
                data-testid="upload-signature-btn"
              >
                <Upload className="w-4 h-4 mr-1" /> {user?.signature_base64 ? "Ganti TTD" : "Upload TTD"}
              </Button>
              {user?.signature_base64 && (
                <Button type="button" variant="outline" onClick={removeSig} disabled={busy} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
