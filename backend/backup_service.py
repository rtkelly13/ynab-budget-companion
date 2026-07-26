import os
import shutil
import sqlite3
import datetime
from typing import List, Dict, Any, Optional

GDRIVE_BASE_DIR = os.path.expanduser("~/Google Drive/My Drive")
DEFAULT_BACKUP_DIR = os.path.join(GDRIVE_BASE_DIR, "Backup", "YNAB_Companion")
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "ynab_companion.db")

class GoogleDriveBackupService:
    def __init__(self, backup_dir: str = DEFAULT_BACKUP_DIR):
        self.backup_dir = backup_dir
        self._ensure_backup_dir()

    def _ensure_backup_dir(self):
        """Ensures Google Drive backup directory exists."""
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
        except Exception as e:
            print(f"Warning: Could not create Google Drive backup dir at {self.backup_dir}: {e}")

    def create_backup(self) -> Dict[str, Any]:
        """Creates an atomic timestamped SQLite backup in Google Drive."""
        self._ensure_backup_dir()
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ynab_companion_backup_{timestamp}.db"
        destination_path = os.path.join(self.backup_dir, filename)

        try:
            if not os.path.exists(LOCAL_DB_PATH):
                return {"status": "error", "error": "Local SQLite database file not found."}

            # Safe atomic backup using SQLite backup API
            with sqlite3.connect(LOCAL_DB_PATH) as src_conn:
                with sqlite3.connect(destination_path) as dst_conn:
                    src_conn.backup(dst_conn)

            file_size = os.path.getsize(destination_path)

            # Also maintain a 'latest_ynab_companion.db' symlink or copy for easy sync
            latest_copy_path = os.path.join(self.backup_dir, "latest_ynab_companion.db")
            shutil.copy2(destination_path, latest_copy_path)

            return {
                "status": "success",
                "filename": filename,
                "path": destination_path,
                "size_bytes": file_size,
                "timestamp": datetime.datetime.now().isoformat(),
                "destination_dir": self.backup_dir
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def list_backups(self) -> List[Dict[str, Any]]:
        """Lists all existing backups stored in Google Drive."""
        self._ensure_backup_dir()
        if not os.path.exists(self.backup_dir):
            return []

        backups = []
        for file in sorted(os.listdir(self.backup_dir), reverse=True):
            if file.endswith(".db") and file != "latest_ynab_companion.db":
                filepath = os.path.join(self.backup_dir, file)
                stat = os.stat(filepath)
                backups.append({
                    "filename": file,
                    "filepath": filepath,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        return backups

    def restore_backup(self, filename: str) -> Dict[str, Any]:
        """Restores local database from a specific Google Drive backup file."""
        target_backup_path = os.path.join(self.backup_dir, filename)
        if not os.path.exists(target_backup_path):
            return {"status": "error", "error": f"Backup file {filename} not found."}

        try:
            # Create safety snapshot of current DB before restore
            safety_backup = f"{LOCAL_DB_PATH}.safety_pre_restore"
            shutil.copy2(LOCAL_DB_PATH, safety_backup)

            # Restore from target
            with sqlite3.connect(target_backup_path) as src_conn:
                with sqlite3.connect(LOCAL_DB_PATH) as dst_conn:
                    src_conn.backup(dst_conn)

            return {
                "status": "restored",
                "restored_from": filename,
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
