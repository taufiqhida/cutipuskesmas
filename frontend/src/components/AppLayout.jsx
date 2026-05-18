import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Stethoscope, LogOut, Users, FileText, ClipboardList, ShieldCheck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navByRole = {
    admin: [
      { to: "/admin", label: "Manajemen Pegawai", icon: Users },
      { to: "/admin/pengajuan", label: "Semua Pengajuan", icon: ClipboardList },
    ],
    kepala: [
      { to: "/kepala", label: "Antrian Persetujuan", icon: ShieldCheck },
      { to: "/kepala/riwayat", label: "Riwayat Keputusan", icon: ClipboardList },
    ],
    pegawai: [
      { to: "/pegawai", label: "Dashboard", icon: ClipboardList },
      { to: "/pegawai/ajukan", label: "Ajukan Cuti", icon: FileText },
    ],
  };

  const items = navByRole[user?.role] || [];

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
              <div className="w-9 h-9 rounded-md bg-[#1A4331] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="font-heading font-black text-sm tracking-tight">SICUTI</div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Puskesmas Bugangan</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {items.map((it) => {
                const Icon = it.icon;
                const active = location.pathname === it.to;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    data-testid={`nav-${it.to.replaceAll("/", "-")}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-[#EAF4F0] text-[#1A4331] font-semibold"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profil"
              data-testid="profile-link"
              className="text-right hidden sm:block group cursor-pointer"
              title="Profil saya"
            >
              <div className="text-sm font-semibold group-hover:text-[#1A4331] transition-colors">{user?.name}</div>
              <div className="text-[11px] uppercase tracking-wider text-stone-500">
                {ROLE_LABELS[user?.role] || user?.role}
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              data-testid="logout-btn"
              className="border-stone-300"
            >
              <LogOut className="w-4 h-4 mr-1.5" /> Keluar
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <div className="md:hidden border-t border-stone-200 px-4 py-2 flex gap-2 overflow-x-auto">
          {items.map((it) => {
            const active = location.pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs ${
                  active ? "bg-[#EAF4F0] text-[#1A4331] font-semibold" : "text-stone-600"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 fade-in">{children}</main>
      <footer className="border-t border-stone-200 mt-12 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} UPTD Puskesmas Bugangan — Dinas Kesehatan Kota Semarang
      </footer>
    </div>
  );
}
