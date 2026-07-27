import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Zap, 
  Scale, 
  TrendingUp, 
  Key, 
  Database,
  Cloud,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { Button, Badge, Avatar } from '@rtkelly13/design-system';
import type { YNABBudget } from '../api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  budgets: YNABBudget[];
  selectedBudgetId: string;
  setSelectedBudgetId: (id: string) => void;
  onSync: () => Promise<void>;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  budgets,
  selectedBudgetId,
  setSelectedBudgetId,
  onSync,
  onOpenSettings
}) => {
  const [syncing, setSyncing] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'categories', label: 'Categories & Targets', icon: Layers },
    { id: 'rules', label: 'Custom Rules', icon: Zap },
    { id: 'reconcile', label: 'Reconciliation', icon: Scale },
    { id: 'forecast', label: 'Cashflow Forecast', icon: TrendingUp },
    { id: 'ingestion', label: 'Bank Feeds & Backups', icon: Cloud },
  ];

  const handleSyncClick = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header
      style={{
        borderBottom: '3px solid var(--border-color, #ffffff)',
        backgroundColor: 'var(--color-black, #000000)',
        padding: '1rem 2rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & Budget Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar fallback="YN" accent="cyan" size="md" />
            <div>
              <h1 style={{ fontFamily: 'var(--font-space-grotesk, "Space Grotesk"), sans-serif', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: 'var(--brutalist-cyan, #22d3ee)' }}>
                [ YNAB COMPANION ]
              </h1>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono, "IBM Plex Mono"), monospace', fontSize: '0.75rem', color: 'var(--brutalist-yellow, #facc15)' }}>
                SINGLE-PLAYER LOCAL PERSISTENCE
              </span>
            </div>
          </div>

          {/* Budget Dropdown */}
          {budgets.length > 0 && (
            <div style={{ position: 'relative', marginLeft: '1rem' }}>
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-black, #000000)',
                  color: 'var(--color-white, #ffffff)',
                  border: '2px solid var(--border-color, #ffffff)',
                  padding: '0.4rem 2rem 0.4rem 0.8rem',
                  fontFamily: 'var(--font-space-grotesk, "Space Grotesk"), sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  appearance: 'none'
                }}
              >
                {budgets.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: '#000000', color: '#ffffff' }}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--brutalist-cyan, #22d3ee)' }} />
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={isActive ? 'cyan' : 'default'}
                bracketed={isActive}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </Button>
            );
          })}
        </nav>

        {/* SQLite Storage Indicator, Sync & Settings Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Badge accent="green">
            <Database size={14} style={{ display: 'inline', marginRight: '4px' }} />
            SQLITE ACTIVE
          </Badge>

          <Button 
            onClick={handleSyncClick} 
            disabled={syncing}
            variant="pink"
            bracketed
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? "SYNCING..." : "SYNC YNAB"}
          </Button>

          <Button onClick={onOpenSettings} bracketed style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <Key size={14} />
            API TOKEN
          </Button>
        </div>

      </div>
    </header>
  );
};
