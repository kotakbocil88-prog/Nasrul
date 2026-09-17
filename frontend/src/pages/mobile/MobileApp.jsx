import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home, ScanLine, Map as MapIcon, User, Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { pendingCount, syncPending } from "@/lib/offlineQueue";
import MobileHome from "@/pages/mobile/MobileHome";
import MobileScan from "@/pages/mobile/MobileScan";
import MobileDetail from "@/pages/mobile/MobileDetail";
import MobileMap from "@/pages/mobile/MobileMap";
import MobileProfile from "@/pages/mobile/MobileProfile";

export default function MobileApp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("home");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [myToday, setMyToday] = useState(null);
  const [viaScan, setViaScan] = useState(false);

  const isEditor = user && (user.role === "admin" || user.role === "petugas");

  const refreshPending = useCallback(async () => {
    try { setPending(await pendingCount()); } catch (e) { /* noop */ }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/records");
      setRecords(r.data || []);
    } catch (e) {
      // offline: service worker mengembalikan cache GET terakhir bila ada
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const r = await api.get("/records/my-tagging-summary");
      setMyToday(r.data?.today ?? null);
    } catch (e) { /* offline / abaikan */ }
  }, []);

  const runSync = useCallback(async (silent = false) => {
    const count = await pendingCount();
    if (count === 0) { await refreshPending(); return; }
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await syncPending();
      if (res.synced > 0 && !silent) toast.success(`${res.synced} data tersinkron ke server`);
      if (res.failed > 0 && !silent) toast.error(`${res.failed} data gagal sinkron, akan dicoba lagi`);
      if (res.synced > 0) await fetchRecords();
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [fetchRecords, refreshPending]);

  useEffect(() => {
    fetchRecords();
    fetchSummary();
    refreshPending();
  }, [fetchRecords, fetchSummary, refreshPending]);

  useEffect(() => {
    const goOnline = () => { setOnline(true); runSync(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [runSync]);

  const openDetail = (rec, fromScan = false) => { setSelected(rec); setViaScan(fromScan); setView("detail"); };

  const onSaved = async (savedRecord, queued) => {
    await refreshPending();
    if (!queued) { await fetchRecords(); await fetchSummary(); }
    else if (savedRecord) {
      // update lokal agar UI langsung mencerminkan perubahan saat offline
      setRecords((prev) => prev.map((r) => (r._id === savedRecord._id ? { ...r, ...savedRecord } : r)));
    }
    setView("home");
    setSelected(null);
  };

  const goto = (id) => { setView(id); setSelected(null); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0F291E] text-white px-4 pt-3 pb-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/90 flex items-center justify-center font-bold text-sm">EQ</div>
            <div>
              <div className="text-sm font-semibold leading-tight">EQMS Lapangan</div>
              <div className="text-[10px] text-emerald-200/80 leading-tight">Mode Pengambilan Data</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pending > 0 && (
              <button
                data-testid="sync-btn"
                onClick={() => runSync()}
                className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-[10px] font-semibold"
              >
                <CloudUpload className={`h-3.5 w-3.5 ${syncing ? "animate-pulse" : ""}`} />
                {pending} antre
              </button>
            )}
            <span
              data-testid="online-status"
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                online ? "bg-emerald-600/80" : "bg-slate-500/80"
              }`}
            >
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-20">
        {view === "home" && (
          <MobileHome
            records={records}
            loading={loading}
            myToday={myToday}
            userName={user?.name}
            onRefresh={fetchRecords}
            onOpen={(rec) => openDetail(rec, false)}
            onGoScan={() => setView("scan")}
          />
        )}
        {view === "scan" && (
          <MobileScan records={records} onOpen={(rec) => openDetail(rec, true)} />
        )}
        {view === "map" && (
          <MobileMap records={records} onOpen={(rec) => openDetail(rec, false)} />
        )}
        {view === "profile" && (
          <MobileProfile
            user={user}
            online={online}
            pending={pending}
            onSync={() => runSync()}
            onGoDashboard={() => navigate("/")}
          />
        )}
        {view === "detail" && selected && (
          <MobileDetail
            record={selected}
            isEditor={isEditor}
            online={online}
            viaScan={viaScan}
            onBack={() => { setView("home"); setSelected(null); }}
            onSaved={onSaved}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <NavButton id="home" icon={Home} label="Beranda" active={view === "home"} onClick={() => goto("home")} />
        <NavButton id="scan" icon={ScanLine} label="Scan" active={view === "scan"} onClick={() => goto("scan")} />
        <NavButton id="map" icon={MapIcon} label="Peta" active={view === "map"} onClick={() => goto("map")} />
        <NavButton id="profile" icon={User} label="Profil" active={view === "profile"} onClick={() => goto("profile")} />
      </nav>
    </div>
  );
}

function NavButton({ id, icon: Icon, label, active, onClick }) {
  return (
    <button
      data-testid={`mnav-${id}`}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] font-medium transition-colors ${
        active ? "text-emerald-600" : "text-slate-400"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
      {label}
    </button>
  );
}
