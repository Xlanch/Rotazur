"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/auth";

export type AuthMode = "login" | "register" | "forgot_password";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthMode) => void;
  login: (email: string, pass: string) => Promise<{ success?: boolean; error?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success?: boolean; error?: string }>;
  sendVerificationCode: (name: string, email: string, pass: string) => Promise<{
    success?: boolean;
    realEmailSent?: boolean;
    devCode?: string;
    message?: string;
    error?: string;
  }>;
  verifyCode: (email: string, code: string) => Promise<{ success?: boolean; error?: string }>;
  sendPasswordResetCode: (email: string) => Promise<{
    success?: boolean;
    realEmailSent?: boolean;
    devCode?: string;
    message?: string;
    error?: string;
  }>;
  resetPassword: (email: string, code: string, newPass: string) => Promise<{
    success?: boolean;
    message?: string;
    error?: string;
  }>;
  loginWithGoogle: (customData?: { email?: string; name?: string }) => Promise<{ success?: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>("login");
  const userRevision = useRef(0);

  const commitUser = (next: AuthUser | null) => {
    userRevision.current++;
    setUser(next);
    setLoading(false);
  };

  const refreshUser = async () => {
    const revision = ++userRevision.current;
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Oturum kontrol edilemedi.");
      const data = await res.json();
      if (revision === userRevision.current) setUser(data.user || null);
    } catch {
      // A temporary connection failure must not replace a confirmed account.
    } finally {
      if (revision === userRevision.current) setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const openAuthModal = (mode: AuthMode = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Giriş başarısız" };
      }
      commitUser(data.user);
      closeAuthModal();
      return { success: true };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Kayıt başarısız" };
      }
      commitUser(data.user);
      closeAuthModal();
      return { success: true };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const sendVerificationCode = async (name: string, email: string, pass: string) => {
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Kod gönderilemedi" };
      }
      return {
        success: true,
        realEmailSent: data.realEmailSent,
        devCode: data.devCode,
        message: data.message,
      };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Doğrulama başarısız" };
      }
      commitUser(data.user);
      closeAuthModal();
      return { success: true };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const sendPasswordResetCode = async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Şifre sıfırlama kodu gönderilemedi" };
      }
      return {
        success: true,
        realEmailSent: data.realEmailSent,
        devCode: data.devCode,
        message: data.message,
      };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const resetPassword = async (email: string, code: string, newPass: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Şifre güncellenemedi" };
      }
      return { success: true, message: data.message };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const loginWithGoogle = async (customData?: { email?: string; name?: string }) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customData || {}),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Google girişi başarısız" };
      }
      commitUser(data.user);
      closeAuthModal();
      return { success: true };
    } catch {
      return { error: "Bağlantı hatası oluştu." };
    }
  };

  const logout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Çıkış yapılamadı.");
      commitUser(null);
    } catch {
      window.alert("Çıkış yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
        login,
        register,
        sendVerificationCode,
        verifyCode,
        sendPasswordResetCode,
        resetPassword,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
