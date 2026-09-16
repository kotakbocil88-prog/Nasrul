import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
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
                  <Dashboard />
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
