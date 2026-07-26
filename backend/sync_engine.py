import httpx
from typing import Dict, Any, Optional
import datetime
import database

YNAB_BASE_URL = "https://api.ynab.com/v1"

class YNABSyncEngine:
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}" if api_token else "",
            "Content-Type": "application/json"
        }

    async def sync_all(self) -> Dict[str, Any]:
        """Pulls live budget data from YNAB API and syncs into local SQLite database."""
        if not self.api_token:
            # Check if local DB has data, else seed starter local budget
            local_budgets = database.get_local_budgets()
            if not local_budgets:
                self._seed_initial_local_db()
            return {"status": "local_only", "message": "Operating in local SQLite single-player mode."}

        async with httpx.AsyncClient() as client:
            try:
                # 1. Fetch budgets list
                res = await client.get(f"{YNAB_BASE_URL}/budgets", headers=self.headers)
                if res.status_code != 200:
                    return {"status": "error", "error": f"YNAB API HTTP {res.status_code}: {res.text}"}

                budgets_list = res.json()["data"]["budgets"]

                # 2. For each budget, fetch full detail and save to SQLite
                synced_count = 0
                for b in budgets_list:
                    b_id = b["id"]
                    detail_res = await client.get(f"{YNAB_BASE_URL}/budgets/{b_id}", headers=self.headers)
                    if detail_res.status_code == 200:
                        b_detail = detail_res.json()["data"]["budget"]
                        database.save_budget_snapshot(b_detail)
                        synced_count += 1

                return {
                    "status": "success",
                    "synced_budgets": synced_count,
                    "last_synced_at": datetime.datetime.now().isoformat()
                }
            except Exception as e:
                return {"status": "error", "error": str(e)}

    def _seed_initial_local_db(self):
        """Seeds SQLite database with an initial local budget structure if empty."""
        starter_budget = {
            "id": "local-main-budget",
            "name": "My Personal Budget (SQLite)",
            "last_modified_on": datetime.datetime.now().isoformat(),
            "first_month": "2026-01-01",
            "last_month": "2026-07-01",
            "currency_format": {
                "iso_code": "USD",
                "currency_symbol": "$"
            },
            "accounts": [
                {
                    "id": "acc-checking-1",
                    "name": "Primary Checking",
                    "type": "checking",
                    "on_budget": True,
                    "closed": False,
                    "balance": 3500000, # $3,500.00
                    "cleared_balance": 3500000,
                    "uncleared_balance": 0
                },
                {
                    "id": "acc-savings-1",
                    "name": "High-Yield Savings Account",
                    "type": "savings",
                    "on_budget": True,
                    "closed": False,
                    "balance": 12000000, # $12,000.00
                    "cleared_balance": 12000000,
                    "uncleared_balance": 0
                },
                {
                    "id": "acc-credit-1",
                    "name": "Travel Rewards Credit Card",
                    "type": "creditCard",
                    "on_budget": True,
                    "closed": False,
                    "balance": -450000, # -$450.00
                    "cleared_balance": -450000,
                    "uncleared_balance": 0
                }
            ],
            "category_groups": [
                {
                    "id": "cg-essentials",
                    "name": "Essential Bills",
                    "categories": [
                        {
                            "id": "cat-housing",
                            "name": "Rent / Mortgage",
                            "budgeted": 1800000,
                            "activity": -1800000,
                            "balance": 0,
                            "goal_target": 1800000,
                            "goal_type": "NEED",
                            "goal_percentage_complete": 100
                        },
                        {
                            "id": "cat-groceries-local",
                            "name": "Groceries",
                            "budgeted": 500000,
                            "activity": -320000,
                            "balance": 180000,
                            "goal_target": 500000,
                            "goal_type": "NEED",
                            "goal_percentage_complete": 64
                        }
                    ]
                },
                {
                    "id": "cg-discretionary",
                    "name": "Lifestyle & Discretionary",
                    "categories": [
                        {
                            "id": "cat-dining-local",
                            "name": "Dining & Coffee",
                            "budgeted": 250000,
                            "activity": -180000,
                            "balance": 70000,
                            "goal_target": 250000,
                            "goal_type": "NEED",
                            "goal_percentage_complete": 72
                        }
                    ]
                }
            ],
            "transactions": [
                {
                    "id": "tx-loc-1",
                    "account_id": "acc-checking-1",
                    "account_name": "Primary Checking",
                    "date": "2026-07-26",
                    "amount": -6500,
                    "payee_name": "Trader Joe's",
                    "category_id": "cat-groceries-local",
                    "category_name": "Groceries",
                    "memo": "Weekly grocery restocking",
                    "cleared": "cleared",
                    "approved": True
                },
                {
                    "id": "tx-loc-2",
                    "account_id": "acc-credit-1",
                    "account_name": "Travel Rewards Credit Card",
                    "date": "2026-07-25",
                    "amount": -1250,
                    "payee_name": "Starbucks Coffee",
                    "category_id": "cat-dining-local",
                    "category_name": "Dining & Coffee",
                    "memo": "Morning latte",
                    "cleared": "cleared",
                    "approved": True
                }
            ]
        }
        database.save_budget_snapshot(starter_budget)
