# 04 – API Documentation

> Recruitment prototype – fictional data only. Not affiliated with or endorsed by the
> Government of Kerala or the Chief Minister’s Office.

Base URL: `/api` (local: `http://localhost:4000/api`; Vite dev proxy:
`http://localhost:5173/api`).

## 1. Conventions

- All requests and responses are JSON unless noted (grievance creation and action reports use
  `multipart/form-data`).
- Authentication uses the `cmk_token` **httpOnly cookie** set by register/login. API clients
  may also send `Authorization: Bearer <jwt>`.
- Success shape: `{ "data": ... }`. List endpoints add `pagination` and `summary`.
- Error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "description", "message": "Please describe the grievance in at least 30 characters" }]
  }
}
```

- Dates are ISO 8601 timestamps.
- IDs in URLs are numeric internal IDs; `ref_no` is the public reference.
- Rate limits (per IP): 600 requests / 15 min on `/api`, 25 / 15 min on auth endpoints,
  15 / 10 min on AI, 10 / hour on contact. Tests disable limiting.
- `401` missing/expired session, `403` wrong role/ownership, `404` missing, `409` illegal
  workflow or uniqueness conflict, `413` oversized upload, `422` validation failure.

### User object

```json
{
  "id": 4,
  "name": "Aisha Rahman",
  "email": "citizen@demo.test",
  "mobile": "9876500001",
  "role": "CITIZEN",
  "department_id": null,
  "department": null,
  "created_at": "2026-11-01T09:15:00.000Z"
}
```

Officers include `department_id` and `department: { id, code, name }`. `password_hash` is never
returned.

## 2. Authentication

### `POST /api/auth/register`

Public. Creates a `CITIZEN` account and signs the user in.

Request:

```json
{
  "name": "Test Citizen",
  "email": "test.citizen@example.test",
  "mobile": "9876512345",
  "password": "TestPass123"
}
```

- Name 2–80 chars; valid email; Indian mobile (`[6-9]` + 9 digits, optional `+91`); password
  8–72 chars with at least one letter and one digit.
- Unknown fields such as `role` are stripped by Zod, so self-registration cannot create staff.

Response `201 Created` + `Set-Cookie: cmk_token=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=…`:

```json
{ "data": { "id": 15, "name": "Test Citizen", "role": "CITIZEN", "email": "test.citizen@example.test", "mobile": "9876512345", "department": null } }
```

Errors: `409 CONFLICT` (email exists), `422 VALIDATION_ERROR`.

### `POST /api/auth/login`

Public. Request:

```json
{ "email": "citizen@demo.test", "password": "Demo@12345" }
```

Response `200 OK`: `{ "data": <user> }` and auth cookie. Wrong credentials:
`401 INVALID_CREDENTIALS` (generic message, bcrypt comparison still runs).

### `POST /api/auth/logout`

Clears the cookie. Response `200 OK`:

```json
{ "data": { "message": "Signed out" } }
```

### `GET /api/auth/me`

Requires authentication. Response `200 OK`: `{ "data": <user> }`. `401 UNAUTHORIZED`
without a valid session. The user is reloaded from the database on every request.

## 3. Public reference data and contact

### `GET /api/departments`

Public. `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "code": "PWD",
      "name": "Public Works Department",
      "short_description": "Roads, bridges, public buildings and other public works.",
      "contact_email": "pwd@demo.test",
      "officer_count": 1,
      "grievance_count": 6
    }
  ]
}
```

### `GET /api/categories`

Public. `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "slug": "roads",
      "name": "Roads & Potholes",
      "description": "Damaged roads, potholes, footpaths and road safety works.",
      "default_department_id": 1,
      "department_code": "PWD",
      "department_name": "Public Works Department"
    }
  ]
}
```

### `GET /api/meta`

Public. Returns districts, statuses, priorities, roles, SLA days, upload constraints and
whether Gemini is configured:

```json
{
  "data": {
    "districts": ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"],
    "statuses": ["Submitted", "Under Review", "In Progress", "Resolved", "Reopened"],
    "priorities": ["Low", "Medium", "High"],
    "roles": ["CITIZEN", "CMO_ADMIN", "DEPT_OFFICER"],
    "sla_days": { "High": 3, "Medium": 7, "Low": 15 },
    "upload_max_mb": 5,
    "upload_types": ["image/jpeg", "image/png", "application/pdf"],
    "ai_configured": true,
    "ai_model": "gemini-2.5-flash",
    "demo_mode": false
  }
}
```

### `POST /api/contact`

Public. Request:

```json
{
  "name": "Fictional Visitor",
  "email": "visitor@example.test",
  "subject": "Question about the prototype",
  "message": "This is a fictional message used to test the contact form."
}
```

Response `201 Created`:

```json
{
  "data": {
    "id": 1,
    "message": "Thank you. Your enquiry has been recorded by the prototype portal.",
    "created_at": "2026-11-11T10:00:00.000Z"
  }
}
```

Errors: `422` for invalid name/email/subject/message; `429` after 10 enquiries/hour.

### `GET /api/stats/public`

Public home-page aggregates:

```json
{
  "data": {
    "total_grievances": 40,
    "resolved_grievances": 11,
    "pending_grievances": 29,
    "in_progress_grievances": 11,
    "districts_covered": 14,
    "avg_resolution_days": 6.4,
    "departments_count": 10,
    "resolution_rate": 28,
    "as_of": "2026-11-11T10:00:00.000Z"
  }
}
```

### `GET /api/track/:refNo`

Public tracking without login. Reference must match `CMK-\d{4}-\d{6}` (case-insensitive).
It returns **no personal data and no internal remarks**.

```json
{
  "data": {
    "ref_no": "CMK-2026-000123",
    "subject": "Street light not working near the junction",
    "district": "Ernakulam",
    "category": { "name": "Street Lighting" },
    "department": { "name": "Local Self Government Department", "code": "LSG" },
    "priority": "Medium",
    "status": "In Progress",
    "is_overdue": false,
    "sla_days": 7,
    "escalation_count": 0,
    "created_at": "2026-11-04T09:00:00.000Z",
    "updated_at": "2026-11-05T12:00:00.000Z",
    "resolved_at": null,
    "timeline": [
      {
        "from_status": null,
        "to_status": "Submitted",
        "remark": "Grievance submitted through the citizen portal.",
        "changed_by_role": "CITIZEN",
        "created_at": "2026-11-04T09:00:00.000Z"
      }
    ]
  }
}
```

Errors: `404 NOT_FOUND`, `422 VALIDATION_ERROR` for a malformed reference.

### `GET /api/health`

Public health check used by Render:

```json
{ "status": "ok", "db": "up", "uptime": 123, "env": "production" }
```

Returns `503` with `{"status":"degraded","db":"down"}` if the database is unreachable.

## 4. Grievances

All routes in this section require authentication unless marked public.

### `POST /api/grievances`

Role: `CITIZEN`. `multipart/form-data`. Fields:

| Field | Required | Rules |
| --- | --- | --- |
| `district` | yes | One of 14 Kerala districts |
| `category_id` | yes | Active category ID |
| `subject` | yes | 5–150 chars |
| `description` | yes | 30–5,000 chars |
| `priority` | no | `Low`/`Medium`/`High` (default Medium) |
| `attachment` | no | JPG/PNG/PDF, ≤5 MB, magic bytes checked |
| `ai_category`, `ai_department`, `ai_priority`, `ai_priority_reason`, `ai_summary`, `ai_language`, `ai_source`, `ai_confidence`, `ai_accepted` | no | Advisory fields copied from the AI response if the citizen accepted or edited them |

Example:

```bash
curl -X POST http://localhost:4000/api/grievances \
  -b cookies.txt \
  -F district=Ernakulam \
  -F category_id=1 \
  -F subject="Deep potholes near the bus stand" \
  -F description="The road in front of the bus stand has deep potholes and is unsafe for pedestrians." \
  -F priority=High \
  -F ai_source=fallback-keyword \
  -F ai_accepted=true \
  -F attachment=@evidence.png
```

Response `201 Created`, `Location: /api/grievances/41`:

```json
{
  "data": {
    "id": 41,
    "ref_no": "CMK-2026-000041",
    "district": "Ernakulam",
    "subject": "Deep potholes near the bus stand",
    "description": "The road in front of the bus stand has deep potholes and is unsafe for pedestrians.",
    "category": { "id": 1, "name": "Roads & Potholes", "slug": "roads" },
    "department": null,
    "priority": "High",
    "status": "Submitted",
    "is_overdue": false,
    "sla_days": 3,
    "escalation_count": 0,
    "resolved_at": null,
    "created_at": "2026-11-11T10:00:00.000Z",
    "updated_at": "2026-11-11T10:00:00.000Z",
    "citizen": { "id": 4, "name": "Aisha Rahman", "email": "citizen@demo.test", "mobile": "9876500001" },
    "ai": {
      "category": "Roads & Potholes",
      "department": "PWD",
      "priority": "High",
      "priority_reason": "Public safety risk",
      "summary": "Citizen reports potholes near a bus stand.",
      "language": "en",
      "source": "fallback-keyword",
      "confidence": 0.4,
      "accepted": true,
      "analyzed_at": "2026-11-11T10:00:00.000Z"
    },
    "timeline": [
      {
        "id": 1,
        "from_status": null,
        "to_status": "Submitted",
        "remark": "Grievance submitted through the citizen portal with AI-assisted suggestions accepted by the citizen.",
        "is_internal": false,
        "changed_by_role": "CITIZEN",
        "changed_by_name": "Aisha Rahman",
        "created_at": "2026-11-11T10:00:00.000Z"
      }
    ],
    "attachments": [
      { "id": 1, "filename": "evidence.png", "mime": "image/png", "size": 68, "kind": "complaint", "created_at": "2026-11-11T10:00:00.000Z" }
    ],
    "assignment": null,
    "feedback": null,
    "duplicates": [{ "id": 12, "ref_no": "CMK-2026-000012", "subject": "Damaged road surface", "status": "Resolved", "similarity": 0.56 }],
    "available_actions": []
  }
}
```

Errors: `400 INVALID_FILE` when bytes do not match the declared type, `400` unsupported MIME,
`413 PAYLOAD_TOO_LARGE`, `422 VALIDATION_ERROR`, `403` for non-citizens.

### `GET /api/grievances`

Role-scoped list. Citizens see own cases; officers see their department’s cases in
`In Progress`/`Resolved`/`Reopened`; the CMO sees everything.

Query parameters:

| Name | Default | Notes |
| --- | --- | --- |
| `page` | 1 | ≥1 |
| `limit` | 10 | 1–50 |
| `status` | — | One workflow status |
| `district` | — | Kerala district |
| `category_id` | — | Integer |
| `department_id` | — | Integer |
| `priority` | — | `Low`/`Medium`/`High` |
| `search` | — | Matches reference or subject (ILIKE) |
| `overdue` | — | `true`/`false` |
| `sort` | `newest` | `newest`, `oldest`, `priority` |

Example:

```
GET /api/grievances?status=In%20Progress&district=Ernakulam&page=1&limit=10&sort=priority
```

Response `200 OK`:

```json
{
  "data": [
    {
      "id": 41,
      "ref_no": "CMK-2026-000041",
      "subject": "Deep potholes near the bus stand",
      "district": "Ernakulam",
      "priority": "High",
      "status": "In Progress",
      "category_id": 1,
      "category_name": "Roads & Potholes",
      "category_slug": "roads",
      "department_id": 1,
      "department_name": "Public Works Department",
      "department_code": "PWD",
      "created_at": "2026-11-11T10:00:00.000Z",
      "is_overdue": false,
      "report_status": "SUBMITTED",
      "feedback_rating": null,
      "attachment_count": 1,
      "citizen_name": "Aisha Rahman"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 6, "totalPages": 1 },
  "summary": { "total": 22, "pending": 12, "resolved": 10, "overdue": 5 }
}
```

`summary` is the role-scoped totals for the current user, not the filtered page.

### `GET /api/grievances/:id`

Role-scoped detail. Citizens additionally receive only public history and complaint
attachments; staff receive internal notes, all attachments, duplicate flags and
`available_actions`.

- CMO actions: `override`, `move_under_review`, `assign`, `review_report`, `escalate`, `remark`.
- Officer actions (when in progress and in their department): `start`, `report`, `remark`.
- Citizen actions: `feedback`, `reopen` when resolved.

Response is the same detail object shown under creation, including `assignment` when present:

```json
{
  "assignment": {
    "id": 9,
    "department": { "id": 1, "name": "Public Works Department", "code": "PWD" },
    "officer": { "id": 5, "name": "Suresh Kumar" },
    "assigned_at": "2026-11-11T10:05:00.000Z",
    "report_submitted_at": "2026-11-11T12:00:00.000Z",
    "report_status": "SUBMITTED",
    "report_reviewed_at": null,
    "action_taken_report": "The road was inspected and repaired…",
    "review_remark": null,
    "officer_name": "Suresh Kumar"
  }
}
```

Errors: `403` if outside the role’s scope; `404` if unknown.

### `PATCH /api/grievances/:id/status`

Roles: `CMO_ADMIN`, `DEPT_OFFICER`.

```json
{ "status": "Under Review", "remark": "Taken up by the CMO for verification.", "is_internal": false }
```

Allowed transitions (server-enforced):

| From | To | Role |
| --- | --- | --- |
| `Submitted` | `Under Review` | CMO |
| `Reopened` | `Under Review` | CMO |
| `In Progress` | `Resolved` | CMO (requires an accepted/submitted action report) |
| `In Progress` | `In Progress` | Officer (investigation started note) |

Any other combination returns `409 CONFLICT` with `details.from`, `details.to`,
`details.role`. Response `200` with the updated detail.

### `POST /api/grievances/:id/assign`

Role: `CMO_ADMIN`. Allowed only from `Under Review` or `Reopened`.

```json
{
  "department_id": 1,
  "officer_id": 5,
  "remark": "Forwarded to PWD for inspection and repair."
}
```

The officer must be active, role `DEPT_OFFICER`, and belong to the department. The service
deactivates any previous assignment, inserts a new `department_assignments` row, sets
`grievances.department_id`, moves status to `In Progress`, and writes history — all in one
transaction. Response `200` with detail.

Errors: `400` invalid department/officer or mismatched department, `409` wrong starting status.

### `POST /api/grievances/:id/remarks`

Roles: `CMO_ADMIN`, `DEPT_OFFICER` (officer must own the department).

```json
{ "remark": "Site inspected; contractor notified.", "is_internal": true }
```

Adds a history row with `from_status = to_status = current`. `is_internal: true` hides the
remark from citizens and the public timeline. Response `200` with detail.

### `POST /api/grievances/:id/escalate`

Role: `CMO_ADMIN`. Only for unresolved cases past their SLA.

```json
{ "remark": "Escalated due to repeated delay." }
```

Raises priority one level (`Low → Medium → High`; `High` stays `High`), sets `escalated_at`,
increments `escalation_count`, and writes a public history entry. Response `200` with detail.
Errors: `409` if resolved or still inside SLA (details include `sla_days`).

### `POST /api/grievances/:id/action-report`

Role: `DEPT_OFFICER` (assigned department). `multipart/form-data`.

| Field | Required | Rules |
| --- | --- | --- |
| `report` | yes | 20–5,000 chars |
| `report_file` | no | JPG/PNG/PDF, ≤5 MB, magic bytes checked; stored as `kind = action_report` |

The case must be `In Progress` and have an active assignment. Sets `report_status` to
`SUBMITTED`, `report_submitted_at`, clears any prior review fields, stores evidence and adds
a public history event. Response `200` with detail.

### `POST /api/grievances/:id/report-review`

Role: `CMO_ADMIN`. Requires an active assignment with `report_status = SUBMITTED`.

```json
{ "decision": "ACCEPT", "remark": "Report verified. Marking the grievance resolved." }
```

- `ACCEPT`: sets report `ACCEPTED`, status `Resolved`, `resolved_at = now()`, writes history.
- `SEND_BACK`: sets report `SENT_BACK`, keeps status `In Progress`, records the review remark
  and history. The officer can resubmit.

Response `200` with detail. Errors: `409` if not in progress or no submitted report.

### `POST /api/grievances/:id/feedback`

Role: `CITIZEN` (owner), status `Resolved`.

```json
{ "rating": 5, "comment": "Fast response and the repair was completed properly." }
```

One row per grievance; resubmission updates the rating/comment. Response `201` with detail
including `feedback`. Errors: `403` not owner, `409` not resolved, `422` rating outside 1–5.

### `POST /api/grievances/:id/reopen`

Role: `CITIZEN` (owner), status `Resolved`.

```json
{ "reason": "The pothole has reappeared after the first rain and is dangerous again." }
```

Sets status `Reopened`, clears `resolved_at`, deactivates the active assignment and adds a
public history entry. Response `200` with detail. Errors: `409` if not resolved.

### `PATCH /api/grievances/:id`

Role: `CMO_ADMIN`. Human override of advisory fields (never automatic).

```json
{ "category_id": 2, "department_id": 4, "priority": "High" }
```

Any subset is allowed; `department_id: null` clears the department. Category/department cannot
be changed once the case is `In Progress` or `Resolved` (`409`). Every change writes a history
row. Response `200` with detail.

### `GET /api/attachments/:id`

Authenticated. `?download=1` sets `Content-Disposition: attachment`; otherwise inline.
Authorised for the owning citizen, the CMO, or an officer of the assigned department when the
status is visible to officers. Response is the raw bytes with the stored MIME type,
`Content-Length`, `Cache-Control: private, max-age=60` and `X-Content-Type-Options: nosniff`.
Errors: `403`, `404`.

### `GET /api/users/officers?department_id=1`

Role: `CMO_ADMIN`. Returns active officers, optionally filtered by department:

```json
{
  "data": [
    { "id": 5, "name": "Suresh Kumar", "email": "officer.pwd@demo.test", "department_id": 1, "department_code": "PWD", "department_name": "Public Works Department" }
  ]
}
```

## 5. AI assistant

### `POST /api/ai/analyze`

Role: `CITIZEN`. Rate limited to 15 requests / 10 minutes / IP.

```json
{
  "description": "There is no drinking water supply in our ward for the last four days. The pipeline appears to be leaking near the temple.",
  "district": "Thrissur"
}
```

`description` 30–5,000 chars; `district` optional but enables duplicate lookup.

Response `200 OK` (Gemini available):

```json
{
  "data": {
    "category": { "id": 2, "name": "Drinking Water", "slug": "water" },
    "department": { "id": 5, "code": "WATER", "name": "Kerala Water Authority" },
    "department_code": "WATER",
    "priority": "High",
    "priority_reason": "A prolonged loss of drinking water affects health and daily life.",
    "summary": "Citizen reports a four-day drinking water outage and a suspected pipeline leak.",
    "language_detected": "en",
    "confidence": 0.91,
    "source": "gemini",
    "model": "gemini-2.5-flash",
    "fallback_reason": null,
    "duplicates": [
      { "id": 17, "ref_no": "CMK-2026-000017", "subject": "Water supply interrupted", "status": "In Progress", "similarity": 0.62, "created_at": "2026-10-30T09:00:00.000Z" }
    ]
  }
}
```

Fallback response (no key, timeout, quota, invalid model output) uses the same shape with:

```json
{
  "source": "fallback-keyword",
  "model": null,
  "fallback_reason": "no_api_key",
  "confidence": 0.4
}
```

The UI shows a visible **“Fallback (not AI)”** badge whenever `source` is not `gemini`.
The endpoint never changes a grievance and never exposes the API key. AI output is advisory
only. If the catalogue is unavailable the endpoint returns `503 AI_UNAVAILABLE`.

## 6. Statistics

### `GET /api/stats/cmo`

Role: `CMO_ADMIN`. All values are live SQL aggregates.

```json
{
  "data": {
    "counts": {
      "total": 40,
      "pending": 29,
      "resolved": 11,
      "overdue": 12,
      "submitted": 6,
      "under_review": 8,
      "in_progress": 11,
      "reopened": 4,
      "avg_resolution_days": 6.4
    },
    "by_district": [{ "name": "Ernakulam", "count": 6 }],
    "by_department": [{ "id": 1, "code": "PWD", "name": "Public Works Department", "count": 7 }],
    "by_status": [{ "name": "Submitted", "count": 6 }],
    "by_priority": [{ "name": "High", "count": 12 }],
    "by_category": [{ "id": 1, "name": "Roads & Potholes", "count": 8 }],
    "monthly_trend": [{ "month": "2026-06", "submitted": 4, "resolved": 2 }],
    "sla_days": { "High": 3, "Medium": 7, "Low": 15 },
    "as_of": "2026-11-11T10:00:00.000Z"
  }
}
```

## 7. Status code summary

| Code | Typical cause |
| --- | --- |
| 200 | Successful read/action |
| 201 | Registration, grievance creation, contact, feedback |
| 400 | Invalid upload content, invalid department/officer |
| 401 | Missing/expired session, bad login |
| 403 | Wrong role, not owner, wrong department |
| 404 | Unknown grievance/reference/attachment/route |
| 409 | Illegal workflow transition, duplicate email, missing report, escalation not allowed |
| 413 | Upload or body too large |
| 422 | Zod validation failure |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error (generic in production) |
| 503 | Health check DB down, AI catalogue unavailable |
