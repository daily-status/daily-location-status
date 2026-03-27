# Daily Status & Location Manager (FastAPI + React)

Web application for managing people, locations, and daily status with full daily Excel snapshots (`.xlsx`) and optional Telegram self-report integration.

UI language is Hebrew by design.  
Code comments and project documentation are in English.

## Core Behavior

- All runtime configuration is in `config/app_config.yaml`.
- Secrets (for example Telegram token) should be kept in `.env` and not committed.
- Every date is stored as a full snapshot Excel file.
- People are maintained in a master list so they do not need to be re-entered daily.
- If a date file does not exist, the system can auto-create it from master list.
- Daily status default is `לא הוזן`.

## Security & Reliability

- Secret loading from `.env` is supported.
- Global exception handling avoids leaking internal details.
- Input validation is enforced across API and Telegram flow.
- Local Excel writes are atomic (`temp` + replace).
- Process-level file locks protect write flows on single-host multi-process scenarios.

## Project Structure

Backend:

- `backend/app/main.py` - FastAPI app startup, middleware, health/status.
- `backend/app/config.py` - YAML + `.env` settings loading and validation.
- `backend/app/api/dependencies.py` - shared dependencies and helpers.
- `backend/app/api/routers/*.py` - API endpoints by domain.
- `backend/app/services/snapshot_service.py` - business logic for snapshots/master/locations.
- `backend/app/services/telegram_bot_service.py` - Telegram long-polling service.
- `backend/app/storage/providers.py` - local/S3/mirrored storage backends.
- `backend/app/utils/file_lock.py` - cross-process lock utility.

Frontend:

- `frontend/src/App.jsx` - main page/state logic.
- `frontend/src/api/client.ts` - API client methods.
- `frontend/src/components/*.jsx` - table and modal components.
- `frontend/src/constants/*.js` - shared UI constants.
- `frontend/src/styles.css` - styling.

Config & docs:

- `config/app_config.yaml` - primary configuration.
- `config/config_readme.txt` - full field reference.
- `RUN_INSTRUCTIONS.md` - quick local run guide.
- `production.md` - Windows production + nginx guide.

## Requirements

- Python 3.9+
- Node.js 18+
- npm
- PowerShell (`powershell.exe` / `powershell` / `pwsh` must be in `PATH`)

## Local Development

### 1) Configure

Edit:

- `config/app_config.yaml`
- `.env` (optional for secrets)

Typical local values:

- `storage.mode: "local"`
- `storage.local_storage_dir: "./backend/local_storage"`
- `storage.seed_people_file: "./backend/data/sample_people.xlsx"`
- `frontend.api_base_url: ""`
- `frontend.dev_proxy_target: "http://localhost:8000"`
- `frontend.dev_server_port: 5173`

Optional `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
```

### 2) Run Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health:

- `http://localhost:8000/api/health`

### 3) Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:5173`

## One-Command Runner (`start_app.sh`)

You can run the app from project root with one command:

```bash
./start_app.sh --dev
```

Supported arguments:

- `--dev` - local backend + frontend dev stack (default).
- `--prod` - on Windows, delegates to `scripts/windows/start_production.ps1`; on non-Windows, runs backend+frontend locally in prod-like mode (`uvicorn` without `--reload` + `npm run preview`).
- `--stop-prod` - on Windows, delegates to `scripts/windows/stop_production.ps1`.
- `--skip-install` - skip dependency installation.
- `--skip-prereq-check` - skip startup prerequisite checks (Python/Node/npm/PowerShell).
- `--skip-build` - skip frontend build (Windows production flow).
- `--backend-port <num>` - backend port (default `8000`).
- `--frontend-port <num>` - frontend port for local mode (default `5173`).
- `--nginx-port <num>` - nginx port for Windows production flow (default `80`).
- `--nginx-dir <path>` - custom nginx folder path for Windows production flow.
- `--help` - print usage.

Startup prerequisite checks (performed before run):

- Python `3.9+`
- Node.js `18+`
- `npm`
- PowerShell (`powershell.exe` / `powershell` / `pwsh`)

If prerequisites are missing on Windows and `winget` is available, the script prompts to install them automatically.  
In non-interactive shells, automatic install cannot be confirmed, so the script exits with manual install hints.

Windows production examples:

```bash
./start_app.sh --prod
./start_app.sh --prod --skip-install --skip-build
./start_app.sh --prod --nginx-dir "D:\tools\nginx-1.28.2" --nginx-port 8080
./start_app.sh --stop-prod --nginx-dir "D:\tools\nginx-1.28.2"
```

Non-Windows production-like example:

```bash
./start_app.sh --prod --backend-port 8000 --frontend-port 5173
```

## Production on Windows (with nginx)

See:

- `production.md`

Main command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\start_production.ps1
```

## Storage Output (Excel Files)

In local mode:

- `backend/local_storage/master/people_master.xlsx`
- `backend/local_storage/master/locations.xlsx`
- `backend/local_storage/snapshots/YYYY-MM-DD.xlsx`

Each daily snapshot workbook contains sheets:
- `snapshot` (current day state)
- `location_events` (raw movement event log for that date)

In S3 or dual mode:

- Same logical keys are used under configured S3 prefix/bucket.

## Supported Status Values

Daily status (`daily_status`):

- `תקין`
- `לא תקין`
- `לא הוזן`

Self-report status (`self_daily_status`):

- `תקין`
- `לא תקין`

## Main API Endpoints

- `GET /api/health`
- `GET /api/system/status`
- `GET /api/snapshot/today`
- `GET /api/snapshot/{YYYY-MM-DD}`
- `POST /api/snapshot/{YYYY-MM-DD}/save`
- `GET /api/history/dates`
- `POST /api/history/{YYYY-MM-DD}/restore-to-today`
- `GET /api/locations`
- `POST /api/locations`
- `DELETE /api/locations/{location_name}`
- `POST /api/people`
- `POST /api/people/initialize-list`
- `PATCH /api/people/{person_id}`
- `PUT /api/people/{person_id}`
- `DELETE /api/people/{person_id}`
- `GET /api/people/{person_id}/location-events?snapshot_date=YYYY-MM-DD`
- `POST /api/people/{person_id}/location-events`
- `DELETE /api/people/{person_id}/location-events/{event_id}`
- `POST /api/self-report`
- `GET /api/export/day/{YYYY-MM-DD}`
- `GET /api/export/range?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

Export workbook format:

- Sheet `snapshot`: current daily state + tracking summary columns (`locations_visited`, `location_events_count`, `location_timeline`).
- Sheet `location_events`: raw per-person movement events for that day.

## Tests & Build

Backend tests:

```powershell
cd backend
pytest -q
```

Backend bytecode compile check:

```powershell
cd backend
python -m compileall app
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Frontend E2E tests (Playwright):

```powershell
cd frontend
npm run test:e2e:install
npm run test:e2e
```

Backend smoke test (starts backend temporarily and checks critical endpoints):

```powershell
python scripts/smoke_backend.py
```

## CI

GitHub Actions workflow is included:

- `.github/workflows/ci.yml`

It runs on every `push` and `pull_request` and includes:

1. `pytest -q` (backend tests)
2. `pyflakes` (backend static checks)
3. `vulture --min-confidence 80` (dead-code scan)
4. `npm run build` (frontend build)
5. `npm run test:e2e` (frontend Playwright flows)
6. `python scripts/smoke_backend.py` (temporary backend smoke test)

## Common Issues

### `Seed people file was not found`

Check `storage.seed_people_file` in `config/app_config.yaml`.

### Frontend cannot reach backend

Check:

- `frontend.api_base_url: ""`
- `frontend.dev_proxy_target: "http://localhost:8000"`

### Config change does not apply

Restart backend (and frontend in dev mode) after changing `config/app_config.yaml`.

## Migration/Scale Note

Current MVP is Excel-first and works well for small/medium usage.  
For high concurrency/load, move operational writes to SQLite/Postgres and keep Excel as daily export snapshots.

See:

- `DB_SCALE_PLAN.md`
