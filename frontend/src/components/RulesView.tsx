import React, { useState, useEffect } from 'react';
import { Zap, Play, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { fetchRules, saveRules, applyRules } from '../api';
import type { CustomRule } from '../api';

interface RulesViewProps {
  budgetId: string;
}

export const RulesView: React.FC<RulesViewProps> = ({ budgetId }) => {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  // New Rule Form State
  const [newRuleName, setNewRuleName] = useState('');
  const [condField, setCondField] = useState('payee_name');
  const [condOp, setCondOp] = useState('contains');
  const [condVal, setCondVal] = useState('');
  const [actType, setActType] = useState('set_category');
  const [actVal, setActVal] = useState('cat-dining');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchRules();
      setRules(data.rules || []);
    } catch (err) {
      console.error("Failed to load rules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    const updated = rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);
    await saveRules(updated);
  };

  const handleDeleteRule = async (ruleId: string) => {
    const updated = rules.filter(r => r.id !== ruleId);
    setRules(updated);
    await saveRules(updated);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName || !condVal) return;

    const newRule: CustomRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      enabled: true,
      conditions: [{ field: condField, operator: condOp, value: condVal }],
      actions: [{ action_type: actType, target_value: actVal }]
    };

    const updated = [...rules, newRule];
    setRules(updated);
    await saveRules(updated);

    // Reset form
    setNewRuleName('');
    setCondVal('');
  };

  const handleRunRules = async () => {
    setRunning(true);
    try {
      const res = await applyRules(budgetId);
      setEvalResult(res);
    } catch (err) {
      alert("Error running rule engine: " + err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '800' }}>Automated Rule Engine</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
            Configure smart auto-categorization, memo tagging, and transaction flags for YNAB.
          </p>
        </div>
        <button onClick={handleRunRules} disabled={running} className="btn-primary">
          <Play size={18} />
          {running ? "Evaluating Rules..." : "Execute Rules on Budget"}
        </button>
      </div>

      {/* Evaluation Results Banner (if run) */}
      {evalResult && (
        <div className="glass-card" style={{ padding: '20px 24px', borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={24} color="#818cf8" />
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '700' }}>Rule Engine Execution Complete</h4>
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Scanned {evalResult.total_transactions} transactions • Matched & transformed {evalResult.rule_matches} entries
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#34d399', fontWeight: 600 }}>
                Matches: {evalResult.rule_matches}
              </div>
              <div style={{ padding: '6px 14px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', color: '#fbbf24', fontWeight: 600 }}>
                Uncategorized Left: {evalResult.uncategorized_count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules List & Create Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        
        {/* Active Rules List */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#f59e0b" />
            Active Automation Rules ({rules.length})
          </h3>

          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading rules...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {rules.map((rule) => (
                <div 
                  key={rule.id} 
                  style={{ 
                    padding: '16px', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-glass)',
                    opacity: rule.enabled ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        checked={rule.enabled} 
                        onChange={() => handleToggleRule(rule.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb' }}>{rule.name}</span>
                    </div>
                    <button onClick={() => handleDeleteRule(rule.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '26px' }}>
                    <div>
                      <strong>IF:</strong> {rule.conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(' AND ')}
                    </div>
                    <div>
                      <strong>THEN:</strong> {rule.actions.map(a => `${a.action_type.replace('_', ' ')} -> ${a.target_value}`).join(', ')}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Rule Form */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={20} color="#10b981" />
            Create Custom Automation Rule
          </h3>

          <form onSubmit={handleAddRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Auto-tag Coffee Purchases"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff' }}
              />
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', display: 'block', marginBottom: '10px' }}>Condition (IF)</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280' }}>Field</label>
                  <select value={condField} onChange={(e) => setCondField(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="payee_name" style={{ background: '#111827' }}>Payee Name</option>
                    <option value="memo" style={{ background: '#111827' }}>Memo / Note</option>
                    <option value="amount" style={{ background: '#111827' }}>Amount</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280' }}>Operator</label>
                  <select value={condOp} onChange={(e) => setCondOp(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="contains" style={{ background: '#111827' }}>Contains</option>
                    <option value="equals" style={{ background: '#111827' }}>Equals</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#6b7280' }}>Match Text</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks or Uber"
                  value={condVal}
                  onChange={(e) => setCondVal(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '10px' }}>Action (THEN)</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280' }}>Action Type</label>
                  <select value={actType} onChange={(e) => setActType(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="set_category" style={{ background: '#111827' }}>Assign Category</option>
                    <option value="set_flag_color" style={{ background: '#111827' }}>Set Flag Color</option>
                    <option value="set_memo_tag" style={{ background: '#111827' }}>Append Memo Tag</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#6b7280' }}>Target Value</label>
                  {actType === 'set_flag_color' ? (
                    <select value={actVal} onChange={(e) => setActVal(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                      <option value="green" style={{ background: '#111827' }}>Green</option>
                      <option value="blue" style={{ background: '#111827' }}>Blue</option>
                      <option value="orange" style={{ background: '#111827' }}>Orange</option>
                      <option value="purple" style={{ background: '#111827' }}>Purple</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={actType === 'set_category' ? "cat-dining" : "#coffee"}
                      value={actVal}
                      onChange={(e) => setActVal(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                    />
                  )}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
              Save & Activate Rule
            </button>

          </form>
        </div>

      </div>

    </div>
  );
};
