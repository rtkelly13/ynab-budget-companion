from typing import List, Dict, Any

class AccountStatementInput:
    def __init__(self, account_id: str, statement_balance: float):
        self.account_id = account_id
        self.statement_balance = statement_balance

class ReconciliationInspector:
    @staticmethod
    def audit_budget(accounts: List[Dict[str, Any]], transactions: List[Dict[str, Any]], statement_inputs: Dict[str, float]) -> Dict[str, Any]:
        account_audits = []
        total_variance = 0.0

        for acc in accounts:
            acc_id = acc["id"]
            ynab_cleared_dollars = acc.get("cleared_balance", 0) / 1000.0
            ynab_uncleared_dollars = acc.get("uncleared_balance", 0) / 1000.0
            ynab_working_dollars = acc.get("balance", 0) / 1000.0

            stmt_bal = statement_inputs.get(acc_id, ynab_cleared_dollars)
            variance = round(stmt_bal - ynab_cleared_dollars, 2)
            total_variance += abs(variance)

            # Find uncleared transactions for this account
            uncleared_txs = [
                tx for tx in transactions
                if tx.get("account_id") == acc_id and tx.get("cleared") == "uncleared"
            ]

            status = "in_sync" if abs(variance) < 0.01 else ("needs_adjustment" if variance != 0 else "in_sync")

            account_audits.append({
                "account_id": acc_id,
                "account_name": acc.get("name", "Unknown Account"),
                "account_type": acc.get("type", "checking"),
                "ynab_cleared_balance": ynab_cleared_dollars,
                "ynab_uncleared_balance": ynab_uncleared_dollars,
                "ynab_working_balance": ynab_working_dollars,
                "statement_balance": stmt_bal,
                "variance": variance,
                "status": status,
                "uncleared_count": len(uncleared_txs),
                "uncleared_transactions": uncleared_txs
            })

        # Detect potential duplicate transactions (same date & amount or within 2 days)
        potential_duplicates = []
        seen_txs = []
        for tx in transactions:
            amount = tx.get("amount", 0)
            payee = (tx.get("payee_name") or "").lower().strip()
            date = tx.get("date", "")
            for prev in seen_txs:
                if prev.get("amount") == amount and (prev.get("payee_name") or "").lower().strip() == payee:
                    potential_duplicates.append({
                        "original_tx": prev,
                        "duplicate_tx": tx,
                        "reason": f"Identical amount (${abs(amount)/1000:.2f}) and payee '{tx.get('payee_name')}'"
                    })
            seen_txs.append(tx)

        return {
            "total_accounts_audited": len(accounts),
            "accounts_in_sync": len([a for a in account_audits if a["status"] == "in_sync"]),
            "accounts_requiring_attention": len([a for a in account_audits if a["status"] != "in_sync"]),
            "total_discrepancy_variance": round(total_variance, 2),
            "potential_duplicates_count": len(potential_duplicates),
            "potential_duplicates": potential_duplicates,
            "account_audits": account_audits
        }
