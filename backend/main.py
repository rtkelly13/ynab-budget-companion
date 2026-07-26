from fastapi import FastAPI, HTTPException, Header, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import os
import datetime
from dotenv import load_dotenv

import database
from sync_engine import YNABSyncEngine
from backup_service import GoogleDriveBackupService
from ingestion import CSVBankImporter
from rule_engine import RuleEngine, CustomRule, DEFAULT_RULES
from reconciliation import ReconciliationInspector
from forecaster import BudgetForecaster

load_dotenv()

app = FastAPI(
    title="YNAB Companion API - Local-First & Google Drive Backup",
    version="3.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global rule engine state
active_rules: List[CustomRule] = list(DEFAULT_RULES)
backup_service = GoogleDriveBackupService()

def get_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        return token if token else None
    return None

@app.on_event("startup")
async def startup_event():
    """Ensure SQLite database is seeded and backup directory is initialized."""
    database.init_db()
    local_budgets = database.get_local_budgets()
    if not local_budgets:
        sync_engine = YNABSyncEngine(api_token=None)
        sync_engine._seed_initial_local_db()

@app.get("/api/status")
async def check_status(authorization: Optional[str] = Header(None)):
    token = get_token(authorization)
    local_budgets = database.get_local_budgets()
    db_size = os.path.getsize(database.DB_PATH) if os.path.exists(database.DB_PATH) else 0
    backups = backup_service.list_backups()

    return {
        "status": "ok",
        "storage": "sqlite",
        "db_file": database.DB_PATH,
        "db_size_bytes": db_size,
        "local_budgets_count": len(local_budgets),
        "api_connected": bool(token),
        "gdrive_backup_dir": backup_service.backup_dir,
        "backups_count": len(backups),
        "latest_backup": backups[0] if backups else None
    }

# --- Google Drive Backup Endpoints ---

@app.post("/api/backup/now")
async def create_backup():
    """Creates a timestamped atomic backup in Google Drive."""
    res = backup_service.create_backup()
    return res

@app.get("/api/backups")
async def list_backups():
    """Lists all SQLite backups present in Google Drive."""
    backups = backup_service.list_backups()
    return {"backups": backups, "backup_dir": backup_service.backup_dir}

@app.post("/api/backup/restore/{filename}")
async def restore_backup(filename: str):
    """Restores local database from a specific Google Drive backup file."""
    res = backup_service.restore_backup(filename)
    return res

# --- YNAB Live Sync & Bank Ingestion ---

@app.post("/api/sync")
async def sync_ynab(authorization: Optional[str] = Header(None)):
    """Triggers a live sync with YNAB API and creates an automatic Google Drive backup afterwards."""
    token = get_token(authorization)
    sync_engine = YNABSyncEngine(api_token=token)
    result = await sync_engine.sync_all()
    
    # Auto-backup after successful sync
    if result.get("status") == "success":
        backup_service.create_backup()

    return result

@app.post("/api/ingest/csv")
async def ingest_csv(
    budget_id: str = Form(...),
    account_id: str = Form(...),
    file: UploadFile = File(...)
):
    """Parses bank CSV file and ingests transactions into local SQLite database."""
    content = (await file.read()).decode("utf-8")
    parsed_txs = CSVBankImporter.parse_csv_content(content, account_id)
    
    ingested_count = 0
    for tx in parsed_txs:
        database.insert_local_transaction(budget_id, tx)
        ingested_count += 1

    # Auto-backup after CSV import
    backup_service.create_backup()

    return {
        "status": "success",
        "ingested_count": ingested_count,
        "transactions": parsed_txs
    }

# --- Budget & Analytics Endpoints ---

@app.get("/api/budgets")
async def list_budgets():
    budgets = database.get_local_budgets()
    return {"budgets": budgets, "storage": "sqlite"}

@app.get("/api/budget/{budget_id}")
async def get_budget_detail(budget_id: str):
    detail = database.get_local_budget_detail(budget_id)
    if not detail:
        all_budgets = database.get_local_budgets()
        if all_budgets:
            detail = database.get_local_budget_detail(all_budgets[0]["id"])
    
    if not detail:
        raise HTTPException(status_code=404, detail="Budget not found in local SQLite database.")

    return {"budget": detail, "storage": "sqlite"}

@app.get("/api/transactions/{budget_id}")
async def get_transactions(budget_id: str):
    detail = database.get_local_budget_detail(budget_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"transactions": detail.get("transactions", [])}

@app.get("/api/rules")
async def get_rules():
    return {"rules": active_rules}

@app.post("/api/rules")
async def update_rules(rules: List[CustomRule]):
    global active_rules
    active_rules = rules
    return {"status": "success", "rules": active_rules}

@app.post("/api/rules/apply/{budget_id}")
async def apply_rules(budget_id: str):
    detail = database.get_local_budget_detail(budget_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Budget not found")
    txs = detail.get("transactions", [])
    engine = RuleEngine(rules=active_rules)
    result = engine.run_all(txs)
    return result

class ReconcileRequest(BaseModel):
    statement_balances: Dict[str, float]

@app.post("/api/reconcile/{budget_id}")
async def reconcile_budget(budget_id: str, payload: ReconcileRequest):
    detail = database.get_local_budget_detail(budget_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Budget not found")
    accounts = detail.get("accounts", [])
    txs = detail.get("transactions", [])
    
    audit = ReconciliationInspector.audit_budget(accounts, txs, payload.statement_balances)
    return audit

@app.get("/api/forecast/{budget_id}")
async def get_forecast(budget_id: str, days: int = Query(90)):
    detail = database.get_local_budget_detail(budget_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Budget not found")
    forecast = BudgetForecaster.calculate_forecast(detail, days=days)
    return forecast

class CreateTransactionRequest(BaseModel):
    account_id: str
    date: str
    amount: float
    payee_name: str
    category_id: Optional[str] = None
    memo: Optional[str] = None

@app.post("/api/transactions/{budget_id}")
async def create_transaction(budget_id: str, req: CreateTransactionRequest):
    milliunits = int(round(req.amount * 1000))
    tx_payload = {
        "id": f"tx-local-{int(datetime.datetime.now().timestamp())}",
        "account_id": req.account_id,
        "date": req.date,
        "amount": milliunits,
        "payee_name": req.payee_name,
        "category_id": req.category_id,
        "memo": req.memo,
        "synced_to_ynab": 0
    }
    database.insert_local_transaction(budget_id, tx_payload)
    
    # Auto-backup
    backup_service.create_backup()

    return {"status": "created", "transaction": tx_payload, "storage": "sqlite"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
