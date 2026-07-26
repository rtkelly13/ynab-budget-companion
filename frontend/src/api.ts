const API_BASE = "http://localhost:8000/api";

export interface YNABBudget {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
}

export interface YNABAccount {
  id: string;
  name: string;
  type: string;
  on_budget: boolean;
  closed: boolean;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
}

export interface YNABCategory {
  id: string;
  name: string;
  budgeted: number;
  activity: number;
  balance: number;
  goal_target?: number;
  goal_type?: string;
  goal_percentage_complete?: number;
}

export interface YNABCategoryGroup {
  id: string;
  name: string;
  categories: YNABCategory[];
}

export interface YNABTransaction {
  id: string;
  date: string;
  amount: number;
  memo?: string;
  cleared: string;
  approved: boolean;
  flag_color?: string;
  account_id: string;
  account_name: string;
  payee_id?: string;
  payee_name?: string;
  category_id?: string;
  category_name?: string;
  import_id?: string;
  applied_rules?: string[];
  proposed_category_id?: string;
  proposed_flag_color?: string;
  synced_to_ynab?: boolean;
}

export interface BudgetDetail {
  id: string;
  name: string;
  to_be_budgeted: number;
  age_of_money: number;
  last_synced_at?: string;
  accounts: YNABAccount[];
  category_groups: YNABCategoryGroup[];
  transactions: YNABTransaction[];
  scheduled_transactions: any[];
}

export interface CustomRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Array<{ field: string; operator: string; value: string }>;
  actions: Array<{ action_type: string; target_value: string }>;
}

export interface AccountAudit {
  account_id: string;
  account_name: string;
  account_type: string;
  ynab_cleared_balance: number;
  ynab_uncleared_balance: number;
  ynab_working_balance: number;
  statement_balance: number;
  variance: number;
  status: string;
  uncleared_count: number;
  uncleared_transactions: YNABTransaction[];
}

export interface ReconciliationReport {
  total_accounts_audited: number;
  accounts_in_sync: number;
  accounts_requiring_attention: number;
  total_discrepancy_variance: number;
  potential_duplicates_count: number;
  potential_duplicates: Array<{ original_tx: YNABTransaction; duplicate_tx: YNABTransaction; reason: string }>;
  account_audits: AccountAudit[];
}

export interface ForecastPoint {
  day: number;
  date: string;
  projected_net_liquid: number;
  status: string;
}

export interface CashflowForecast {
  current_liquid_assets: number;
  current_credit_debt: number;
  net_liquid_balance: number;
  estimated_daily_burn: number;
  days_of_buffer: number;
  age_of_money: number;
  health_score: number;
  forecast_days: number;
  trajectory: ForecastPoint[];
}

export interface BackupItem {
  filename: string;
  filepath: string;
  size_bytes: number;
  created_at: string;
}

function getHeaders(token?: string) {
  const t = token || localStorage.getItem("ynab_access_token") || "";
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
}

export async function fetchStatus(token?: string) {
  const res = await fetch(`${API_BASE}/status`, { headers: getHeaders(token) });
  return res.json();
}

export async function triggerSync(token?: string) {
  const res = await fetch(`${API_BASE}/sync`, {
    method: "POST",
    headers: getHeaders(token)
  });
  return res.json();
}

export async function createGoogleDriveBackup() {
  const res = await fetch(`${API_BASE}/backup/now`, { method: "POST" });
  return res.json();
}

export async function fetchBackups(): Promise<{ backups: BackupItem[]; backup_dir: string }> {
  const res = await fetch(`${API_BASE}/backups`);
  return res.json();
}

export async function restoreBackup(filename: string) {
  const res = await fetch(`${API_BASE}/backup/restore/${filename}`, { method: "POST" });
  return res.json();
}

export async function uploadBankCSV(budgetId: string, accountId: string, file: File) {
  const formData = new FormData();
  formData.append("budget_id", budgetId);
  formData.append("account_id", accountId);
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/ingest/csv`, {
    method: "POST",
    body: formData
  });
  return res.json();
}

export async function fetchBudgets() {
  const res = await fetch(`${API_BASE}/budgets`, { headers: getHeaders() });
  return res.json();
}

export async function fetchBudgetDetail(budgetId: string): Promise<{ budget: BudgetDetail; storage: string }> {
  const res = await fetch(`${API_BASE}/budget/${budgetId}`, { headers: getHeaders() });
  return res.json();
}

export async function fetchRules() {
  const res = await fetch(`${API_BASE}/rules`);
  return res.json();
}

export async function saveRules(rules: CustomRule[]) {
  const res = await fetch(`${API_BASE}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules)
  });
  return res.json();
}

export async function applyRules(budgetId: string) {
  const res = await fetch(`${API_BASE}/rules/apply/${budgetId}`, {
    method: "POST",
    headers: getHeaders()
  });
  return res.json();
}

export async function runReconciliation(budgetId: string, statementBalances: Record<string, number>): Promise<ReconciliationReport> {
  const res = await fetch(`${API_BASE}/reconcile/${budgetId}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ statement_balances: statementBalances })
  });
  return res.json();
}

export async function fetchForecast(budgetId: string, days = 90): Promise<CashflowForecast> {
  const res = await fetch(`${API_BASE}/forecast/${budgetId}?days=${days}`, {
    headers: getHeaders()
  });
  return res.json();
}

export async function createTransaction(budgetId: string, tx: { account_id: string; date: string; amount: number; payee_name: string; category_id?: string; memo?: string }) {
  const res = await fetch(`${API_BASE}/transactions/${budgetId}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(tx)
  });
  return res.json();
}
