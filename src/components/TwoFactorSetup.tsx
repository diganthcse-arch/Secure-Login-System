import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, QrCode, Key, Clipboard, Check, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface TwoFactorSetupProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export default function TwoFactorSetup({ user, onUpdateUser }: TwoFactorSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Setup state
  const [setupMode, setSetupMode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Disable state
  const [disableMode, setDisableMode] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Could not initialize 2FA setup.");
      } else {
        setQrCodeUrl(result.qrCodeDataUrl);
        setSecretKey(result.secret);
        setSetupMode(true);
      }
    } catch (err) {
      setError("Network error communicating with the authentication engine.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (verifyCode.length !== 6 || isNaN(Number(verifyCode))) {
      setError("Please enter a valid 6-digit verification code from your authenticator.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Verification failed. Check the clock settings on your authenticator device.");
      } else {
        setSuccess("Two-Factor Authentication successfully activated!");
        onUpdateUser({ ...user, twoFactorEnabled: true });
        setSetupMode(false);
        setQrCodeUrl('');
        setSecretKey('');
        setVerifyCode('');
      }
    } catch (err) {
      setError("Connection timed out.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (disableCode.length !== 6 || isNaN(Number(disableCode))) {
      setError("Enter the 6-digit code to authorize disabling 2FA.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Incorrect authorization code.");
      } else {
        setSuccess("Two-Factor Authentication is now disabled.");
        onUpdateUser({ ...user, twoFactorEnabled: false });
        setDisableMode(false);
        setDisableCode('');
      }
    } catch (err) {
      setError("Network timeout.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-6" id="two-factor-setup-panel">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.twoFactorEnabled ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
          {user.twoFactorEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Multi-Factor Authentication (MFA)</h3>
          <p className="text-xs text-gray-500">Add an extra layer of protection using TOTP</p>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-r-lg"
          id="mfa-error-alert"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-800 text-xs rounded-r-lg"
          id="mfa-success-alert"
        >
          {success}
        </motion.div>
      )}

      {!user.twoFactorEnabled && !setupMode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Two-Factor Authentication (2FA) significantly secures your account by requiring an authenticator app code during login. Password cracking will not grant access to hackers without having physical access to your verification codes.
          </p>
          <button
            id="start-mfa-setup-btn"
            onClick={handleStartSetup}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/15 flex items-center gap-2 active:scale-95"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            Enable Authenticator 2FA
          </button>
        </div>
      )}

      {setupMode && (
        <div className="space-y-5">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Instructions:</p>
              <ol className="list-decimal pl-4 mt-1 space-y-1">
                <li>Scan the QR code below using Google Authenticator, Authy, or Duo.</li>
                <li>If scanning fails, manually enter the secure secret key shown.</li>
                <li>Enter the 6-digit validation code from the app below to authorize activation.</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 justify-center bg-gray-50 border border-gray-100 rounded-2xl p-5">
            {qrCodeUrl && (
              <div className="bg-white p-2 rounded-xl shadow-inner border border-gray-100" id="mfa-qr-wrapper">
                <img src={qrCodeUrl} alt="2FA Setup QR Code" className="w-40 h-40" />
              </div>
            )}
            
            <div className="flex-1 w-full space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Manual Secret Key</label>
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl">
                <Key className="w-4 h-4 text-gray-400 shrink-0" />
                <code className="text-xs font-mono font-bold text-gray-700 break-all select-all flex-1">{secretKey}</code>
                <button
                  id="copy-secret-btn"
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-gray-400">Copy this code as a master backup key for safety.</span>
            </div>
          </div>

          <form onSubmit={handleVerifyAndEnable} className="border-t border-gray-100 pt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Enter Verification Code
              </label>
              <input
                id="mfa-verify-input"
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl font-mono text-center text-lg tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                id="mfa-enable-submit"
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm py-2.5 rounded-xl shadow-md shadow-green-500/10 transition-all disabled:opacity-50"
              >
                {loading ? "Activating..." : "Activate Two-Factor"}
              </button>
              <button
                id="mfa-setup-cancel"
                type="button"
                onClick={() => setSetupMode(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {user.twoFactorEnabled && !disableMode && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 text-green-800 rounded-xl p-4 flex gap-3 text-sm">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">2FA is Enabled and Active</p>
              <p className="text-xs text-green-700 mt-1">Your account is fully hardened. Every login attempt will require both your password and your secure authenticator app verification passcode.</p>
            </div>
          </div>
          <button
            id="mfa-start-disable-btn"
            onClick={() => setDisableMode(true)}
            className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
          >
            Disable Two-Factor Authentication
          </button>
        </div>
      )}

      {disableMode && (
        <form onSubmit={handleDisable2FA} className="border border-red-100 bg-red-50/20 rounded-xl p-4 space-y-4">
          <div className="flex items-start gap-2.5 text-xs text-red-800">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Disabling 2FA reduces security!</p>
              <p className="mt-0.5">Please authorize this deletion by typing the 6-digit passcode currently displayed in your authenticator app.</p>
            </div>
          </div>

          <div>
            <input
              id="mfa-disable-input"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white border border-red-200 px-4 py-2 rounded-xl text-center font-mono text-lg tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <button
              id="mfa-disable-confirm"
              type="submit"
              disabled={loading || disableCode.length !== 6}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-xl"
            >
              Confirm Deactivation
            </button>
            <button
              id="mfa-disable-cancel"
              type="button"
              onClick={() => {
                setDisableMode(false);
                setDisableCode('');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs px-3 py-2 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
