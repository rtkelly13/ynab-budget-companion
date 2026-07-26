# AGENTS.md

Single-player local YNAB companion application with Python FastAPI backend and Vite React frontend (`ynab-budget-companion`).

Package Managers:
- **Backend (Python)**: `uv` (`node >=22`, `python >=3.12`).
- **Frontend (Node/TS)**: `pnpm` (`node >=22`).

---

## 🛑 Repository Conventions & Workflow Policy

1. **Squash Merge Only**: All pull requests must be merged into `main` using **Squash and Merge** exclusively.
2. **Delete Branch on Merge**: Feature branches must be automatically deleted immediately upon merge into `main`.
3. **Linear History**: Maintain a strictly linear history. Rebase feature branches onto `main` before merging; no merge commits allowed.
4. **Required Checks**:
   - `pnpm build` in `frontend/`
   - `uv run pytest` in `backend/`

---

## 📜 Commands

- **Backend**:
  - `uv sync`: Sync dependencies
  - `uv run uvicorn main:app --port 8000`: Start FastAPI backend server
- **Frontend**:
  - `pnpm install`: Install dependencies
  - `pnpm dev`: Start Vite dev server on port `5173`
  - `pnpm build`: Build production bundle


## 🛑 Repository Conventions & Workflow Policy

1. **Squash Merge Only**: All pull requests must be merged into `main` using **Squash and Merge** exclusively.
2. **Delete Branch on Merge**: Feature branches must be automatically deleted immediately upon merge into `main`.
3. **Linear History**: Maintain a strictly linear history. Rebase feature branches onto `main` before merging; no merge commits allowed.
4. **Direct Push Protection**: Non-force direct pushes to `main` are blocked; PR mechanism required (force pushes permitted when needed).
5. **Local Temp & Worktree Directory**: All temporary files, local databases, scratch files, and git worktrees MUST go inside the root `/temp/` directory (gitignored).
6. **Gitignored Local TODO File**: A root `TODO.md` file MUST exist for local task tracking and be gitignored.
