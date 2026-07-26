from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class RuleCondition(BaseModel):
    field: str # 'payee_name', 'memo', 'amount', 'account_name'
    operator: str # 'contains', 'equals', 'greater_than', 'less_than', 'is_empty'
    value: str

class RuleAction(BaseModel):
    action_type: str # 'set_category', 'set_flag_color', 'set_memo_tag'
    target_value: str # category_id, flag color ('red', 'orange', 'yellow', 'green', 'blue', 'purple'), or memo tag

class CustomRule(BaseModel):
    id: str
    name: str
    enabled: bool = True
    conditions: List[RuleCondition]
    actions: List[RuleAction]

DEFAULT_RULES = [
    CustomRule(
        id="rule-1",
        name="Auto-Categorize Coffee & Cafes",
        enabled=True,
        conditions=[RuleCondition(field="payee_name", operator="contains", value="Starbucks")],
        actions=[
            RuleAction(action_type="set_category", target_value="cat-dining"),
            RuleAction(action_type="set_flag_color", target_value="blue")
        ]
    ),
    CustomRule(
        id="rule-2",
        name="Flag Unapproved Gas Station Purchases",
        enabled=True,
        conditions=[RuleCondition(field="payee_name", operator="contains", value="Shell")],
        actions=[
            RuleAction(action_type="set_category", target_value="cat-auto-maint"),
            RuleAction(action_type="set_flag_color", target_value="orange")
        ]
    ),
    CustomRule(
        id="rule-3",
        name="Tag Groceries with Green Flag",
        enabled=True,
        conditions=[RuleCondition(field="payee_name", operator="contains", value="Trader Joe's")],
        actions=[
            RuleAction(action_type="set_category", target_value="cat-groceries"),
            RuleAction(action_type="set_flag_color", target_value="green")
        ]
    ),
    CustomRule(
        id="rule-4",
        name="Tag AI & Dev Subscriptions",
        enabled=True,
        conditions=[RuleCondition(field="payee_name", operator="contains", value="OpenAI")],
        actions=[
            RuleAction(action_type="set_category", target_value="cat-tech-subs"),
            RuleAction(action_type="set_flag_color", target_value="purple")
        ]
    )
]

class RuleEngine:
    def __init__(self, rules: Optional[List[CustomRule]] = None):
        self.rules = rules if rules is not None else DEFAULT_RULES

    def evaluate_transaction(self, tx: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates a single transaction against active rules and returns proposed modifications."""
        modified_tx = dict(tx)
        applied_rules = []

        for rule in self.rules:
            if not rule.enabled:
                continue

            matches_all = True
            for cond in rule.conditions:
                field_val = str(tx.get(cond.field, "") or "")
                if cond.field == "amount":
                    try:
                        num_val = float(field_val) / 1000.0 # milliunits to standard currency
                        target_num = float(cond.value)
                        if cond.operator == "greater_than" and not (num_val > target_num):
                            matches_all = False
                        elif cond.operator == "less_than" and not (num_val < target_num):
                            matches_all = False
                    except ValueError:
                        matches_all = False
                else:
                    if cond.operator == "contains" and cond.value.lower() not in field_val.lower():
                        matches_all = False
                    elif cond.operator == "equals" and cond.value.lower() != field_val.lower():
                        matches_all = False
                    elif cond.operator == "is_empty" and field_val.strip() != "":
                        matches_all = False

            if matches_all:
                applied_rules.append(rule.name)
                for act in rule.actions:
                    if act.action_type == "set_category":
                        modified_tx["category_id"] = act.target_value
                        modified_tx["proposed_category_id"] = act.target_value
                    elif act.action_type == "set_flag_color":
                        modified_tx["flag_color"] = act.target_value
                        modified_tx["proposed_flag_color"] = act.target_value
                    elif act.action_type == "set_memo_tag":
                        current_memo = modified_tx.get("memo", "") or ""
                        if act.target_value not in current_memo:
                            modified_tx["memo"] = f"{current_memo} {act.target_value}".strip()

        modified_tx["applied_rules"] = applied_rules
        return modified_tx

    def run_all(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Runs rules across all transactions and returns statistics and modified list."""
        results = []
        rule_hits = 0
        uncategorized_count = 0

        for tx in transactions:
            eval_tx = self.evaluate_transaction(tx)
            if eval_tx["applied_rules"]:
                rule_hits += 1
            if not eval_tx.get("category_id") and not eval_tx.get("proposed_category_id"):
                uncategorized_count += 1
            results.append(eval_tx)

        return {
            "total_transactions": len(transactions),
            "rule_matches": rule_hits,
            "uncategorized_count": uncategorized_count,
            "processed_transactions": results
        }
