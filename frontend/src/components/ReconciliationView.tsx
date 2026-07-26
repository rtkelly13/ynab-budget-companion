import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { runReconciliation } from '../api';
import type { BudgetDetail, ReconciliationReport } from '../api';

interface ReconciliationViewProps {
  budgetDetail: BudgetDetail;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ budgetDetail }) => {
  const [statementBalances, setStatementBalances] = useState<Record<string, number>>({});
  const [report, setReport] = useState<ReconciliationReport | null>(null);

  useEffect(() => {
    // Initialize statement balances with YNAB cleared balances
    const initial: Record<string, number> = {};
    budgetDetail.accounts.forEach(acc => {
      initial[acc.id] = acc.cleared_balance / 1000.0;
    });
    setStatementBalances(initial);
    // Run initial reconciliation audit
    executeAudit(initial);
  }, [budgetDetail]);

  const executeAudit = async (balances: Record<string, number>) => {
    try {
      const res = await runReconciliation(budgetDetail.id, balances);
      setReport(res);
    } catch (err) {
      console.error("Reconciliation audit failed:", err);
    }
  };

  const handleBalanceChange = (accId: string, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = { ...statementBalances, [accId]: num };
    setStatementBalances(updated);
    executeAudit(updated);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: '800' }}>Automated Reconciliation Audit</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
          Compare YNAB cleared balances against live bank statements, flag uncleared items, and detect duplicate transactions.
        </p>
      </div>

      {/* Summary Cards */}
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          
          <div className="glass-card" style={{ padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Accounts In Sync</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={24} color="#10b981" />
              {report.accounts_in_sync} / {report.total_accounts_audited}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Total Variance</span>
            <div className="mono-amount" style={{ fontSize: '28px', color: report.total_discrepancy_variance === 0 ? '#34d399' : '#f43f5e', marginTop: '8px' }}>
              {formatCurrency(report.total_discrepancy_variance)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Potential Duplicates</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: report.potential_duplicates_count > 0 ? '#fbbf24' : '#818cf8', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Copy size={24} color={report.potential_duplicates_count > 0 ? '#f59e0b' : '#818cf8'} />
              {report.potential_duplicates_count}
            </div>
          </div>

        </div>
      )}

      {/* Accounts Reconciliation Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Scale size={20} color="#818cf8" />
          Account Statement Comparison
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Account</th>
                <th style={{ padding: '12px 16px' }}>YNAB Cleared Balance</th>
                <th style={{ padding: '12px 16px' }}>Bank Statement Balance</th>
                <th style={{ padding: '12px 16px' }}>Variance</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {report?.account_audits.map((acc) => (
                <tr key={acc.account_id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', fontWeight: '600' }}>{acc.account_name}</td>
                  <td className="mono-amount" style={{ padding: '16px', color: '#e5e7eb' }}>{formatCurrency(acc.ynab_cleared_balance)}</td>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={statementBalances[acc.account_id] ?? acc.ynab_cleared_balance}
                      onChange={(e) => handleBalanceChange(acc.account_id, e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        width: '140px'
                      }}
                    />
                  </td>
                  <td className="mono-amount" style={{ padding: '16px', color: acc.variance === 0 ? '#34d399' : '#f43f5e', fontWeight: 600 }}>
                    {formatCurrency(acc.variance)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {acc.status === 'in_sync' ? (
                      <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Balanced
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> Discrepancy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Transactions Alert Card (if any) */}
      {report && report.potential_duplicates.length > 0 && (
        <div className="glass-card" style={{ padding: '24px', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Copy size={20} color="#f59e0b" />
            Detected Potential Duplicate Transactions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {report.potential_duplicates.map((dup, idx) => (
              <div key={idx} style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb' }}>
                    {dup.duplicate_tx.payee_name} • {formatCurrency(dup.duplicate_tx.amount / 1000.0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    {dup.reason}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>Review in YNAB</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
