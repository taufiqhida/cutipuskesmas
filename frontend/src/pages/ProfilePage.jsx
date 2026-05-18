import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, KeyRound, User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({});
  const [pw, setPw] = useState({ current_password: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({
      name: user.name || "",
      email: user.email || "",
      nik: user.nik || "",
      is_asn: !!user.is_asn,
      nip: user.nip || "",
      jabatan: user.jabatan || "",
      masa_kerja_tahun: user.masa_kerja_tahun || 0,
      masa_kerja_bulan: user.masa_kerja_bulan || 0,
      alamat: user.alamat || "",
      telepon: user.telepon || "",
    });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/users/me", form);
      const me = await api.get("/auth/me");
      setUser(me.data);
      toast.success("Profil berhasil diperbarui");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.password !== pw.confirm) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    if (pw.password.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    setBusy(true);
    try {
      await api.put("/users/me", {
        current_password: pw.current_password,
        password: pw.password,
      });
      toast.success("Password berhasil diubah");
      setPw({ current_password: "", password: "", confirm: "" });
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">Akun Saya</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black">Profil Pegawai</h1>
        <p className="text-stone-600 text-sm mt-1">Perbarui data pribadi dan password akun Anda.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile"><UserIcon className="w-4 h-4 mr-1.5" /> Data Pribadi</TabsTrigger>
          <TabsTrigger value="password" data-testid="tab-password"><KeyRound className="w-4 h-4 mr-1.5" /> Ubah Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 pt-4">
          <form onSubmit={saveProfile} className="space-y-6">
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="font-heading text-lg">Identitas</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input data-testid="input-my-name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input data-testid="input-my-email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <Switch data-testid="input-my-is-asn" checked={!!form.is_asn} onCheckedChange={(v) => setForm({ ...form, is_asn: v })} />
                    <Label>Status ASN (PNS/PPPK)</Label>
                  </div>
                </div>
                {form.is_asn ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label>NIP</Label>
                    <Input data-testid="input-my-nip" value={form.nip || ""} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
                  </div>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <Label>NIK</Label>
                    <Input data-testid="input-my-nik" value={form.nik || ""} onChange={(e) => setForm({ ...form, nik: e.target.value })} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-stone-200">
              <CardHeader><CardTitle className="font-heading text-lg">Kepegawaian</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Jabatan</Label>
                  <Input data-testid="input-my-jabatan" value={form.jabatan || ""} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Masa Kerja (Tahun)</Label>
                  <Input type="number" min="0" data-testid="input-my-masa-tahun" value={form.masa_kerja_tahun || 0} onChange={(e) => setForm({ ...form, masa_kerja_tahun: parseInt(e.target.value || 0) })} />
                </div>
                <div className="space-y-2">
                  <Label>Masa Kerja (Bulan)</Label>
                  <Input type="number" min="0" max="11" data-testid="input-my-masa-bulan" value={form.masa_kerja_bulan || 0} onChange={(e) => setForm({ ...form, masa_kerja_bulan: parseInt(e.target.value || 0) })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Unit Kerja</Label>
                  <Input disabled value={user?.unit_kerja || "UPTD Puskesmas Bugangan"} className="bg-stone-50" />
                  <p className="text-xs text-stone-500">Unit kerja tidak bisa diubah. Hubungi administrator.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200">
              <CardHeader><CardTitle className="font-heading text-lg">Kontak</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Alamat</Label>
                  <Textarea data-testid="input-my-alamat" rows={2} value={form.alamat || ""} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nomor Telepon</Label>
                  <Input data-testid="input-my-telepon" value={form.telepon || ""} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={busy} data-testid="save-profile-btn" className="bg-[#1A4331] hover:bg-[#133224]">
                <Save className="w-4 h-4 mr-1" /> {busy ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="password" className="space-y-4 pt-4">
          <Card className="border-stone-200">
            <CardHeader><CardTitle className="font-heading text-lg">Ubah Password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Password Lama</Label>
                  <Input data-testid="input-current-password" type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Password Baru</Label>
                  <Input data-testid="input-new-password" type="password" required minLength={6} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
                  <p className="text-xs text-stone-500">Minimal 6 karakter.</p>
                </div>
                <div className="space-y-2">
                  <Label>Konfirmasi Password Baru</Label>
                  <Input data-testid="input-confirm-password" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </div>
                <Button type="submit" disabled={busy} data-testid="save-password-btn" className="bg-[#1A4331] hover:bg-[#133224]">
                  <KeyRound className="w-4 h-4 mr-1" /> {busy ? "Menyimpan..." : "Ubah Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
