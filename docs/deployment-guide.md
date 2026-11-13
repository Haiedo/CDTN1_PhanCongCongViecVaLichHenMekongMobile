# Deployment Guide – Smart CRM Mekong Mobile · L4 (Technician Assignment and Appointments)

Version **1.0.0** (git tag `v1.0`) · Track SE · Stack: Node.js 22 + Express 4, PostgreSQL 16, plain HTML/ES-module web UI.
Goal: a person who has never seen this project can start the system from an **empty folder with two commands** and confirm that it works, without asking the author anything.

Repository: https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile

## 1. Requirements

| Item | Needed | How to check |
|---|---|---|
| Docker Engine or Docker Desktop with **Compose v2** | yes (Docker 24 or newer) | `docker --version` and `docker compose version` (use `docker compose`, with a space, not `docker-compose`) |
| Git | yes | `git --version` |
| Free TCP port | one port, default **3000** | if busy, set `APP_PORT` in `.env` (section 3) |
| Internet on the first build | yes | the build downloads the `node:22-alpine` and `postgres:16-alpine` images and the npm packages |
| Disk and memory | about 1 GB disk, 1 GB RAM free | – |
| Node.js, npm, PostgreSQL on the host | **not needed** | they run inside the containers |
| Browser | Chrome, Edge or Firefox | to open the web UI |

Supported host systems: Windows 10/11 with Docker Desktop (PowerShell or Git Bash), macOS, Linux. The database is **not** published on any host port; only the application container can reach it.

If you cannot use Docker, the repository README (section 2) describes the same system run directly with a local Node.js and PostgreSQL; this guide covers the Docker route only.

## 2. Setup steps

Run every step in a **new, empty folder**. The repository is public, so no account or key is needed.

| Step | Command | What you should see |
|---|---|---|
| 1 | `git clone --branch v1.0 https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile.git .` | files such as `Dockerfile`, `docker-compose.yml`, `.env.example`, `src/`, `db/` appear in the folder (clone the **tag** `v1.0`, not `main`) |
| 2 | `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) | a file named `.env` exists |
| 3 | `docker compose up -d --build` | the two images are built, then both containers start without an error message |
| 4 | `docker compose ps` | two services, `db` and `app`; the STATUS column shows `(healthy)` for both (the app can take 20–40 seconds after step 3 to turn healthy; repeat the command) |
| 5 | open http://localhost:3000/ in a browser | the login page of the web UI |

That is the whole installation: **`cp .env.example .env` and `docker compose up -d --build`**. The first start creates the database, applies the schema and loads the sample data automatically (section 4).

Everyday commands:

| Task | Command |
|---|---|
| Stop, keep the data | `docker compose down` |
| Start again | `docker compose up -d` |
| Stop and **erase all data** (fresh database next start) | `docker compose down -v` |
| Read the application log | `docker compose logs app` |
| Read the database log | `docker compose logs db` |

## 3. Environment variables

All settings live in the file `.env` (copied from `.env.example`). The file `.env` is listed in `.gitignore` and `.dockerignore`: it is never committed and never copied into the image. The values in `.env.example` are placeholders for a local demo, not real secrets.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `POSTGRES_PASSWORD` | yes (Docker) | `change_me_demo_only` in `.env.example` | password of the PostgreSQL user `postgres` inside the container. Use letters and digits only. It is read **only when the database volume is first created**; to change it later run `docker compose down -v` first |
| `APP_PORT` | no | `3000` | host port for the web UI and API; the container always listens on 3000 |
| `JWT_SECRET` | yes (Docker) | placeholder in `.env.example` | key that signs login tokens (valid 60 minutes). Replace it with your own long random string for anything other than a throw-away demo. Compose refuses to start if it is empty |
| `DEMO_PASSWORD` | no | `demo123` | shared password of the four demo accounts (fake data) |
| `DATABASE_URL` | set by Compose | `postgresql://postgres:<POSTGRES_PASSWORD>@db:5432/mekong_l4` | connection string of the demo database; you do **not** write it for Docker |
| `TEST_DATABASE_URL` | set by Compose | `…@db:5432/mekong_l4_test` | separate database used by `npm test`, `npm run e2e`, `npm run tc`; those commands **wipe** it on every run |
| `PORT` | set by Compose | `3000` | port inside the container |

The last three rows of `.env.example` (`DATABASE_URL`, `TEST_DATABASE_URL`, `PORT`) are used only when the system is run without Docker.

## 4. Sample data

The sample data is `db/seed.sql`. The application container loads it automatically on every start with `npm run seed`. The command applies the schema only once and the seed never duplicates rows, so restarting is safe.

| Table | Rows | Content |
|---|---|---|
| `customer` | 2 | Lê Minh Châu (0901234567), Phạm Quốc Dũng (0912345678) |
| `technician` | 3 | `TECH-003` Nguyễn Văn An (Quận 7), `TECH-005` Lê Hoàng Cường (Quận 1), `TECH-007` Trần Thị Bích (Quận 7) |
| `technician_skill` | 4 | SCREEN_REPAIR, BATTERY, MAINBOARD levels |
| `ticket` | 3 | `T-2026-0042` and `T-2026-0043` waiting for assignment; `T-2026-0044` already assigned to `TECH-003` |
| `appointment` | 0 | created by the user while testing |

Demo accounts (password `demo123`, fake data): `quanly01` (manager), `ktv.an` (technician `TECH-003`), `ktv.bich` (technician `TECH-007`), `khach01` (customer Lê Minh Châu).

Return the demo data to its initial state after you have been experimenting:

```bash
docker compose exec app npm run demo:reset
```

(or `docker compose down -v` followed by `docker compose up -d --build` to rebuild everything).

## 5. Verify it works

Do the checks in order. Each one has an exact expected result. Windows PowerShell users: write `curl.exe` instead of `curl`.

| # | Check | Command | Expected result |
|---|---|---|---|
| 1 | Both containers healthy | `docker compose ps` | `db` and `app` both show `(healthy)` |
| 2 | API and database answer | `curl -s http://localhost:3000/health` | `{"status":"ok","database":"up"}` |
| 3 | Login works | `curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\":\"quanly01\",\"password\":\"demo123\"}"` (PowerShell alternative: `Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/login -ContentType 'application/json' -Body '{"username":"quanly01","password":"demo123"}'`) | JSON with `token`, `"token_type":"Bearer"`, `"expires_in":3600` and `"role":"MANAGER"` |
| 4 | Web UI shows the sample data | open http://localhost:3000/ , log in as `quanly01` / `demo123` | the ticket list shows 3 tickets; `T-2026-0042` and `T-2026-0043` are *Chờ phân công* |
| 5 | The whole automatic test suite passes | `docker compose exec app npm test` | the last lines read `# tests 71`, `# pass 71`, `# fail 0` |
| 6 | The 12 documented test cases pass | `docker compose exec app npm run tc` | the last line of the summary reads `Tổng: 12 test case · PASS 12 · FAIL 0` |
| 7 | Re-running the seed is safe (no error, no duplicated rows) | run the row count below, then `docker compose exec app npm run seed`, then the row count again | the seed prints `001_schema đã áp dụng trước đó – bỏ qua` and `Đã nạp dữ liệu mẫu (db/seed.sql)`; both counts are identical (on a fresh start: 2, 3, 4, 3, 0) |

Row count used in check 7:

```bash
docker compose exec db psql -U postgres -d mekong_l4 -c "SELECT (SELECT count(*) FROM customer) AS customers, (SELECT count(*) FROM technician) AS technicians, (SELECT count(*) FROM technician_skill) AS skills, (SELECT count(*) FROM ticket) AS tickets, (SELECT count(*) FROM appointment) AS appointments"
```

Checks 5 and 6 use the separate database `mekong_l4_test`, so they do not change the data you see in the web UI.

### If something fails

| Symptom | Cause | Fix |
|---|---|---|
| `POSTGRES_PASSWORD is not set - run "cp .env.example .env" first` (or the same for `JWT_SECRET`) | step 2 was skipped, or the variable is empty in `.env` | run step 2; make sure the variable has a value |
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | another program uses port 3000 | set `APP_PORT=3010` in `.env`, run `docker compose up -d`, and use `http://localhost:3010/` everywhere |
| `app` keeps restarting; log shows `password authentication failed` | `POSTGRES_PASSWORD` was changed after the database volume was created | `docker compose down -v` then `docker compose up -d --build` |
| `npm test` fails with `database "mekong_l4_test" does not exist` | the database volume was created before this version | `docker compose down -v` then `docker compose up -d --build` (the test database is created only when the volume is first created) |
| `docker compose ps` shows `app` as `unhealthy` | the API cannot reach PostgreSQL or crashed at start | `docker compose logs app`; the first lines state the cause |
| `exec ./something.sh: no such file or directory` or similar on Windows | a script was checked out with CRLF line endings | the repository's `.gitattributes` forces LF; re-clone into an empty folder |
| The web page shows no tickets to assign | the sample tickets were already assigned during earlier experiments | `docker compose exec app npm run demo:reset` |

After you have fixed a problem, repeat the verification from step 1 of section 5: a later problem only shows up once the earlier one is gone.

Not covered by this guide: HTTPS/TLS, backups, and horizontal scaling. For a public deployment put the application behind a reverse proxy that terminates TLS and replace the demo accounts and demo password (see `docs/checklist-bao-mat.md`).
