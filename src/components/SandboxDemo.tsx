import React, { useState } from 'react';
import { Shield, ShieldAlert, Play, Terminal, Info, ChevronRight, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function SandboxDemo() {
  const [useParameterization, setUseParameterization] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [sqlExecuted, setSqlExecuted] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const testPayloads = [
    { label: "Valid Email Search", value: "user@example.com" },
    { label: "Standard Injection Attack", value: "admin@example.com' OR '1'='1" },
    { label: "Comment Out Attack", value: "malicious' --" },
  ];

  const handleRunQuery = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security-demo/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText: "SELECT * FROM users WHERE email = $1",
          useParameterization,
          paramValue: inputValue
        }),
      });
      const result = await response.json();
      if (result.success) {
        setResults(result.results);
        setSqlExecuted(result.queryExecuted);
        setExplanation(result.details);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-6" id="sql-sandbox-panel">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Vulnerability Sandbox</h3>
          <p className="text-xs text-gray-500">Live SQL Injection simulator and protection breakdown</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          See firsthand how **SQL Injection** works. Select an exploit payload below, then compare the database response between an insecure concatenated query and a secure parameterized query.
        </p>

        {/* Payload suggestions */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Test Injection Payloads</label>
          <div className="flex flex-wrap gap-2">
            {testPayloads.map((payload, idx) => (
              <button
                id={`payload-btn-${idx}`}
                key={idx}
                type="button"
                onClick={() => setInputValue(payload.value)}
                className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-mono transition-colors active:scale-95 flex items-center gap-1"
              >
                <ChevronRight className="w-3 h-3 text-gray-400" />
                {payload.label}
              </button>
            ))}
          </div>
        </div>

        {/* Query Builder Interface */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="text-xs font-bold text-gray-500">DATABASE QUERY ENGINE</div>
            
            {/* Mode Switcher */}
            <div className="flex p-1 bg-gray-200 rounded-xl gap-1">
              <button
                id="sandbox-secure-mode-btn"
                type="button"
                onClick={() => setUseParameterization(true)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${useParameterization ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Parameterized (Secure)
              </button>
              <button
                id="sandbox-vulnerable-mode-btn"
                type="button"
                onClick={() => setUseParameterization(false)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${!useParameterization ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Concatenated (Vulnerable)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">User Email Input</label>
              <div className="flex gap-2">
                <input
                  id="sandbox-sql-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter email or payload..."
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  id="sandbox-run-query-btn"
                  onClick={handleRunQuery}
                  disabled={loading || !inputValue}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/15 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run
                </button>
              </div>
            </div>

            {/* Simulated Query string preview */}
            <div className="bg-gray-900 rounded-xl p-3 text-xs font-mono text-gray-300 border border-gray-800 flex items-start gap-2.5">
              <Terminal className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div className="break-all select-all">
                <span className="text-gray-500">// Engine executes:</span>
                <p className="mt-0.5 text-indigo-300">
                  {useParameterization 
                    ? `db.query("SELECT * FROM users WHERE email = $1", ["${inputValue || '...' /* secure param binding */ }"])`
                    : `db.query("SELECT * FROM users WHERE email = '${inputValue || '...' /* raw injected string concat */ }'")`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results and Explanations */}
        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Security Indicator */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${useParameterization ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {useParameterization ? (
                <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold uppercase tracking-wider">{useParameterization ? "Protected Mode Active" : "Vulnerable Path Executed"}</p>
                <p className="mt-1 leading-relaxed">{explanation}</p>
              </div>
            </div>

            {/* Results Table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Database Response ({results.length} record{results.length === 1 ? '' : 's'} returned)
              </div>
              <div className="max-h-48 overflow-y-auto font-mono text-[11px] p-3 divide-y divide-gray-50">
                {results.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">Empty set (0 rows found).</div>
                ) : (
                  results.map((row, idx) => (
                    <div key={idx} className="py-2 flex justify-between gap-4">
                      <span className="text-indigo-600 font-semibold">{row.email}</span>
                      <span className="text-gray-400 text-[10px] truncate max-w-[150px]" title={row.passwordHash}>
                        {row.passwordHash}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
