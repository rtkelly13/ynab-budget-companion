import httpx
from typing import Dict, Any, List, Optional
import datetime

YNAB_BASE_URL = "https://api.ynab.com/v1"

class YNABClient:
    def __init__(self, api_token: Optional[str] = None, use_demo: bool = True):
        self.api_token = api_token
        self.use_demo = use_demo or not api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}" if api_token else "",
            "Content-Type": "application/json"
        }

    async def test_connection(self) -> Dict[str, Any]:
        if self.use_demo or not self.api_token:
            return {"status": "ok", "mode": "demo", "user": {"user_id": "demo-user-123", "email": "demo@ynabcompanion.app"}}
        
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{YNAB_BASE_URL}/user", headers=self.headers)
            if res.status_code == 200:
                data = res.json()["data"]
                return {"status": "ok", "mode": "live", "user": data["user"]}
            else:
                return {"status": "error", "mode": "live", "error": f"HTTP {res.status_code}: {res.text}"}

    async def get_budgets(self) -> List[Dict[str, Any]]:
        if self.use_demo or not self.api_token:
            return [
                {
                    "id": "demo-budget-2026",
                    "name": "Main Personal Budget 2026",
                    "last_modified_on": "2026-07-26T20:15:00+00:00",
                    "first_month": "2026-01-01",
                    "last_month": "2026-07-01",
                    "currency_format": {
                        "iso_code": "USD",
                        "example_format": "$123,456.78",
                        "decimal_digits": 2,
                        "decimal_separator": ".",
                        "symbol_first": True,
                        "group_separator": ",",
                        "currency_symbol": "$"
                    }
                },
                {
                    "id": "demo-side-hustle",
                    "name": "Side Hustle & Freelance",
                    "last_modified_on": "2026-07-20T14:30:00+00:00",
                    "first_month": "2026-03-01",
                    "last_month": "2026-07-01",
                    "currency_format": {
                        "iso_code": "USD",
                        "example_format": "$123,456.78",
                        "decimal_digits": 2,
                        "decimal_separator": ".",
                        "symbol_first": True,
                        "group_separator": ",",
                        "currency_symbol": "$"
                    }
                }
            ]
        
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{YNAB_BASE_URL}/budgets", headers=self.headers)
            res.raise_for_status()
            return res.json()["data"]["budgets"]

    async def get_budget_detail(self, budget_id: str) -> Dict[str, Any]:
        if self.use_demo or budget_id.startswith("demo-"):
            return self._get_mock_budget_detail()
        
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{YNAB_BASE_URL}/budgets/{budget_id}", headers=self.headers)
            res.raise_for_status()
            return res.json()["data"]["budget"]

    async def get_accounts(self, budget_id: str) -> List[Dict[str, Any]]:
        detail = await self.get_budget_detail(budget_id)
        return detail.get("accounts", [])

    async def get_categories(self, budget_id: str) -> List[Dict[str, Any]]:
        detail = await self.get_budget_detail(budget_id)
        return detail.get("category_groups", [])

    async def get_transactions(self, budget_id: str) -> List[Dict[str, Any]]:
        detail = await self.get_budget_detail(budget_id)
        return detail.get("transactions", [])

    async def create_transaction(self, budget_id: str, transaction: Dict[str, Any]) -> Dict[str, Any]:
        if self.use_demo or budget_id.startswith("demo-"):
            transaction["id"] = f"tx-demo-{int(datetime.datetime.now().timestamp())}"
            return transaction
        
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{YNAB_BASE_URL}/budgets/{budget_id}/transactions",
                headers=self.headers,
                json={"transaction": transaction}
            )
            res.raise_for_status()
            return res.json()["data"]["transaction"]

    def _get_mock_budget_detail(self) -> Dict[str, Any]:
        accounts = [
            {
                "id": "acc-checking",
                "name": "High-Yield Checking",
                "type": "checking",
                "on_budget": True,
                "closed": False,
                "balance": 4850000,
                "cleared_balance": 4600000,
                "uncleared_balance": 250000,
            },
            {
                "id": "acc-savings",
                "name": "Emergency Savings (4.8% APY)",
                "type": "savings",
                "on_budget": True,
                "closed": False,
                "balance": 18500000,
                "cleared_balance": 18500000,
                "uncleared_balance": 0,
            },
            {
                "id": "acc-rewards-card",
                "name": "Sapphire Reserve Credit Card",
                "type": "creditCard",
                "on_budget": True,
                "closed": False,
                "balance": -1245500,
                "cleared_balance": -1100000,
                "uncleared_balance": -145500,
            },
            {
                "id": "acc-investments",
                "name": "Vanguard Index Funds",
                "type": "otherAsset",
                "on_budget": False,
                "closed": False,
                "balance": 52400000,
                "cleared_balance": 52400000,
                "uncleared_balance": 0,
            }
        ]

        categories = [
            {
                "id": "cg-immediate",
                "name": "Immediate Obligations",
                "hidden": False,
                "categories": [
                    {
                        "id": "cat-rent",
                        "name": "Rent / Mortgage",
                        "budgeted": 2200000,
                        "activity": -2200000,
                        "balance": 0,
                        "goal_target": 2200000,
                        "goal_type": "NEED",
                        "goal_percentage_complete": 100
                    },
                    {
                        "id": "cat-groceries",
                        "name": "Groceries & Supplies",
                        "budgeted": 650000,
                        "activity": -420500,
                        "balance": 229500,
                        "goal_target": 650000,
                        "goal_type": "NEED",
                        "goal_percentage_complete": 64
                    },
                    {
                        "id": "cat-utilities",
                        "name": "Electric, Gas & Internet",
                        "budgeted": 280000,
                        "activity": -195000,
                        "balance": 85000,
                        "goal_target": 280000,
                        "goal_type": "NEED",
                        "goal_percentage_complete": 70
                    }
                ]
            },
            {
                "id": "cg-true-expenses",
                "name": "True Expenses & Targets",
                "hidden": False,
                "categories": [
                    {
                        "id": "cat-auto-maint",
                        "name": "Auto Maintenance & Insurance",
                        "budgeted": 300000,
                        "activity": -85000,
                        "balance": 850000,
                        "goal_target": 300000,
                        "goal_type": "TARGET_BALANCE",
                        "goal_percentage_complete": 100
                    },
                    {
                        "id": "cat-tech-subs",
                        "name": "Software & AI Subscriptions",
                        "budgeted": 120000,
                        "activity": -99000,
                        "balance": 21000,
                        "goal_target": 120000,
                        "goal_type": "NEED",
                        "goal_percentage_complete": 82
                    },
                    {
                        "id": "cat-medical",
                        "name": "Medical & Health Care",
                        "budgeted": 200000,
                        "activity": -45000,
                        "balance": 655000,
                        "goal_target": 200000,
                        "goal_type": "NEED",
                        "goal_percentage_complete": 100
                    }
                ]
            },
            {
                "id": "cg-quality-life",
                "name": "Quality of Life & Fun",
                "hidden": False,
                "categories": [
                    {
                        "id": "cat-dining",
                        "name": "Dining Out & Coffee",
                        "budgeted": 350000,
                        "activity": -290000,
                        "balance": 60000,
                        "goal_target": 350000,
                        "goal_type": "NEED",
                        "goal_percentage_complete": 83
                    },
                    {
                        "id": "cat-vacation",
                        "name": "Summer Vacation Fund",
                        "budgeted": 500000,
                        "activity": 0,
                        "balance": 2400000,
                        "goal_target": 3500000,
                        "goal_type": "TB",
                        "goal_percentage_complete": 68
                    }
                ]
            }
        ]

        transactions = [
            {
                "id": "tx-101",
                "date": "2026-07-25",
                "amount": -84200,
                "memo": "Weekly groceries",
                "cleared": "cleared",
                "approved": True,
                "flag_color": "green",
                "account_id": "acc-checking",
                "account_name": "High-Yield Checking",
                "payee_id": "pay-tj",
                "payee_name": "Trader Joe's",
                "category_id": "cat-groceries",
                "category_name": "Groceries & Supplies",
                "import_id": "YNAB:-84200:2026-07-25:1"
            },
            {
                "id": "tx-102",
                "date": "2026-07-24",
                "amount": -14500,
                "memo": "Morning latte & pastry",
                "cleared": "cleared",
                "approved": True,
                "flag_color": None,
                "account_id": "acc-rewards-card",
                "account_name": "Sapphire Reserve Credit Card",
                "payee_id": "pay-sbux",
                "payee_name": "Starbucks Coffee",
                "category_id": "cat-dining",
                "category_name": "Dining Out & Coffee",
                "import_id": None
            },
            {
                "id": "tx-103",
                "date": "2026-07-23",
                "amount": -20000,
                "memo": "AI Assistant Subscription",
                "cleared": "uncleared",
                "approved": True,
                "flag_color": "blue",
                "account_id": "acc-rewards-card",
                "account_name": "Sapphire Reserve Credit Card",
                "payee_id": "pay-openai",
                "payee_name": "OpenAI / Anthropic",
                "category_id": "cat-tech-subs",
                "category_name": "Software & AI Subscriptions",
                "import_id": None
            },
            {
                "id": "tx-104",
                "date": "2026-07-20",
                "amount": -2200000,
                "memo": "July Apartment Rent",
                "cleared": "cleared",
                "approved": True,
                "flag_color": None,
                "account_id": "acc-checking",
                "account_name": "High-Yield Checking",
                "payee_id": "pay-landlord",
                "payee_name": "Skyline Apartments Property Mgmt",
                "category_id": "cat-rent",
                "category_name": "Rent / Mortgage",
                "import_id": "RENT-JULY-2026"
            },
            {
                "id": "tx-105",
                "date": "2026-07-15",
                "amount": 4250000,
                "memo": "Bi-weekly Salary Direct Deposit",
                "cleared": "cleared",
                "approved": True,
                "flag_color": "purple",
                "account_id": "acc-checking",
                "account_name": "High-Yield Checking",
                "payee_id": "pay-employer",
                "payee_name": "Tech Corp Payroll",
                "category_id": None,
                "category_name": "Inflow: Ready to Assign",
                "import_id": "PAYROLL-20260715"
            },
            {
                "id": "tx-106",
                "date": "2026-07-14",
                "amount": -6500,
                "memo": "Gas station fill-up",
                "cleared": "uncleared",
                "approved": False,
                "flag_color": "orange",
                "account_id": "acc-rewards-card",
                "account_name": "Sapphire Reserve Credit Card",
                "payee_id": "pay-shell",
                "payee_name": "Shell Station #4829",
                "category_id": None,
                "category_name": None,
                "import_id": "BANK-IMPORT-991"
            }
        ]

        scheduled_transactions = [
            {
                "id": "sched-1",
                "date_first": "2026-08-01",
                "date_next": "2026-08-01",
                "frequency": "monthly",
                "amount": -2200000,
                "account_id": "acc-checking",
                "payee_name": "Skyline Apartments Property Mgmt",
                "category_name": "Rent / Mortgage"
            },
            {
                "id": "sched-2",
                "date_first": "2026-08-15",
                "date_next": "2026-08-15",
                "frequency": "biweekly",
                "amount": 4250000,
                "account_id": "acc-checking",
                "payee_name": "Tech Corp Payroll",
                "category_name": "Inflow: Ready to Assign"
            }
        ]

        return {
            "id": "demo-budget-2026",
            "name": "Main Personal Budget 2026",
            "last_modified_on": "2026-07-26T20:15:00+00:00",
            "first_month": "2026-01-01",
            "last_month": "2026-07-01",
            "to_be_budgeted": 1420000,
            "age_of_money": 42,
            "accounts": accounts,
            "category_groups": categories,
            "transactions": transactions,
            "scheduled_transactions": scheduled_transactions
        }
