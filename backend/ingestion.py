import csv
import io
import hashlib
import datetime
from typing import List, Dict, Any, Optional

class CSVBankImporter:
    @staticmethod
    def parse_csv_content(csv_text: str, account_id: str, default_payee: Optional[str] = None) -> List[Dict[str, Any]]:
        """Parses CSV financial export text and normalizes into standardized database transaction payloads."""
        reader = csv.DictReader(io.StringIO(csv_text))
        parsed_txs = []

        for row in reader:
            # Flexible column header matching (Date, Transaction Date, Posting Date)
            date_str = row.get("Date") or row.get("Transaction Date") or row.get("Posting Date") or datetime.date.today().isoformat()
            
            # Format date to YYYY-MM-DD
            try:
                dt = datetime.datetime.strptime(date_str.strip(), "%m/%d/%Y").date()
                date_formatted = dt.isoformat()
            except ValueError:
                date_formatted = date_str.strip()

            # Flexible Payee matching (Payee, Description, Name, Merchant)
            payee = row.get("Payee") or row.get("Description") or row.get("Name") or row.get("Merchant") or default_payee or "Unknown Merchant"
            payee = payee.strip()

            # Flexible Amount matching (Amount, Debit, Credit)
            amt_raw = row.get("Amount") or "0"
            if "Debit" in row and row["Debit"]:
                amt_float = -abs(float(row["Debit"].replace("$", "").replace(",", "")))
            elif "Credit" in row and row["Credit"]:
                amt_float = abs(float(row["Credit"].replace("$", "").replace(",", "")))
            else:
                amt_float = float(amt_raw.replace("$", "").replace(",", ""))

            milliunits = int(round(amt_float * 1000))
            memo = row.get("Memo") or row.get("Category") or ""

            # Hash for deduplication
            hash_input = f"{account_id}:{date_formatted}:{milliunits}:{payee}"
            tx_id = f"tx-csv-{hashlib.sha256(hash_input.encode()).hexdigest()[:12]}"

            parsed_txs.append({
                "id": tx_id,
                "account_id": account_id,
                "date": date_formatted,
                "amount": milliunits,
                "payee_name": payee,
                "memo": memo,
                "cleared": "cleared",
                "approved": False,
                "import_id": tx_id
            })

        return parsed_txs
