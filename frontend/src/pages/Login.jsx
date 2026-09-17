import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, QrCode, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1618344322843-ee8929d42671?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHw0fHxwYWxtJTIwcGxhbnRhdGlvbnxlbnwwfHx8Z3JlZW58MTc4OTEzNzQ1Nnww&ixlib=rb-4.1.0&q=85&w=1600",
  "https://images.unsplash.com/photo-1716725330084-c0752ebd6288?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxwYWxtJTIwcGxhbnRhdGlvbnxlbnwwfHx8Z3JlZW58MTc4OTEzNzQ1Nnww&ixlib=rb-4.1.0&q=85&w=1600",
  "https://images.pexels.com/photos/3246161/pexels-photo-3246161.jpeg?auto=compress&cs=tinysrgb&w=1600",
];

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      navigate(data.role === "petugas" ? "/mobile" : "/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero */}
      <div className="relative hidden lg:block">
        {HERO_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="Perkebunan sawit"
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === heroIdx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-[#0F291E]/70" />
        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#84CC16] flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#0F291E]" />
            </div>
            <span className="font-heading font-extrabold text-xl">DATA EQMS TAGGING</span>
          </div>
          <div>
            <h1 className="font-heading text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Manajemen Data & Label QR Perkebunan
            </h1>
            <p className="mt-4 text-white/80 text-base max-w-md leading-relaxed">
              Kelola data Kebun, Afdeling, Blok, dan Code LSU. Impor Excel, generate QR, dan ekspor PDF label siap cetak.
            </p>
          </div>
          <div className="flex items-center justify-between text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" /> Setiap lokasi punya QR unik
            </div>
            <div className="flex items-center gap-1.5" data-testid="hero-slideshow-dots">
              {HERO_IMAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Gambar ${i + 1}`}
                  onClick={() => setHeroIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === heroIdx ? "w-6 bg-[#84CC16]" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm fade-in" data-testid="login-form">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#1B4D3E] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#84CC16]" />
            </div>
            <span className="font-heading font-extrabold text-lg">DATA EQMS TAGGING</span>
          </div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Selamat Datang</h2>
          <p className="text-muted-foreground text-sm mt-1 mb-8">Masuk untuk mengelola data perkebunan Anda.</p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eqms.id"
                  className="pl-9 h-11"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kata Sandi</Label>
              <div className="relative mt-1.5">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-11"
                />
              </div>
            </div>
          </div>

          {error && (
            <p data-testid="login-error" className="text-destructive text-sm mt-4">
              {error}
            </p>
          )}

          <Button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-6 bg-[#1B4D3E] hover:bg-[#0F291E] text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
