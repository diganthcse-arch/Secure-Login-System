import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import { AuthState, UserProfile } from './types';
import { Shield, Lock, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  const [view, setView] = useState<'login' | 'register'>('login');

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      if (response.ok && result.success) {
        setAuth({
          isAuthenticated: true,
          user: result.user,
          loading: false,
        });
      } else {
        setAuth({
          isAuthenticated: false,
          user: null,
          loading: false,
        });
      }
    } catch (err) {
      setAuth({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setAuth({
      isAuthenticated: true,
      user,
      loading: false,
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setAuth({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
      setView('login');
    }
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setAuth((prev) => ({
      ...prev,
      user: updatedUser,
    }));
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center" id="app-loading-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Loading Secure Applet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased" id="secure-app-container">
      <AnimatePresence mode="wait">
        {auth.isAuthenticated && auth.user ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard 
              user={auth.user} 
              onLogout={handleLogout} 
              onUpdateUser={handleUpdateUser} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative"
          >
            {/* Background design elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 space-y-8">
              {/* Logo / Header */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
                  <Lock className="w-8 h-8 animate-pulse" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  SECURE CRYPTO GATEWAY
                </h1>
                <p className="text-xs text-gray-400 font-mono tracking-wider mt-1.5 uppercase">
                  Protected with salted bcrypt & TOTP
                </p>
              </div>

              {/* Form Render */}
              <div className="relative">
                {view === 'login' ? (
                  <LoginForm 
                    onLoginSuccess={handleLoginSuccess} 
                    onNavigateToRegister={() => setView('register')} 
                  />
                ) : (
                  <RegisterForm 
                    onRegisterSuccess={() => setView('login')} 
                    onNavigateToLogin={() => setView('login')} 
                  />
                )}
              </div>

              {/* Secure Footer */}
              <div className="text-center space-y-1 mt-6">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  AES-256 Session Encrypted
                </div>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                  All requests processed with input validation and anti-injection parameterization.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
