import React from "react";
import { LogOut, User, Shield, Wifi, WifiOff, CloudUpload, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABEL = { admin: "Administrator", petugas: "Petugas Lapangan", viewer: "Viewer (baca saja)" };

export default function MobileProfile({ user, online, pending, onSync, onGoDashboard }) {
  const { logout } = useAuth();
  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold">
          {(user?.name || "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 truncate">{user?.name || "Pengguna"}</div>
          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            <Shield className="h-3 w-3" /> {ROLE_LABEL[user?.role] || user?.role}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            {online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
            Status koneksi
          </div>
          <span className={`text-xs font-semibold ${online ? "text-emerald-600" : "text-slate-500"}`}>{online ? "Online" : "Offline"}</span>
        </div>
        <button onClick={onSync} className="w-full flex items-center justify-between p-4 active:bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CloudUpload className="h-4 w-4 text-amber-500" /> Data menunggu sinkron
          </div>
          <span className="text-xs font-semibold text-amber-600">{pending} data</span>
        </button>
        {user?.role === "admin" && (
          <button onClick={onGoDashboard} className="w-full flex items-center gap-2 p-4 text-sm text-slate-700 active:bg-slate-50">
            <LayoutDashboard className="h-4 w-4 text-slate-500" /> Buka Dashboard (Web)
          </button>
        )}
      </div>

      <button
        onClick={logout}
        data-testid="mobile-logout"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-100"
      >
        <LogOut className="h-4 w-4" /> Keluar
      </button>

      <div className="text-center text-[10px] text-slate-400 pt-2">DATA EQMS TAGGING — Mode Lapangan v1</div>
    </div>
  );
}
