import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MobileApp from "@/pages/mobile/MobileApp";
import PwaControls from "@/components/PwaControls";

function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  if (checking || user === null)
    return (
      <div className="min-h-screen flex items-center justify-center leaf-bg text-white" data-testid="loading-screen">
        <div className="animate-pulse text-lg">Memuat...</div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  // Petugas lapangan langsung diarahkan ke aplikasi mobile (pengambilan data)
  if (user && user.role === "petugas") return <Navigate to="/m" replace />;
  return <Dashboard />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomeRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/m"
              element={
                <ProtectedRoute>
                  <MobileApp />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
        <PwaControls />
      </AuthProvider>
    </div>
  );
}

export default App;
