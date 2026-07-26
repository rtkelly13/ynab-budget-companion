import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, RotateCcw, Building2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { createGoogleDriveBackup, fetchBackups, restoreBackup, uploadBankCSV } from '../api';
import type { BackupItem, BudgetDetail } from '../api';

interface BankIngestionViewProps {
  budgetDetail: BudgetDetail;
  onRefresh: () => void;
}

export const BankIngestionView: React.FC<BankIngestionViewProps> = ({ budgetDetail, onRefresh }) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupDir, setBackupDir] = useState<string>('');
  const [loadingBackups, setLoadingBackups] = useState<boolean>(true);
  const [backingUp, setBackingUp] = useState<boolean>(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

  // CSV Import State
  const [selectedAccId, setSelectedAccId] = useState<string>(budgetDetail.accounts[0]?.id || '');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    loadBackupsList();
  }, []);

  const loadBackupsList = async () => {
    setLoadingBackups(true);
    try {
      const data = await fetchBackups();
      setBackups(data.backups || []);
      setBackupDir(data.backup_dir || '');
    } catch (err) {
      console.error("Failed to load backups list:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const res = await createGoogleDriveBackup();
      if (res.status === 'success') {
        await loadBackupsList();
      } else {
        alert("Backup error: " + res.error);
      }
    } catch (err: any) {
      alert("Backup failed: " + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore SQLite database from '${filename}'?`)) return;
    setRestoringFile(filename);
    try {
      const res = await restoreBackup(filename);
      if (res.status === 'restored') {
        alert("Database successfully restored from Google Drive backup!");
        onRefresh();
      } else {
        alert("Restore error: " + res.error);
      }
    } catch (err: any) {
      alert("Restore failed: " + err.message);
    } finally {
      setRestoringFile(null);
    }
  };

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || !selectedAccId) return;
    setUploading(true);
    try {
      const res = await uploadBankCSV(budgetDetail.id, selectedAccId, csvFile);
      if (res.status === 'success') {
        alert(`Successfully ingested ${res.ingested_count} transactions into SQLite! An automatic Google Drive backup was created.`);
        setCsvFile(null);
        await loadBackupsList();
        onRefresh();
      }
    } catch (err: any) {
      alert("CSV upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: '800' }}>Bank Data Sync & Google Drive Backups</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
          Connect bank data feeds, import CSV statements, and manage automatic Google Drive SQLite backups.
        </p>
      </div>

      {/* Grid: Bank Ingestion Sources & Google Drive Backup Center */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        
        {/* Panel 1: Bank Ingestion & Open Banking Connector */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={20} color="#10b981" />
            Bank Financial Feeds & Direct Ingestion
          </h3>

          <form onSubmit={handleCsvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '4px' }}>
                Bank CSV File Importer
              </span>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                Directly import CSV exports from Chase, Amex, Bank of America, Monzo, or Revolut. SHA-256 deduplication prevents double entries.
              </p>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Target Account</label>
                <select
                  value={selectedAccId}
                  onChange={(e) => setSelectedAccId(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                >
                  {budgetDetail.accounts.map(a => (
                    <option key={a.id} value={a.id} style={{ background: '#111827' }}>{a.name} ({a.type})</option>
                  ))}
                </select>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                style={{ width: '100%', fontSize: '12px', color: '#9ca3af' }}
              />
            </div>

            <button type="submit" disabled={uploading || !csvFile} className="btn-primary" style={{ justifyContent: 'center' }}>
              <FileSpreadsheet size={16} />
              {uploading ? "Ingesting Transactions..." : "Import Bank CSV into SQLite"}
            </button>

          </form>

          {/* Open Banking Roadmap Card */}
          <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} /> Open Banking Connector Architecture
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              Designed to connect directly to Nordigen / GoCardless / Plaid APIs to subsume YNAB as your primary backing engine.
            </p>
          </div>

        </div>

        {/* Panel 2: Google Drive SQLite Backup Manager */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cloud size={20} color="#818cf8" />
              Google Drive Backups
            </h3>
            <button onClick={handleBackupNow} disabled={backingUp} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <RefreshCw size={14} style={{ animation: backingUp ? 'spin 1s linear infinite' : 'none' }} />
              {backingUp ? "Backing up..." : "Backup Now"}
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
            Destination Folder: <code style={{ color: '#818cf8' }}>{backupDir || '~/Google Drive/My Drive/Backup/YNAB_Companion'}</code>
          </div>

          {loadingBackups ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Scanning Google Drive backups...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {backups.map((b) => (
                <div 
                  key={b.filename} 
                  style={{ 
                    padding: '12px 14px', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f9fafb' }}>{b.filename}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {(b.size_bytes / 1024).toFixed(1)} KB • Created {new Date(b.created_at).toLocaleString()}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRestore(b.filename)} 
                    disabled={restoringFile === b.filename}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <RotateCcw size={12} />
                    {restoringFile === b.filename ? "Restoring..." : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
