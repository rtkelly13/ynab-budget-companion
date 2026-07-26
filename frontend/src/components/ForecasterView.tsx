import React, { useState, useEffect } from 'react';
import { TrendingUp, Shield, Flame } from 'lucide-react';
import { fetchForecast } from '../api';
import type { CashflowForecast, BudgetDetail } from '../api';

interface ForecasterViewProps {
  budgetDetail: BudgetDetail;
}

export const ForecasterView: React.FC<ForecasterViewProps> = ({ budgetDetail }) => {
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [days, setDays] = useState<number>(90);

  useEffect(() => {
    loadForecast(days);
  }, [budgetDetail, days]);

  const loadForecast = async (forecastDays: number) => {
    try {
      const data = await fetchForecast(budgetDetail.id, forecastDays);
      setForecast(data);
    } catch (err) {
      console.error("Forecast failed:", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header & Days Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '800' }}>Cashflow & Net Worth Forecaster</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
            Simulate 30, 60, and 90-day cash projections based on scheduled transactions and daily burn.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: days === d ? '600' : '500',
                background: days === d ? 'var(--accent-primary)' : 'transparent',
                color: days === d ? '#fff' : '#9ca3af',
                cursor: 'pointer'
              }}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Top Forecast Metrics */}
      {forecast && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          
          <div className="glass-card" style={{ padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Net Liquid Reserve</span>
            <div className="mono-amount" style={{ fontSize: '28px', color: '#818cf8', marginTop: '8px' }}>
              {formatCurrency(forecast.net_liquid_balance)}
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Checking + Savings minus credit</span>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Daily Burn Rate</span>
            <div className="mono-amount" style={{ fontSize: '28px', color: '#f43f5e', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={22} color="#f43f5e" />
              {formatCurrency(forecast.estimated_daily_burn)} / day
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Based on recent category activity</span>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Days of Buffer</span>
            <div className="mono-amount" style={{ fontSize: '28px', color: '#34d399', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={22} color="#10b981" />
              {forecast.days_of_buffer} Days
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Runway without additional income</span>
          </div>

        </div>
      )}

      {/* Forecast Visual Trajectory Table */}
      {forecast && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="#10b981" />
            Projected Liquid Cash Trajectory ({days} Days)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {forecast.trajectory.map((point) => (
              <div 
                key={point.day} 
                style={{ 
                  padding: '14px 18px', 
                  background: 'rgba(255, 255, 255, 0.025)', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
                    +{point.day}d
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb' }}>
                      {point.date}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Day {point.day} Milestone
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div className="mono-amount" style={{ fontSize: '16px', color: '#34d399' }}>
                    {formatCurrency(point.projected_net_liquid)}
                  </div>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    background: point.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: point.status === 'healthy' ? '#34d399' : '#fbbf24'
                  }}>
                    {point.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
