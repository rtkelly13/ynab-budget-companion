import React from 'react';
import { Layers, Target } from 'lucide-react';
import type { BudgetDetail } from '../api';

interface CategoriesViewProps {
  budgetDetail: BudgetDetail;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ budgetDetail }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      <div>
        <h2 style={{ fontSize: '26px', fontWeight: '800' }}>Categories & Target Progress</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
          Inspect category group allocations, monthly target fulfillment, and available balances.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {budgetDetail.category_groups.map((group) => {
          const totalGroupBudgeted = group.categories.reduce((acc, c) => acc + (c.budgeted / 1000.0), 0);
          const totalGroupActivity = group.categories.reduce((acc, c) => acc + (c.activity / 1000.0), 0);
          const totalGroupAvailable = group.categories.reduce((acc, c) => acc + (c.balance / 1000.0), 0);

          return (
            <div key={group.id} className="glass-card" style={{ padding: '24px' }}>
              
              {/* Group Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={20} color="#818cf8" />
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{group.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ color: '#9ca3af' }}>Budgeted: <strong style={{ color: '#fff' }}>{formatCurrency(totalGroupBudgeted)}</strong></span>
                  <span style={{ color: '#9ca3af' }}>Activity: <strong style={{ color: '#f43f5e' }}>{formatCurrency(totalGroupActivity)}</strong></span>
                  <span style={{ color: '#9ca3af' }}>Available: <strong style={{ color: '#34d399' }}>{formatCurrency(totalGroupAvailable)}</strong></span>
                </div>
              </div>

              {/* Categories Grid / Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {group.categories.map((cat) => {
                  const budgeted = cat.budgeted / 1000.0;
                  const activity = cat.activity / 1000.0;
                  const balance = cat.balance / 1000.0;
                  const target = cat.goal_target ? cat.goal_target / 1000.0 : budgeted;
                  const percent = cat.goal_percentage_complete || (target > 0 ? Math.min(100, Math.round((budgeted / target) * 100)) : 100);

                  return (
                    <div 
                      key={cat.id} 
                      style={{ 
                        padding: '16px 20px', 
                        background: 'rgba(255, 255, 255, 0.025)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#f9fafb' }}>{cat.name}</div>
                          {cat.goal_target && (
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Target size={13} color="#f59e0b" />
                              Target: {formatCurrency(target)} / month
                            </div>
                          )}
                        </div>

                        {/* Financial Columns */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '14px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Budgeted</div>
                            <div className="mono-amount" style={{ color: '#e5e7eb' }}>{formatCurrency(budgeted)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Spent</div>
                            <div className="mono-amount" style={{ color: activity < 0 ? '#f43f5e' : '#9ca3af' }}>{formatCurrency(activity)}</div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '100px' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Available</div>
                            <div className="mono-amount" style={{ color: balance >= 0 ? '#34d399' : '#f43f5e', fontSize: '15px' }}>{formatCurrency(balance)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Goal Meter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${Math.min(100, percent)}%`, 
                              height: '100%', 
                              background: percent >= 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #f59e0b)',
                              borderRadius: '4px' 
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: percent >= 100 ? '#34d399' : '#fbbf24', minWidth: '45px', textAlign: 'right' }}>
                          {percent}%
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
