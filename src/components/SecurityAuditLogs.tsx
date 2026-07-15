import React, { useState, useEffect } from 'react';
import { SecurityLog } from '../types';
import { ShieldCheck, ShieldAlert, Clock, RefreshCw, Info, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

interface SecurityAuditLogsProps {
  userId: string;
}

export default function SecurityAuditLogs({ userId }: SecurityAuditLogsProps) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/logs');
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Failed to load logs.");
      } else {
        setLogs(result.logs || []);
      }
    } catch (err) {
      setError("Network error fetching audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  const getActionStyles = (action: SecurityLog['action']) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
      case '2FA_ENABLED':
      case '2FA_VERIFIED':
      case 'REGISTER':
        return {
          bg: 'bg-green-50 border-green-200 text-green-700',
          dot: 'bg-green-500'
        };
      case 'LOGIN_FAILED':
      case 'LOCKOUT':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500'
        };
      case 'SQL_INJECTION_ATTEMPT':
        return {
          bg: 'bg-red-50 border-red-200 text-red-700 font-bold',
          dot: 'bg-red-600 animate-pulse'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200 text-gray-700',
          dot: 'bg-gray-400'
        };
    }
  };

  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-6" id="security-audit-trail">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Security Audit Trail</h3>
            <p className="text-xs text-gray-500">Real-time immutable monitoring log for this user account</p>
          </div>
        </div>
        <button
          id="refresh-logs-btn"
          onClick={fetchLogs}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4" id="logs-error-toast">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1" id="logs-container">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center justify-center gap-2">
            <Info className="w-8 h-8 opacity-40" />
            <p className="text-sm">No security logs recorded yet.</p>
          </div>
        ) : (
          logs.map((log) => {
            const styles = getActionStyles(log.action);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/75 border border-gray-100 rounded-xl transition-all text-xs gap-3"
              >
                <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                  <span className={`h-2 w-2 rounded-full mt-1.5 md:mt-0 shrink-0 ${styles.dot}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 break-words">{log.details}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleTimeString()} {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="font-mono">IP: {log.ipAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="flex md:justify-end shrink-0">
                  <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-mono tracking-wider border ${styles.bg}`}>
                    {log.action}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-100 pt-3 mt-4 text-[10px] text-gray-400 flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
        SIEM protection is active. Unauthorized logins trigger automatic locking.
      </div>
    </div>
  );
}
