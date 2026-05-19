import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Stethoscope, ArrowRight, ShieldCheck, ScanLine } from "lucide-react";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    const dest = user.role === "admin" ? "/admin" : user.role === "kepala" ? "/kepala" : "/pegawai";
    return <Navigate to={dest} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Selamat datang, ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : u.role === "kepala" ? "/kepala" : "/pegawai");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal masuk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* Left visual */}
      <div className="hidden lg:flex lg:col-span-3 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1769698678497-c41f0ab47c3e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjbGluaWMlMjBidWlsZGluZ3xlbnwwfHx8fDE3NzkwNzY4NjR8MA&ixlib=rb-4.1.0&q=85"
          alt="Modern clinic"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#1A4331]/85 mix-blend-multiply" />
        <div className="absolute inset-0 grain opacity-40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/70">Sistem Informasi Cuti</div>
              <div className="font-heading font-black text-xl">SICUTI · Bugangan</div>
            </div>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="text-xs uppercase tracking-[0.3em] text-white/70">Pemerintah Kota Semarang</div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95]">
              Layanan permintaan & pemberian cuti pegawai.
            </h1>
            <p className="text-white/80 text-base max-w-md leading-relaxed">
              UPTD Puskesmas Bugangan — Dinas Kesehatan. Ajukan, setujui, dan arsipkan cuti
              dengan tanda tangan digital terverifikasi QR.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="border-t-2 border-white/30 pt-3">
              <ShieldCheck className="w-5 h-5 mb-2" />
              <div className="text-sm font-semibold">Verifikasi QR</div>
              <div className="text-xs text-white/70">Otentikasi keaslian dokumen</div>
            </div>
            <div className="border-t-2 border-white/30 pt-3">
              <ScanLine className="w-5 h-5 mb-2" />
              <div className="text-sm font-semibold">3 Peran</div>
              <div className="text-xs text-white/70">Admin · Kepala · Pegawai</div>
            </div>
            <div className="border-t-2 border-white/30 pt-3">
              <ArrowRight className="w-5 h-5 mb-2" />
              <div className="text-sm font-semibold">Cetak PDF</div>
              <div className="text-xs text-white/70">Format resmi Puskesmas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-10 bg-[#F9F9F7]">
        <Card className="w-full max-w-md border-stone-200 shadow-none">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-10 h-10 rounded-md bg-[#1A4331] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-heading font-black text-base">SICUTI · Bugangan</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Pemerintah Kota Semarang</div>
              </div>
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Masuk Akun</div>
            <h2 className="font-heading text-3xl font-bold mb-2">Selamat Datang</h2>
            <p className="text-stone-600 text-sm mb-8">
              Gunakan akun yang dibuatkan oleh administrator Puskesmas.
            </p>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@puskesmas-bugangan.go.id"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                data-testid="login-submit-btn"
                className="w-full h-11 bg-[#1A4331] hover:bg-[#133224] text-white font-medium"
              >
                {busy ? "Memuat..." : "Masuk"}
                {!busy && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
