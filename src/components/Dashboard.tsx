import React from 'react';
import { UserProfile } from '../types';
import { Shield, ShieldCheck, KeyRound, LogOut, Clock, Layers, BookOpen, ShieldAlert } from 'lucide-react';
import TwoFactorSetup from './TwoFactorSetup';
import SecurityAuditLogs from './SecurityAuditLogs';
import SandboxDemo from './SandboxDemo';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export default function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const formatJoinedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="security-dashboard-root">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm" id="dashboard-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Security Command Center</h1>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Session Encrypted (JWT Over HttpOnly)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 font-semibold uppercase">Logged In As</p>
              <p className="text-sm font-bold text-gray-800">{user.email}</p>
            </div>
            <button
              id="logout-navbar-btn"
              onClick={onLogout}
              className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
        {/* Core Stats / Security Overview Banner */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden" id="dashboard-security-overview">
          {/* Subtle ambient light backgrounds */}
          <div className="absolute right-0 top-0 -mt-24 -mr-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-20 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full">
                System Hardening Status
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1">Your Account is Guarded</h2>
              <p className="text-indigo-200 text-sm max-w-2xl leading-relaxed">
                We have deployed strict SQL parameterization, cryptographically salted 12-round bcrypt hash storage, SameSite Cookies, and proactive login rate limiting.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-4 rounded-2xl backdrop-blur-sm shrink-0">
              <Clock className="w-8 h-8 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Account Registered</p>
                <p className="text-sm font-bold mt-0.5">{formatJoinedDate(user.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-xs">
            <div className="space-y-1" id="stat-bcrypt">
              <p className="text-indigo-300 font-medium">Password Storage</p>
              <p className="font-mono font-bold text-white flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-400" /> bcrypt (12 rounds)
              </p>
            </div>
            <div className="space-y-1" id="stat-session">
              <p className="text-indigo-300 font-medium">Session Framework</p>
              <p className="font-mono font-bold text-white flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-400" /> HttpOnly JWT
              </p>
            </div>
            <div className="space-y-1" id="stat-mfa">
              <p className="text-indigo-300 font-medium">MFA Security</p>
              <p className="font-mono font-bold text-white flex items-center gap-1">
                {user.twoFactorEnabled ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-green-400" /> TOTP Authenticator
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> Not Configured
                  </>
                )}
              </p>
            </div>
            <div className="space-y-1" id="stat-sqli">
              <p className="text-indigo-300 font-medium">SQL Injection Protection</p>
              <p className="font-mono font-bold text-white flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-400" /> Parameterized Bindings
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard Cards Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-widgets-grid">
          {/* Left Column: 2FA & SIEM Logs */}
          <div className="lg:col-span-7 space-y-6">
            <TwoFactorSetup user={user} onUpdateUser={onUpdateUser} />
            <SecurityAuditLogs userId={user.id} />
          </div>

          {/* Right Column: SQL Injection Simulator Sandbox */}
          <div className="lg:col-span-5">
            <SandboxDemo />
          </div>
        </section>
      </div>
    </div>
  );
}
