# API Documentation – Smart CRM Mekong Mobile · L4 (Technician Assignment and Appointments)

Version **1.0.0** · Track SE · Node.js 22 + Express 4 + PostgreSQL 16 · Student: Nguyễn Trọng Hải (2374802010126)

This document describes **only endpoints that exist in the code**. There are **15 API endpoints** under `/api/v1` plus one health endpoint (`GET /health`). The command `npm run check:docs` compares the routes registered in `src/` with the endpoint headings in this file and fails if the counts or the method/path pairs differ.

All request and response examples below were **copied from a real run** against the seeded database (`db/seed.sql`), not written by hand. Timestamps are ISO 8601 with the `+07:00` offset. The human-readable `error.message` text is Vietnamese (the target users speak Vietnamese); a client must branch on `error.code`, never on the message text.

## 0. Conventions

| Topic | Rule |
|---|---|
| Base URL | `http://localhost:3000` (set `APP_PORT` in `.env` to change the host port when using Docker) |
| Format | JSON in, JSON out (`Content-Type: application/json`) |
| Authentication | `Authorization: Bearer <token>`; get the token from `POST /api/v1/auth/login`; it expires after **60 minutes** |
| Test-only fallback | Requests without `Authorization` may use `X-User`, `X-Role`, `X-User-Code` headers. This exists for curl/Postman testing and the automated tests. **It must be disabled in a real deployment** (see `docs/checklist-bao-mat.md`, item 4). A wrong or expired `Authorization` header always returns 401; it never falls back to the test headers |
| Roles | `MANAGER` (center manager), `TECHNICIAN`, `CUSTOMER` |
| Demo accounts | `quanly01` (MANAGER), `ktv.an` (TECHNICIAN, `TECH-003`), `ktv.bich` (TECHNICIAN, `TECH-007`), `khach01` (CUSTOMER, phone `0901234567`); shared demo password `demo123` (fake data, not a secret) |

### 0.1 Error format (all endpoints)

```json
{ "error": { "code": "APPOINTMENT_CONFLICT", "message": "…", "details": ["…"] } }
```

`details` appears only on validation errors. Domain codes are mapped to HTTP status in one place: `STATUS_BY_CODE` in `src/middleware/error.js`.

### 0.2 Errors that any endpoint under `/api/v1/tickets` or `/api/v1/appointments` can return

| HTTP | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | no `Authorization` header and no valid test headers |
| 401 | `TOKEN_INVALID` / `TOKEN_EXPIRED` | token malformed, signature wrong, or older than 60 minutes |
| 400 | `INVALID_JSON` | request body is not valid JSON |
| 404 | `NOT_FOUND` | unknown path, e.g. `GET /api/v1/nothing` |
| 503 | `DATABASE_UNAVAILABLE` | PostgreSQL cannot be reached |
| 500 | `INTERNAL_ERROR` | unexpected failure; the message is generic and leaks no internals |

### 0.3 Who may call what

| Endpoint | MANAGER | TECHNICIAN | CUSTOMER |
|---|---|---|---|
| `POST /auth/login` | public | public | public |
| `GET /auth/me` | yes | yes | yes |
| `POST/PATCH/DELETE /tickets…` | yes | 403 | 403 |
| `GET /tickets`, `GET /tickets/{code}` | all | own assigned tickets | own tickets (matched by phone) |
| `…/technician-suggestions`, `…/assignment`, `…/reassignment` | yes | 403 | 403 |
| `POST /appointments`, `DELETE /appointments/{code}` | yes | 403 | 403 |
| `GET /appointments`, `GET /appointments/{code}` | all | own appointments | appointments of own tickets |
| `PATCH /appointments/{code}` | confirm or cancel | 403 | confirm own only |

---

## 1. Endpoints

### 1. `POST /api/v1/auth/login`

**1. Purpose.** Exchange a username and password for a Bearer token that is valid for 60 minutes.

**2. Access.** Public (no token).

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `username` | body | yes | string | non-empty |
| `password` | body | yes | string | non-empty |


**4. Request example.**

```json
{
  "username": "quanly01",
  "password": "demo123"
}
```

**5. Success response.**

```json
{
  "token": "eyJuYW1lIjoicXVhbmx5MDEi…<signature>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "name": "quanly01",
    "full_name": "Quản lý trung tâm",
    "role": "MANAGER",
    "code": null
  }
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `username` or `password` missing or not a string |
| 401 | `INVALID_CREDENTIALS` | unknown user or wrong password |


**7. Rules and notes.** The accounts are demo accounts defined in `src/services/auth.service.js` (the L4 ERD has no user table). The token is `<base64url payload>.<HMAC-SHA256 signature>` signed with `JWT_SECRET`. Error example (wrong password): `{"error": {"code": "INVALID_CREDENTIALS", "message": "Sai tên đăng nhập hoặc mật khẩu."}}`.

**Try it (bash).**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"quanly01","password":"demo123"}'
```

### 2. `GET /api/v1/auth/me`

**1. Purpose.** Return the identity carried by the current token.

**2. Access.** Any authenticated role.

**3. Parameters.**

No parameters.

**4. Request example.**

`GET /api/v1/auth/me` with `Authorization: Bearer <token>`

**5. Success response.**

```json
{
  "user": {
    "name": "quanly01",
    "role": "MANAGER",
    "code": null
  }
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED / TOKEN_INVALID / TOKEN_EXPIRED` | missing, malformed or expired token |


**7. Rules and notes.** Useful for the web UI to show who is logged in.

**Try it (bash).**
```bash
curl -s http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

### 3. `POST /api/v1/tickets`

**1. Purpose.** Create a warranty ticket in status `WAITING_ASSIGNMENT` for an existing customer.

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `customer_phone` | body | yes | string | 9–15 digits; **must be a JSON string** (a JSON number such as `901234567` is rejected with 400, see BUG-10); the customer must already exist |
| `device_model` | body | yes | string | 1–100 characters |
| `required_skill` | body | yes | enum | `SCREEN_REPAIR`, `BATTERY`, `MAINBOARD`, `WATER_DAMAGE` |
| `service_area` | body | yes | string | 1–50 characters |


**4. Request example.**

```json
{
  "customer_phone": "0912345678",
  "device_model": "iPad Air",
  "required_skill": "SCREEN_REPAIR",
  "service_area": "Quận 7"
}
```

**5. Success response.**

```json
{
  "ticket_code": "T-2026-0045",
  "status": "WAITING_ASSIGNMENT",
  "device_model": "iPad Air",
  "required_skill": "SCREEN_REPAIR",
  "service_area": "Quận 7",
  "customer": {
    "full_name": "Phạm Quốc Dũng",
    "phone": "0912345678"
  },
  "technician": null,
  "created_at": "2026-11-13T13:29:46+07:00"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | a field is missing or invalid, e.g. `customer_phone` with 8 digits |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `CUSTOMER_NOT_FOUND` | no customer has that phone number |


**7. Rules and notes.** The new code is `T-YYYY-NNNN` (largest number of the year plus one). Example of a 400: `{"error": {"code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ: customer_phone bắt buộc, kiểu chuỗi gồm 9–15 chữ số.", "details": ["customer_phone bắt buộc, kiểu chuỗi gồm 9–15 chữ số"]}}`.

**Try it (bash).**
```bash
curl -s -X POST http://localhost:3000/api/v1/tickets -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_phone":"0912345678","device_model":"iPad Air","required_skill":"SCREEN_REPAIR","service_area":"Quận 7"}'
```

### 4. `GET /api/v1/tickets`

**1. Purpose.** List tickets, optionally filtered by status.

**2. Access.** Any authenticated role. The result is scoped: a manager sees all tickets, a technician only tickets assigned to them, a customer only their own.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `status` | query | no | enum | `WAITING_ASSIGNMENT`, `ASSIGNED`, `IN_PROGRESS`, `DONE` |


**4. Request example.**

`GET /api/v1/tickets?status=WAITING_ASSIGNMENT`

**5. Success response.**

```json
{
  "data": [
    {
      "ticket_code": "T-2026-0042",
      "status": "WAITING_ASSIGNMENT",
      "device_model": "iPhone 14 Pro",
      "required_skill": "SCREEN_REPAIR",
      "service_area": "Quận 7",
      "customer": {
        "full_name": "Lê Minh Châu",
        "phone": "0901234567"
      },
      "technician": null,
      "created_at": "2026-11-13T13:29:22+07:00"
    },
    {
      "ticket_code": "T-2026-0043",
      "status": "WAITING_ASSIGNMENT",
      "device_model": "Samsung S23",
      "required_skill": "BATTERY",
      "service_area": "Quận 7",
      "customer": {
        "full_name": "Phạm Quốc Dũng",
        "phone": "0912345678"
      },
      "technician": null,
      "created_at": "2026-11-13T13:29:22+07:00"
    }
  ]
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | `status` is not one of the four values (e.g. `?status=BOGUS`) |
| 403 | `FORBIDDEN` | a technician or customer token without a user code (test-header mode only) |


**7. Rules and notes.** An empty result is still `200` with `"data": []`.

**Try it (bash).**
```bash
curl -s "http://localhost:3000/api/v1/tickets?status=WAITING_ASSIGNMENT" -H "Authorization: Bearer $TOKEN"
```

### 5. `GET /api/v1/tickets/{ticket_code}`

**1. Purpose.** Return one ticket with its assignment history.

**2. Access.** Any authenticated role; technicians and customers may read only their own tickets.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | path | yes | string | format `T-YYYY-NNNN` |


**4. Request example.**

`GET /api/v1/tickets/T-2026-0042`

**5. Success response.**

```json
{
  "ticket_code": "T-2026-0042",
  "status": "WAITING_ASSIGNMENT",
  "device_model": "iPhone 14 Pro",
  "required_skill": "SCREEN_REPAIR",
  "service_area": "Quận 7",
  "customer": {
    "full_name": "Lê Minh Châu",
    "phone": "0901234567"
  },
  "technician": null,
  "created_at": "2026-11-13T13:29:22+07:00",
  "assignments": []
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | `ticket_code` has the wrong format (e.g. `abc`) |
| 403 | `FORBIDDEN` | the ticket belongs to someone else |
| 404 | `TICKET_NOT_FOUND` | no such ticket |


**7. Rules and notes.** `assignments` lists every assignment and reassignment (empty here because the ticket has not been assigned yet). Example of a 403: `{"error": {"code": "FORBIDDEN", "message": "Chỉ được xem phiếu của chính mình."}}`.

**Try it (bash).**
```bash
curl -s http://localhost:3000/api/v1/tickets/T-2026-0042 -H "Authorization: Bearer $TOKEN"
```

### 6. `PATCH /api/v1/tickets/{ticket_code}`

**1. Purpose.** Change `device_model`, `required_skill` or `service_area` of a ticket that is still waiting for assignment.

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | path | yes | string | format `T-YYYY-NNNN` |
| `device_model` | body | no | string | 1–100 characters |
| `required_skill` | body | no | enum | same four values as on create |
| `service_area` | body | no | string | 1–50 characters |


**4. Request example.**

```json
{
  "device_model": "iPad Air 5"
}
```

**5. Success response.**

```json
{
  "ticket_code": "T-2026-0045",
  "status": "WAITING_ASSIGNMENT",
  "device_model": "iPad Air 5",
  "required_skill": "SCREEN_REPAIR",
  "service_area": "Quận 7",
  "customer": {
    "full_name": "Phạm Quốc Dũng",
    "phone": "0912345678"
  },
  "technician": null,
  "created_at": "2026-11-13T13:29:46+07:00"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR / INVALID_PARAMETER` | empty body, invalid value, `customer_phone` supplied, or bad `ticket_code` |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `TICKET_NOT_FOUND` | no such ticket |
| 409 | `TICKET_NOT_EDITABLE` | the ticket is no longer `WAITING_ASSIGNMENT` |


**7. Rules and notes.** At least one field is required; fields not sent keep their value. The customer of a ticket cannot be changed.

**Try it (bash).**
```bash
curl -s -X PATCH http://localhost:3000/api/v1/tickets/T-2026-0045 -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"device_model":"iPad Air 5"}'
```

### 7. `DELETE /api/v1/tickets/{ticket_code}`

**1. Purpose.** Delete a ticket that is still waiting for assignment.

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | path | yes | string | format `T-YYYY-NNNN` |


**4. Request example.**

`DELETE /api/v1/tickets/T-2026-0045`

**5. Success response.**

```json
{
  "ticket_code": "T-2026-0045",
  "deleted": true
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | bad `ticket_code` |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `TICKET_NOT_FOUND` | no such ticket (also returned when the same delete is repeated) |
| 409 | `TICKET_NOT_DELETABLE` | the ticket is no longer `WAITING_ASSIGNMENT` |


**7. Rules and notes.** This is a hard delete, allowed only before any technician is involved.

**Try it (bash).**
```bash
curl -s -X DELETE http://localhost:3000/api/v1/tickets/T-2026-0045 -H "Authorization: Bearer $TOKEN"
```

### 8. `GET /api/v1/tickets/{ticket_code}/technician-suggestions`

**1. Purpose.** Suggest technicians for a ticket: same skill, same service area, below their open-ticket limit, ordered by fewest open tickets first.

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | path | yes | string | format `T-YYYY-NNNN` |
| `limit` | query | no | integer | 1–20, default 5 |
| `purpose` | query | no | enum | `assign` (default) or `reassign`; `reassign` is for an already assigned ticket and excludes the current technician |


**4. Request example.**

`GET /api/v1/tickets/T-2026-0042/technician-suggestions?limit=5`

**5. Success response.**

```json
{
  "ticket_code": "T-2026-0042",
  "required_skill": "SCREEN_REPAIR",
  "service_area": "Quận 7",
  "suggestions": [
    {
      "technician_code": "TECH-007",
      "full_name": "Trần Thị Bích",
      "skill_level": 2,
      "open_tickets": 0,
      "max_open_tickets": 8
    },
    {
      "technician_code": "TECH-003",
      "full_name": "Nguyễn Văn An",
      "skill_level": 3,
      "open_tickets": 1,
      "max_open_tickets": 8
    }
  ]
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | `limit` outside 1–20, bad `ticket_code`, or `purpose` not `assign`/`reassign` |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `TICKET_NOT_FOUND` | no such ticket |
| 409 | `TICKET_NOT_WAITING` | `purpose=assign` on a ticket that is not `WAITING_ASSIGNMENT` |
| 409 | `TICKET_NOT_ASSIGNED` | `purpose=reassign` on a ticket that is not `ASSIGNED` |


**7. Rules and notes.** No suitable technician still returns `200` with `"suggestions": []`. Example 409: `{"error": {"code": "TICKET_NOT_WAITING", "message": "Phiếu không ở trạng thái Chờ phân công."}}`.

**Try it (bash).**
```bash
curl -s "http://localhost:3000/api/v1/tickets/T-2026-0042/technician-suggestions?limit=5" -H "Authorization: Bearer $TOKEN"
```

### 9. `POST /api/v1/tickets/{ticket_code}/assignment`

**1. Purpose.** Assign a technician to a ticket that is waiting for assignment (ticket becomes `ASSIGNED`).

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | path | yes | string | format `T-YYYY-NNNN` |
| `technician_code` | body | yes | string | format `TECH-NNN` |
| `note` | body | no | string | 0–255 characters |


**4. Request example.**

```json
{
  "technician_code": "TECH-003",
  "note": "Khách cần xử lý trong tuần"
}
```

**5. Success response.**

```json
{
  "assignment_code": "ASG-0001",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "ticket_status": "ASSIGNED",
  "technician_open_tickets": 2,
  "assigned_at": "2026-11-13T13:29:46+07:00"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `technician_code` missing or wrong format, `note` too long |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `TICKET_NOT_FOUND / TECHNICIAN_NOT_FOUND` | unknown ticket or technician |
| 409 | `TICKET_ALREADY_ASSIGNED` | the ticket already has a technician |
| 409 | `TECHNICIAN_OVERLOADED` | the technician already holds the maximum open tickets (default 8) |
| 409 | `TECHNICIAN_NOT_ELIGIBLE` | missing the required skill or different service area |


**7. Rules and notes.** The eligibility check and the write happen in one database transaction with a row lock, so two managers assigning at the same time cannot overload a technician. Example 409: `{"error": {"code": "TICKET_ALREADY_ASSIGNED", "message": "Phiếu đã có kỹ thuật viên phụ trách. Hãy dùng phân công lại."}}`.

**Try it (bash).**
```bash
curl -s -X POST http://localhost:3000/api/v1/tickets/T-2026-0042/assignment -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"technician_code":"TECH-003","note":"Khách cần xử lý trong tuần"}'
```

### 10. `POST /api/v1/tickets/{ticket_code}/reassignment`

**1. Purpose.** Move an assigned ticket to a different technician; a reason is mandatory.

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | path | yes | string | format `T-YYYY-NNNN` |
| `technician_code` | body | yes | string | format `TECH-NNN` |
| `reason` | body | yes | string | 1–255 characters |
| `note` | body | no | string | 0–255 characters |


**4. Request example.**

```json
{
  "technician_code": "TECH-007",
  "reason": "Kỹ thuật viên nghỉ đột xuất"
}
```

**5. Success response.**

```json
{
  "assignment_code": "ASG-0002",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-007",
  "ticket_status": "ASSIGNED",
  "moved_appointments": 1,
  "technician_open_tickets": 1,
  "assigned_at": "2026-11-13T13:29:46+07:00"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `reason` missing or empty, bad `technician_code`, text too long |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `TICKET_NOT_FOUND / TECHNICIAN_NOT_FOUND` | unknown ticket or technician |
| 409 | `TICKET_NOT_ASSIGNED` | the ticket is not in `ASSIGNED` |
| 409 | `SAME_TECHNICIAN` | the new technician is the current one |
| 409 | `TECHNICIAN_NOT_ELIGIBLE / TECHNICIAN_OVERLOADED` | new technician lacks skill/area or is full |
| 409 | `APPOINTMENT_CONFLICT` | an upcoming appointment of the ticket overlaps the new technician's schedule; nothing is changed |


**7. Rules and notes.** Upcoming appointments that are not cancelled move to the new technician (`moved_appointments`). The whole operation is all-or-nothing. Example 409: `{"error": {"code": "SAME_TECHNICIAN", "message": "Kỹ thuật viên mới trùng với người đang phụ trách."}}`.

**Try it (bash).**
```bash
curl -s -X POST http://localhost:3000/api/v1/tickets/T-2026-0042/reassignment -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"technician_code":"TECH-007","reason":"Kỹ thuật viên nghỉ đột xuất"}'
```

### 11. `POST /api/v1/appointments`

**1. Purpose.** Book a drop-off or pick-up appointment for the technician in charge of a ticket, rejecting any overlap.

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `ticket_code` | body | yes | string | format `T-YYYY-NNNN`; the ticket must exist |
| `technician_code` | body | yes | string | format `TECH-NNN`; must be the technician in charge of the ticket |
| `type` | body | yes | enum | `DROP_OFF` or `PICK_UP` |
| `start_at` | body | yes | datetime | ISO 8601 with offset; a real calendar date (30 Feb is rejected, BUG-08); in the future; Monday–Saturday; between 08:00 and 17:30 including the end time |
| `duration_minutes` | body | no | integer | 15–120, default 30; `start_at + duration` must be ≤ 17:30 |


**4. Request example.**

```json
{
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "type": "DROP_OFF",
  "start_at": "2026-11-16T09:00:00+07:00",
  "duration_minutes": 30
}
```

**5. Success response.**

```json
{
  "appointment_code": "APT-0001",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "type": "DROP_OFF",
  "start_at": "2026-11-16T09:00:00+07:00",
  "end_at": "2026-11-16T09:30:00+07:00",
  "status": "PENDING_CONFIRMATION"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | missing field, wrong `type`, `duration_minutes` outside 15–120, `start_at` in the past, on Sunday, outside 08:00–17:30, or not a real date |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `TICKET_NOT_FOUND / TECHNICIAN_NOT_FOUND` | unknown ticket or technician |
| 409 | `TECHNICIAN_NOT_ASSIGNED` | the technician is not in charge of the ticket |
| 409 | `APPOINTMENT_CONFLICT` | overlaps another non-cancelled appointment of the same technician; the body names the conflicting appointment |


**7. Rules and notes.** Overlap is enforced by a PostgreSQL `EXCLUDE USING gist` constraint, so it holds even under concurrent requests. Back-to-back slots (one ends 09:30, next starts 09:30) are allowed; a 1-minute overlap is not. Example 409:

```json
{
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "Kỹ thuật viên TECH-003 đã có lịch hẹn trong khung giờ này.",
    "conflicting_appointment": {
      "appointment_code": "APT-0001",
      "start_at": "2026-11-16T09:00:00+07:00",
      "end_at": "2026-11-16T09:30:00+07:00"
    }
  }
}
```

**Try it (bash).**
```bash
curl -s -X POST http://localhost:3000/api/v1/appointments -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticket_code":"T-2026-0042","technician_code":"TECH-003","type":"DROP_OFF","start_at":"2026-11-16T09:00:00+07:00","duration_minutes":30}'
```

### 12. `GET /api/v1/appointments`

**1. Purpose.** List appointments, optionally filtered.

**2. Access.** Any authenticated role; technicians see only their own appointments, customers only those of their own tickets.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `technician_code` | query | no | string | format `TECH-NNN` |
| `ticket_code` | query | no | string | format `T-YYYY-NNNN` |
| `status` | query | no | enum | `PENDING_CONFIRMATION`, `CONFIRMED`, `CANCELLED` |


**4. Request example.**

`GET /api/v1/appointments?technician_code=TECH-003`

**5. Success response.**

```json
{
  "data": [
    {
      "appointment_code": "APT-0001",
      "ticket_code": "T-2026-0042",
      "technician_code": "TECH-003",
      "type": "DROP_OFF",
      "start_at": "2026-11-16T09:00:00+07:00",
      "end_at": "2026-11-16T09:30:00+07:00",
      "status": "PENDING_CONFIRMATION"
    }
  ]
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | a filter has the wrong format or an unknown `status` (e.g. `?status=BOGUS`); since BUG-09 this is a 400, not an empty 200 |
| 403 | `FORBIDDEN` | a technician or customer token without a user code (test-header mode only) |


**7. Rules and notes.** A valid filter that matches nothing returns `200` with `"data": []`.

**Try it (bash).**
```bash
curl -s "http://localhost:3000/api/v1/appointments?technician_code=TECH-003" -H "Authorization: Bearer $TOKEN"
```

### 13. `GET /api/v1/appointments/{appointment_code}`

**1. Purpose.** Return one appointment.

**2. Access.** Any authenticated role; technicians and customers may read only their own.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `appointment_code` | path | yes | string | format `APT-NNNN` (at least four digits) |


**4. Request example.**

`GET /api/v1/appointments/APT-0001`

**5. Success response.**

```json
{
  "appointment_code": "APT-0001",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "type": "DROP_OFF",
  "start_at": "2026-11-16T09:00:00+07:00",
  "end_at": "2026-11-16T09:30:00+07:00",
  "status": "PENDING_CONFIRMATION"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | bad format (e.g. `abc`) |
| 403 | `FORBIDDEN` | the appointment belongs to someone else |
| 404 | `APPOINTMENT_NOT_FOUND` | well-formed code that does not exist, e.g. `APT-9999` |


**7. Rules and notes.** A malformed code is 400 and a well-formed unknown code is 404 (BUG-09).

**Try it (bash).**
```bash
curl -s http://localhost:3000/api/v1/appointments/APT-0001 -H "Authorization: Bearer $TOKEN"
```

### 14. `PATCH /api/v1/appointments/{appointment_code}`

**1. Purpose.** Change the status of an appointment: confirm it (customer who owns the ticket, or manager) or cancel it (manager).

**2. Access.** Any authenticated role, but: `TECHNICIAN` always gets 403; `CUSTOMER` may only confirm appointments of their own tickets; only `MANAGER` may cancel.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `appointment_code` | path | yes | string | format `APT-NNNN` |
| `status` | body | yes | enum | `CONFIRMED` or `CANCELLED` |


**4. Request example.**

```json
{
  "status": "CONFIRMED"
}
```

**5. Success response.**

```json
{
  "appointment_code": "APT-0001",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "type": "DROP_OFF",
  "start_at": "2026-11-16T09:00:00+07:00",
  "end_at": "2026-11-16T09:30:00+07:00",
  "status": "CONFIRMED"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR / INVALID_PARAMETER` | `status` not `CONFIRMED`/`CANCELLED`, or bad code |
| 403 | `FORBIDDEN` | technician; customer confirming someone else's appointment; non-manager cancelling |
| 404 | `APPOINTMENT_NOT_FOUND` | no such appointment |
| 409 | `INVALID_STATUS_TRANSITION` | e.g. confirming an appointment that is already confirmed |


**7. Rules and notes.** Allowed transitions: `PENDING_CONFIRMATION → CONFIRMED`, `PENDING_CONFIRMATION → CANCELLED`, `CONFIRMED → CANCELLED`. Example 409: `{"error": {"code": "INVALID_STATUS_TRANSITION", "message": "Không thể chuyển lịch hẹn từ CONFIRMED sang CONFIRMED."}}`.

**Try it (bash).**
```bash
curl -s -X PATCH http://localhost:3000/api/v1/appointments/APT-0001 -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"CONFIRMED"}'
```

### 15. `DELETE /api/v1/appointments/{appointment_code}`

**1. Purpose.** Cancel an appointment (soft delete: status becomes `CANCELLED`, the row and its history are kept, and the time slot is freed).

**2. Access.** `MANAGER` only.

**3. Parameters.**

| Name | In | Required | Type | Rules |
|---|---|---|---|---|
| `appointment_code` | path | yes | string | format `APT-NNNN` |


**4. Request example.**

`DELETE /api/v1/appointments/APT-0001`

**5. Success response.**

```json
{
  "appointment_code": "APT-0001",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-007",
  "type": "DROP_OFF",
  "start_at": "2026-11-16T09:00:00+07:00",
  "end_at": "2026-11-16T09:30:00+07:00",
  "status": "CANCELLED"
}
```

**6. Error responses.**

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `INVALID_PARAMETER` | bad format |
| 403 | `FORBIDDEN` | caller is not `MANAGER` |
| 404 | `APPOINTMENT_NOT_FOUND` | no such appointment |
| 409 | `INVALID_STATUS_TRANSITION` | the appointment is already `CANCELLED` |


**7. Rules and notes.** Equivalent to `PATCH` with `{"status":"CANCELLED"}`. The cancelled slot can be booked again.

**Try it (bash).**
```bash
curl -s -X DELETE http://localhost:3000/api/v1/appointments/APT-0001 -H "Authorization: Bearer $TOKEN"
```

---

## 2. Health check (outside `/api/v1`)

### `GET /health`

No authentication. Used by Docker Compose as the container health check.

| HTTP | Body | Meaning |
|---|---|---|
| 200 | {"status": "ok", "database": "up"} | API and PostgreSQL are up |
| 503 | `{"status":"degraded","database":"down"}` | the API is up but PostgreSQL does not answer |

The root path `/` redirects to the web UI at `/app/`; `GET /api` returns a short index of the endpoints above. Both are convenience routes and are not part of the contract.

## 3. Traceability

| Endpoint group | Verified by |
|---|---|
| Assignment, suggestions, reassignment | integration tests in `test/api.integration.test.js`; Test Report TC-01, TC-06 |
| Appointments and overlap | TC-02 to TC-05, TC-07; PostgreSQL exclusion constraint `ex_appt_no_overlap` in `db/schema.sql` |
| Validation of wrong data | TC-07 (BUG-08), TC-08 (BUG-10), TC-09 (BUG-09) |
| Roles and token | TC-10; `test/token.test.js` |
| Data quality (HTML/SQL characters stored verbatim) | TC-11 |
