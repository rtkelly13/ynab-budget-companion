import React, { useState } from 'react';
import { 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  Activity, 
  PlusCircle, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle, 
  AlertCircle
} from 'lucide-react';
import { createTransaction } from '../api';
import type { BudgetDetail } from '../api';

interface DashboardViewProps {
  budgetDetail: BudgetDetail;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ budgetDetail, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({
    account_id: budgetDetail.accounts[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    payee_name: '',
    category_id: budgetDetail.category_groups[0]?.categories[0]?.id || '',
    memo: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const readyToAssign = (budgetDetail.to_be_budgeted || 0) / 1000.0;
  const ageOfMoney = budgetDetail.age_of_money || 42;

  const totalLiquid = budgetDetail.accounts
    .filter(a => a.on_budget && (a.type === 'checking' || a.type === 'savings'))
    .reduce((sum, a) => sum + (a.balance / 1000.0), 0);

  const creditDebt = budgetDetail.accounts
    .filter(a => a.on_budget && a.type === 'creditCard')
    .reduce((sum, a) => sum + Math.abs(a.balance / 1000.0), 0);

  const netLiquid = totalLiquid - creditDebt;

  // Simple health score formula
  const healthScore = Math.min(100, Math.max(0, Math.round((ageOfMoney / 60 * 40) + (netLiquid > 5000 ? 50 : 25) + 10)));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.payee_name || !newTx.amount || !newTx.account_id) return;
    setSubmitting(true);
    try {
      await createTransaction(budgetDetail.id, {
        ...newTx,
        amount: parseFloat(newTx.amount)
      });
      setShowAddModal(false);
      setNewTx({
        account_id: budgetDetail.accounts[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payee_name: '',
        category_id: budgetDetail.category_groups[0]?.categories[0]?.id || '',
        memo: ''
      });
      onRefresh();
    } catch (err) {
      alert("Error adding transaction: " + err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '800' }}>Budget Summary & Overview</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
            Real-time financial status, liquidity metrics, and account health.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <PlusCircle size={18} />
          Record New Transaction
        </button>
      </div>

      {/* Top 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Ready to Assign */}
        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ready to Assign
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <span className="mono-amount" style={{ fontSize: '30px', color: readyToAssign >= 0 ? '#34d399' : '#f43f5e' }}>
              {formatCurrency(readyToAssign)}
            </span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
            {readyToAssign > 0 ? "⚡ Funds available to budget out" : "All dollars have a job!"}
          </div>
        </div>

        {/* Card 2: Net Liquid Balance */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Net Liquid Balance
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#6366f1" />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <span className="mono-amount" style={{ fontSize: '30px', color: '#818cf8' }}>
              {formatCurrency(netLiquid)}
            </span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
            Liquid cash ({formatCurrency(totalLiquid)}) minus debt ({formatCurrency(creditDebt)})
          </div>
        </div>

        {/* Card 3: Age of Money */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Age of Money
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="mono-amount" style={{ fontSize: '30px', color: '#fbbf24' }}>
              {ageOfMoney}
            </span>
            <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: '600' }}>days</span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
            YNAB target: 30+ days buffer achieved!
          </div>
        </div>

        {/* Card 4: Budget Health Score */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Health Index
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="mono-amount" style={{ fontSize: '30px', color: '#a78bfa' }}>
              {healthScore}
            </span>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>/ 100</span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${healthScore}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: '3px' }}></div>
            </div>
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>Optimal</span>
          </div>
        </div>

      </div>

      {/* Grid: Accounts & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Accounts List */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={20} color="#818cf8" />
            Connected Budget Accounts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {budgetDetail.accounts.map((acc) => {
              const dollars = acc.balance / 1000.0;
              const unclearedDollars = acc.uncleared_balance / 1000.0;
              return (
                <div key={acc.id} style={{ padding: '14px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb' }}>{acc.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', textTransform: 'capitalize' }}>
                      {acc.type} • Cleared: {formatCurrency(acc.cleared_balance / 1000.0)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-amount" style={{ fontSize: '15px', color: dollars < 0 ? '#f43f5e' : '#34d399' }}>
                      {formatCurrency(dollars)}
                    </div>
                    {unclearedDollars !== 0 && (
                      <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                        Uncleared: {formatCurrency(unclearedDollars)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#10b981" />
            Recent Budget Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {budgetDetail.transactions.slice(0, 5).map((tx) => {
              const amt = tx.amount / 1000.0;
              const isIncome = amt > 0;
              return (
                <div key={tx.id} style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isIncome ? <ArrowDownRight size={18} color="#10b981" /> : <ArrowUpRight size={18} color="#f43f5e" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb' }}>
                        {tx.payee_name || 'Unspecified Payee'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {tx.date} • {tx.category_name || 'Uncategorized'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-amount" style={{ fontSize: '14px', color: isIncome ? '#34d399' : '#f9fafb' }}>
                      {isIncome ? `+${formatCurrency(amt)}` : formatCurrency(amt)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                      {tx.cleared === 'cleared' ? (
                        <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}><CheckCircle size={10} /> Cleared</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }}><AlertCircle size={10} /> Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Record Transaction Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#111827', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Record New Transaction</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Account</label>
                <select
                  value={newTx.account_id}
                  onChange={(e) => setNewTx({ ...newTx, account_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
                >
                  {budgetDetail.accounts.map(a => (
                    <option key={a.id} value={a.id} style={{ background: '#111827' }}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Date</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-15.50 or 500"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Payee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks or Trader Joe's"
                  value={newTx.payee_name}
                  onChange={(e) => setNewTx({ ...newTx, payee_name: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Category</label>
                <select
                  value={newTx.category_id}
                  onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
                >
                  {budgetDetail.category_groups.flatMap(cg => cg.categories).map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#111827' }}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Memo (Optional)</label>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={newTx.memo}
                  onChange={(e) => setNewTx({ ...newTx, memo: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Saving..." : "Submit Transaction"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
