import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle, X, ExternalLink, Database } from 'lucide-react';
import { fetchStatus, triggerSync } from '../api';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [token, setToken] = useState(localStorage.getItem('ynab_access_token') || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchStatus(token);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: 'error', error: err.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    localStorage.setItem('ynab_access_token', token);
    if (token) {
      await triggerSync(token);
    }
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: '#111827', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={22} color="#818cf8" />
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>YNAB API & SQLite Storage</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Storage Banner */}
          <div style={{ padding: '14px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399' }}>Single-Player SQLite Database Active</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                All budgets, transactions, rules, and reconciliations are stored locally in <code>ynab_companion.db</code>.
              </div>
            </div>
          </div>

          {/* Live Personal Access Token Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>
                YNAB Personal Access Token
              </label>
              <a 
                href="https://app.ynab.com/settings/developer" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '11px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Get Token from YNAB <ExternalLink size={10} />
              </a>
            </div>
            <input
              type="password"
              placeholder="Paste YNAB Personal Access Token to sync live data..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div style={{ padding: '12px 14px', borderRadius: '8px', fontSize: '13px', background: testResult.status === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: testResult.status === 'ok' ? '#34d399' : '#f43f5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {testResult.status === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {testResult.status === 'ok' 
                ? `Connection successful! SQLite Database: ${testResult.db_file}` 
                : `Error: ${testResult.error}`}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button type="button" onClick={handleTestConnection} disabled={testing} className="btn-secondary">
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button type="button" onClick={handleSave} className="btn-primary">
              Save Token & Sync Database
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
