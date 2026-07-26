import sqlite3
import json
import os
import datetime
from typing import Dict, Any, List, Optional

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)
DB_PATH = os.path.join(TEMP_DIR, "ynab_companion.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite database schema for single-player local persistence."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Sync state metadata
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_state (
                budget_id TEXT PRIMARY KEY,
                last_synced_at TEXT,
                server_knowledge INTEGER DEFAULT 0,
                status TEXT
            )
        """)

        # Budgets table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                last_modified_on TEXT,
                first_month TEXT,
                last_month TEXT,
                currency_format TEXT,
                raw_json TEXT
            )
        """)

        # Accounts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                on_budget BOOLEAN,
                closed BOOLEAN,
                balance INTEGER,
                cleared_balance INTEGER,
                uncleared_balance INTEGER,
                FOREIGN KEY (budget_id) REFERENCES budgets (id)
            )
        """)

        # Categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                group_id TEXT NOT NULL,
                group_name TEXT NOT NULL,
                name TEXT NOT NULL,
                budgeted INTEGER DEFAULT 0,
                activity INTEGER DEFAULT 0,
                balance INTEGER DEFAULT 0,
                goal_target INTEGER,
                goal_type TEXT,
                goal_percentage_complete INTEGER,
                FOREIGN KEY (budget_id) REFERENCES budgets (id)
            )
        """)

        # Transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                account_name TEXT,
                date TEXT NOT NULL,
                amount INTEGER NOT NULL,
                payee_id TEXT,
                payee_name TEXT,
                category_id TEXT,
                category_name TEXT,
                memo TEXT,
                cleared TEXT DEFAULT 'cleared',
                approved BOOLEAN DEFAULT 1,
                flag_color TEXT,
                import_id TEXT,
                synced_to_ynab BOOLEAN DEFAULT 1,
                FOREIGN KEY (budget_id) REFERENCES budgets (id)
            )
        """)

        # Scheduled transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_transactions (
                id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                payee_name TEXT,
                category_name TEXT,
                date_first TEXT,
                date_next TEXT,
                frequency TEXT,
                amount INTEGER,
                FOREIGN KEY (budget_id) REFERENCES budgets (id)
            )
        """)

        # Rules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                enabled BOOLEAN DEFAULT 1,
                conditions_json TEXT NOT NULL,
                actions_json TEXT NOT NULL
            )
        """)

        conn.commit()

# --- Database Helper Functions ---

def save_budget_snapshot(budget_data: Dict[str, Any]):
    """Upserts full budget detail into SQLite."""
    budget_id = budget_data["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Upsert Budget
        cursor.execute("""
            INSERT INTO budgets (id, name, last_modified_on, first_month, last_month, currency_format, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                last_modified_on=excluded.last_modified_on,
                first_month=excluded.first_month,
                last_month=excluded.last_month,
                currency_format=excluded.currency_format,
                raw_json=excluded.raw_json
        """, (
            budget_id,
            budget_data.get("name", "Local Budget"),
            budget_data.get("last_modified_on", datetime.datetime.now().isoformat()),
            budget_data.get("first_month", ""),
            budget_data.get("last_month", ""),
            json.dumps(budget_data.get("currency_format", {})),
            json.dumps(budget_data)
        ))

        # 2. Upsert Accounts
        for acc in budget_data.get("accounts", []):
            cursor.execute("""
                INSERT INTO accounts (id, budget_id, name, type, on_budget, closed, balance, cleared_balance, uncleared_balance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    type=excluded.type,
                    on_budget=excluded.on_budget,
                    closed=excluded.closed,
                    balance=excluded.balance,
                    cleared_balance=excluded.cleared_balance,
                    uncleared_balance=excluded.uncleared_balance
            """, (
                acc["id"],
                budget_id,
                acc.get("name", ""),
                acc.get("type", "checking"),
                acc.get("on_budget", True),
                acc.get("closed", False),
                acc.get("balance", 0),
                acc.get("cleared_balance", 0),
                acc.get("uncleared_balance", 0)
            ))

        # 3. Upsert Categories
        for group in budget_data.get("category_groups", []):
            group_id = group.get("id", "cg-default")
            group_name = group.get("name", "General Categories")
            for cat in group.get("categories", []):
                cursor.execute("""
                    INSERT INTO categories (id, budget_id, group_id, group_name, name, budgeted, activity, balance, goal_target, goal_type, goal_percentage_complete)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        group_id=excluded.group_id,
                        group_name=excluded.group_name,
                        name=excluded.name,
                        budgeted=excluded.budgeted,
                        activity=excluded.activity,
                        balance=excluded.balance,
                        goal_target=excluded.goal_target,
                        goal_type=excluded.goal_type,
                        goal_percentage_complete=excluded.goal_percentage_complete
                """, (
                    cat["id"],
                    budget_id,
                    group_id,
                    group_name,
                    cat.get("name", ""),
                    cat.get("budgeted", 0),
                    cat.get("activity", 0),
                    cat.get("balance", 0),
                    cat.get("goal_target"),
                    cat.get("goal_type"),
                    cat.get("goal_percentage_complete")
                ))

        # 4. Upsert Transactions
        for tx in budget_data.get("transactions", []):
            cursor.execute("""
                INSERT INTO transactions (id, budget_id, account_id, account_name, date, amount, payee_id, payee_name, category_id, category_name, memo, cleared, approved, flag_color, import_id, synced_to_ynab)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    account_name=excluded.account_name,
                    date=excluded.date,
                    amount=excluded.amount,
                    payee_name=excluded.payee_name,
                    category_id=excluded.category_id,
                    category_name=excluded.category_name,
                    memo=excluded.memo,
                    cleared=excluded.cleared,
                    approved=excluded.approved,
                    flag_color=excluded.flag_color
            """, (
                tx["id"],
                budget_id,
                tx.get("account_id", ""),
                tx.get("account_name", ""),
                tx.get("date", ""),
                tx.get("amount", 0),
                tx.get("payee_id"),
                tx.get("payee_name"),
                tx.get("category_id"),
                tx.get("category_name"),
                tx.get("memo"),
                tx.get("cleared", "cleared"),
                tx.get("approved", True),
                tx.get("flag_color"),
                tx.get("import_id"),
                1
            ))

        # 5. Update Sync State
        cursor.execute("""
            INSERT INTO sync_state (budget_id, last_synced_at, status)
            VALUES (?, ?, ?)
            ON CONFLICT(budget_id) DO UPDATE SET
                last_synced_at=excluded.last_synced_at,
                status=excluded.status
        """, (budget_id, datetime.datetime.now().isoformat(), "in_sync"))

        conn.commit()

def get_local_budgets() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("SELECT id, name, last_modified_on, first_month, last_month, currency_format FROM budgets").fetchall()
        result = []
        for r in rows:
            cf = json.loads(r["currency_format"]) if r["currency_format"] else {}
            result.append({
                "id": r["id"],
                "name": r["name"],
                "last_modified_on": r["last_modified_on"],
                "first_month": r["first_month"],
                "last_month": r["last_month"],
                "currency_format": cf
            })
        return result

def get_local_budget_detail(budget_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        b_row = cursor.execute("SELECT * FROM budgets WHERE id=?", (budget_id,)).fetchone()
        if not b_row:
            return None

        # Accounts
        acc_rows = cursor.execute("SELECT * FROM accounts WHERE budget_id=?", (budget_id,)).fetchall()
        accounts = [dict(r) for r in acc_rows]

        # Categories grouped
        cat_rows = cursor.execute("SELECT * FROM categories WHERE budget_id=?", (budget_id,)).fetchall()
        groups_dict: Dict[str, Dict[str, Any]] = {}
        for c in cat_rows:
            gid = c["group_id"]
            if gid not in groups_dict:
                groups_dict[gid] = {
                    "id": gid,
                    "name": c["group_name"],
                    "categories": []
                }
            groups_dict[gid]["categories"].append({
                "id": c["id"],
                "name": c["name"],
                "budgeted": c["budgeted"],
                "activity": c["activity"],
                "balance": c["balance"],
                "goal_target": c["goal_target"],
                "goal_type": c["goal_type"],
                "goal_percentage_complete": c["goal_percentage_complete"]
            })

        # Transactions
        tx_rows = cursor.execute("SELECT * FROM transactions WHERE budget_id=? ORDER BY date DESC", (budget_id,)).fetchall()
        transactions = [dict(r) for r in tx_rows]

        # Sync state
        sync_row = cursor.execute("SELECT last_synced_at, status FROM sync_state WHERE budget_id=?", (budget_id,)).fetchone()
        last_synced = sync_row["last_synced_at"] if sync_row else None

        # Calculate Ready to Assign (to_be_budgeted) from accounts balance minus category balances
        total_checking_savings = sum(a["balance"] for a in accounts if a["on_budget"] and a["type"] in ["checking", "savings"])
        total_category_balances = sum(c["balance"] for c in cat_rows)
        to_be_budgeted = max(0, total_checking_savings - total_category_balances)

        return {
            "id": b_row["id"],
            "name": b_row["name"],
            "last_modified_on": b_row["last_modified_on"],
            "first_month": b_row["first_month"],
            "last_month": b_row["last_month"],
            "to_be_budgeted": to_be_budgeted,
            "age_of_money": 45,
            "last_synced_at": last_synced,
            "accounts": accounts,
            "category_groups": list(groups_dict.values()),
            "transactions": transactions,
            "scheduled_transactions": []
        }

def insert_local_transaction(budget_id: str, tx: Dict[str, Any]):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (id, budget_id, account_id, account_name, date, amount, payee_name, category_id, memo, cleared, approved, synced_to_ynab)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cleared', 1, ?)
        """, (
            tx["id"],
            budget_id,
            tx["account_id"],
            tx.get("account_name", "Checking"),
            tx["date"],
            tx["amount"],
            tx["payee_name"],
            tx.get("category_id"),
            tx.get("memo", ""),
            tx.get("synced_to_ynab", 0)
        ))
        
        # Update account balance locally
        cursor.execute("UPDATE accounts SET balance = balance + ?, cleared_balance = cleared_balance + ? WHERE id=?", (tx["amount"], tx["amount"], tx["account_id"]))
        conn.commit()

# Initialize DB on module import
init_db()
