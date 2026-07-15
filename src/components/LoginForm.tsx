import React, { useState } from 'react';
import { Mail, Lock, KeyRound, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { ServerResponse, ValidationError } from '../types';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
  onNavigateToRegister: () => void;
}

export default function LoginForm({ onLoginSuccess, onNavigateToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2FA login state
  const [requires2FA, setRequires2FA] = useState(false);
  const [temp2FAToken, setTemp2FAToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [inputErrors, setInputErrors] = useState<ValidationError[]>([]);

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInputErrors([]);

    // Basic client-side validation
    if (!email) {
      setError("Email is required.");
      setLoading(false);
      return;
    }
    if (!password) {
      setError("Password is required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result: ServerResponse<any> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to authenticate.');
        if (result.errors) setInputErrors(result.errors);
      } else {
        if (result.requires2FA) {
          // Need to show 2FA entry field
          setRequires2FA(true);
          setTemp2FAToken(result.data?.tempToken || (result as any).tempToken || '');
        } else {
          onLoginSuccess(result.user);
        }
      }
    } catch (err) {
      setError('Connection to security server failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (totpCode.length !== 6 || isNaN(Number(totpCode))) {
      setError("Please enter a valid 6-digit numeric authentication code.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode, tempToken: temp2FAToken }),
      });

      const result: ServerResponse<any> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || '2FA authentication failed.');
      } else {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      setError('Connection to security server failed.');
    } finally {
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-gray-100 shadow-2xl rounded-3xl p-8" id="login-2fa-card">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Two-Factor Verification</h2>
          <p className="text-sm text-gray-500 mt-2">
            Enter the 6-digit passcode from your Google Authenticator or secondary auth app.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-xl flex items-start gap-3"
            id="login-error-toast"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Verification Error</p>
              <p>{error}</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handle2FAVerify} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Authentication Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                <KeyRound className="w-5 h-5" />
              </span>
              <input
                id="totpCode"
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-center text-2xl font-mono tracking-[0.5em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <button
            id="verify-2fa-btn"
            type="submit"
            disabled={loading || totpCode.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? 'Securing Connection...' : 'Verify Code & Log In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            id="cancel-2fa-btn"
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTotpCode('');
              setError(null);
            }}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Back to Standard Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-gray-100 shadow-2xl rounded-3xl p-8" id="login-form-card">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Secure Account Log In</h2>
        <p className="text-sm text-gray-500 mt-2">
          Access your workspace protected with industrial-grade encryption
        </p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-xl flex items-start gap-3"
          id="login-error-toast"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Security Gate Block</p>
            <p>{error}</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleInitialLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              disabled={loading}
              required
            />
            <button
              id="toggle-login-password-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {loading ? 'Checking Credentials...' : 'Authenticate Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500 border-t border-gray-100 pt-5">
        New here?{' '}
        <button
          id="goto-register-btn"
          type="button"
          onClick={onNavigateToRegister}
          className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline decoration-blue-200 hover:decoration-blue-500"
        >
          Create a Secure Account
        </button>
      </div>
    </div>
  );
}
