from typing import List, Dict, Any
import datetime

class BudgetForecaster:
    @staticmethod
    def calculate_forecast(budget_detail: Dict[str, Any], days: int = 90) -> Dict[str, Any]:
        accounts = budget_detail.get("accounts", [])
        transactions = budget_detail.get("transactions", [])
        scheduled = budget_detail.get("scheduled_transactions", [])
        
        # Calculate current liquid cash (checking + savings balances)
        current_liquid = sum(
            acc.get("balance", 0) / 1000.0 
            for acc in accounts 
            if acc.get("on_budget") and acc.get("type") in ["checking", "savings"]
        )

        current_credit_debt = sum(
            abs(acc.get("balance", 0) / 1000.0) 
            for acc in accounts 
            if acc.get("on_budget") and acc.get("type") == "creditCard" and acc.get("balance", 0) < 0
        )

        net_liquid = current_liquid - current_credit_debt

        # Calculate average daily outflow from past 30 days transactions
        total_outflow = sum(
            abs(tx.get("amount", 0) / 1000.0)
            for tx in transactions
            if tx.get("amount", 0) < 0
        )
        # Assuming ~30 days sample
        daily_burn_rate = round(total_outflow / 30.0, 2) if total_outflow > 0 else 45.0

        # Calculate days of buffer (net liquid / daily burn)
        days_of_buffer = round(net_liquid / daily_burn_rate, 1) if daily_burn_rate > 0 else 999.0

        # Build trajectory timeline (Day 0 to Day 90)
        trajectory = []
        simulated_balance = net_liquid

        today = datetime.date.today()
        monthly_scheduled_inflow = 0.0
        monthly_scheduled_outflow = 0.0

        for s in scheduled:
            amt = s.get("amount", 0) / 1000.0
            if amt > 0:
                monthly_scheduled_inflow += amt
            else:
                monthly_scheduled_outflow += abs(amt)

        for day_idx in range(0, days + 1, 5): # 5-day increments
            projected_date = (today + datetime.timedelta(days=day_idx)).isoformat()
            
            # Simple modeling: simulated_balance += (monthly_inflow - monthly_outflow - daily_burn * 30) / 30 * 5
            estimated_period_net = ((monthly_scheduled_inflow - monthly_scheduled_outflow) / 30.0 * 5)
            if day_idx > 0:
                simulated_balance += estimated_period_net
            
            trajectory.append({
                "day": day_idx,
                "date": projected_date,
                "projected_net_liquid": round(simulated_balance, 2),
                "status": "healthy" if simulated_balance > 5000.0 else ("warning" if simulated_balance > 1000.0 else "critical")
            })

        # Calculate Health Score (0 - 100)
        age_of_money = budget_detail.get("age_of_money", 30)
        health_score = min(100, max(0, int(
            (min(age_of_money, 60) / 60.0 * 35) + # up to 35 points from age of money
            (min(days_of_buffer, 90) / 90.0 * 45) + # up to 45 points from buffer days
            (20 if current_credit_debt == 0 else 10) # debt bonus
        )))

        return {
            "current_liquid_assets": round(current_liquid, 2),
            "current_credit_debt": round(current_credit_debt, 2),
            "net_liquid_balance": round(net_liquid, 2),
            "estimated_daily_burn": daily_burn_rate,
            "days_of_buffer": days_of_buffer,
            "age_of_money": age_of_money,
            "health_score": health_score,
            "forecast_days": days,
            "trajectory": trajectory
        }
