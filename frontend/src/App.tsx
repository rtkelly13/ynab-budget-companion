import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CategoriesView } from './components/CategoriesView';
import { RulesView } from './components/RulesView';
import { ReconciliationView } from './components/ReconciliationView';
import { ForecasterView } from './components/ForecasterView';
import { BankIngestionView } from './components/BankIngestionView';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { fetchBudgets, fetchBudgetDetail, triggerSync } from './api';
import type { YNABBudget, BudgetDetail } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [budgets, setBudgets] = useState<YNABBudget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [budgetDetail, setBudgetDetail] = useState<BudgetDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    if (selectedBudgetId) {
      loadBudgetDetail(selectedBudgetId);
    }
  }, [selectedBudgetId]);

  const loadBudgets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBudgets();
      const bList = data.budgets || [];
      setBudgets(bList);
      if (bList.length > 0) {
        setSelectedBudgetId(bList[0].id);
      }
    } catch (err: any) {
      setError("Failed to connect to backend SQLite server. Make sure the FastAPI server is running on http://localhost:8000.");
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetDetail = async (id: string) => {
    try {
      const res = await fetchBudgetDetail(id);
      setBudgetDetail(res.budget);
    } catch (err: any) {
      setError("Failed to fetch budget details from local SQLite database: " + err.message);
    }
  };

  const handleSync = async () => {
    try {
      await triggerSync();
      await loadBudgets();
      if (selectedBudgetId) {
        await loadBudgetDetail(selectedBudgetId);
      }
    } catch (err: any) {
      alert("Sync error: " + err.message);
    }
  };

  const handleSettingsSaved = () => {
    handleSync();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        budgets={budgets}
        selectedBudgetId={selectedBudgetId}
        setSelectedBudgetId={setSelectedBudgetId}
        onSync={handleSync}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '0 32px 48px 32px', flex: 1 }}>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading budget data from SQLite Database (`ynab_companion.db`)...</p>
          </div>
        ) : error ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f43f5e', marginBottom: '12px' }}>Connection Error</h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', maxWidth: '600px', margin: '0 auto 20px auto' }}>{error}</p>
            <button onClick={loadBudgets} className="btn-primary">Retry Connection</button>
          </div>
        ) : budgetDetail ? (
          <>
            {activeTab === 'dashboard' && <DashboardView budgetDetail={budgetDetail} onRefresh={() => loadBudgetDetail(selectedBudgetId)} />}
            {activeTab === 'categories' && <CategoriesView budgetDetail={budgetDetail} />}
            {activeTab === 'rules' && <RulesView budgetId={selectedBudgetId} />}
            {activeTab === 'reconcile' && <ReconciliationView budgetDetail={budgetDetail} />}
            {activeTab === 'forecast' && <ForecasterView budgetDetail={budgetDetail} />}
            {activeTab === 'ingestion' && <BankIngestionView budgetDetail={budgetDetail} onRefresh={() => loadBudgetDetail(selectedBudgetId)} />}
          </>
        ) : null}

      </main>

      {/* Settings Modal */}
      <ApiSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaved={handleSettingsSaved}
      />

    </div>
  );
}

export default App;
