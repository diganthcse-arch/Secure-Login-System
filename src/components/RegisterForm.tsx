import React, { useState, useEffect } from 'react';
import { Mail, Lock, ShieldCheck, AlertCircle, Eye, EyeOff, Check, X, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { ServerResponse } from '../types';

interface RegisterFormProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterForm({ onRegisterSuccess, onNavigateToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password criteria states
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasLetter, setHasLetter] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecial, setHasSpecial] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  useEffect(() => {
    setHasMinLength(password.length >= 8);
    setHasLetter(/[A-Za-z]/.test(password));
    setHasNumber(/\d/.test(password));
    setHasSpecial(/[@$!%*#?&]/.test(password));
  }, [password]);

  useEffect(() => {
    setPasswordsMatch(password !== '' && password === confirmPassword);
  }, [password, confirmPassword]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Final checks
    if (!hasMinLength || !hasLetter || !hasNumber || !hasSpecial) {
      setError("Password does not meet all strength requirements.");
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const result: ServerResponse<null> = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to register account.');
      } else {
        setSuccess("Account successfully created and stored with bcrypt. Redirecting to authentication...");
        setTimeout(() => {
          onRegisterSuccess();
        }, 3000);
      }
    } catch (err) {
      setError('Connection to security server failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordStrong = hasMinLength && hasLetter && hasNumber && hasSpecial;

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-gray-100 shadow-2xl rounded-3xl p-8" id="register-form-card">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create Secure Account</h2>
        <p className="text-sm text-gray-500 mt-2">
          Your credentials will be immediately hashed using high-iteration salted bcrypt
        </p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-xl flex items-start gap-3"
          id="register-error-toast"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Security Filter Flagged</p>
            <p>{error}</p>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 text-sm rounded-r-xl flex items-start gap-3"
          id="register-success-toast"
        >
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">Bcrypt Save Completed</p>
            <p>{success}</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@enterprise.com"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              disabled={loading || !!success}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Password (Hashed on Server)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose strong password"
              className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              disabled={loading || !!success}
              required
            />
            <button
              id="toggle-register-password-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              disabled={loading || !!success}
              required
            />
          </div>
        </div>

        {/* Dynamic Checklist */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-2 space-y-2">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password Integrity Check</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5" id="criteria-length">
              {hasMinLength ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-300" />
              )}
              <span className={hasMinLength ? 'text-green-800 font-medium' : 'text-gray-500'}>8+ Characters</span>
            </div>
            <div className="flex items-center gap-1.5" id="criteria-letter">
              {hasLetter ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-300" />
              )}
              <span className={hasLetter ? 'text-green-800 font-medium' : 'text-gray-500'}>At least 1 Letter</span>
            </div>
            <div className="flex items-center gap-1.5" id="criteria-number">
              {hasNumber ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-300" />
              )}
              <span className={hasNumber ? 'text-green-800 font-medium' : 'text-gray-500'}>At least 1 Number</span>
            </div>
            <div className="flex items-center gap-1.5" id="criteria-special">
              {hasSpecial ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-300" />
              )}
              <span className={hasSpecial ? 'text-green-800 font-medium' : 'text-gray-500'}>1 Symbol (@$!%*#?&)</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2 flex items-center gap-1.5 text-xs" id="criteria-match">
            {passwordsMatch ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <X className="w-4 h-4 text-gray-300" />
            )}
            <span className={passwordsMatch ? 'text-green-800 font-medium' : 'text-gray-500'}>Passwords Match</span>
          </div>
        </div>

        <button
          id="register-submit-btn"
          type="submit"
          disabled={loading || !isPasswordStrong || !passwordsMatch || !!success}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {loading ? 'Executing Secure Salt & Hash...' : 'Create Hashed Credentials'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500 border-t border-gray-100 pt-5">
        Already have an account?{' '}
        <button
          id="goto-login-btn"
          type="button"
          onClick={onNavigateToLogin}
          className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline decoration-blue-200 hover:decoration-blue-500"
        >
          Log In Securely
        </button>
      </div>
    </div>
  );
}
