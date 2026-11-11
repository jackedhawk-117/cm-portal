# 07 – User Guide

> Recruitment prototype – fictional data only. Not affiliated with or endorsed by the
> Government of Kerala or the Chief Minister’s Office.
>
> Do not enter real personal data. Every department, case, name, remark and number in the demo
> database is fictional.

## 1. Getting started

Open the hosted URL (or <http://localhost:5173> locally). The amber banner at the top of every
page repeats the prototype disclaimer.

The public navigation is:

- **Home** – introduction, live sample statistics and featured departments.
- **About** – purpose, vision, mission and objectives.
- **How it works** – the six-step grievance workflow.
- **Departments** – the fictional department list.
- **FAQ** – answers about submitting, tracking, privacy, AI and reopening.
- **Contact** – send an enquiry (saved in the database).
- **Track grievance** – public status lookup by reference ID.
- **Login / Register** – citizen accounts. CMO and officer accounts are seeded.

Use the **Login** button to sign in. After signing in, the navbar shows a dashboard link and
a **Sign out** button.

### Demo accounts

All demo accounts use the password **`Demo@12345`**.

| Role | Email |
| --- | --- |
| Citizen | `citizen@demo.test` |
| CMO | `cmo@demo.test` |
| PWD officer | `officer.pwd@demo.test` |
| Health officer | `officer.health@demo.test` |
| Education officer | `officer.education@demo.test` |
| KSEB officer | `officer.kseb@demo.test` |
| Water officer | `officer.water@demo.test` |
| LSG officer | `officer.lsg@demo.test` |
| Revenue officer | `officer.revenue@demo.test` |
| Transport officer | `officer.transport@demo.test` |
| Police officer | `officer.police@demo.test` |
| Social Justice officer | `officer.social@demo.test` |

## 2. Citizen guide

### 2.1 Register and sign in

1. Click **Register** in the navbar.
2. Enter your name, email, mobile number and a password (at least 8 characters with a letter
   and a number).
3. Submit. You are signed in automatically and taken to your citizen dashboard.
4. Returning users click **Login** and enter email/password.

If registration fails, the form shows field-level messages (for example, an invalid mobile
number or an existing email).

### 2.2 Your dashboard

The citizen dashboard shows four counters for **your** cases:

- **Total** – all grievances you submitted.
- **Pending** – not yet Resolved.
- **Resolved** – closed by the CMO.
- **Overdue** – unresolved past the SLA for their priority.

Use the status tabs (All, Submitted, Under Review, In Progress, Resolved, Reopened) and the
search box (reference ID or subject) to narrow the list. Click a row/card to open the detail.

### 2.3 Submit a grievance

1. Click **New grievance** (or **Submit grievance** on the home page).
2. Select your **district** (all 14 Kerala districts are listed) and a **category**.
3. Enter a **subject** and a detailed **description** (minimum 30 characters).
4. Optionally attach one file: JPG, PNG or PDF, maximum 5 MB.
5. Click **Analyse with AI** (or let the debounced analysis run as you type). The suggestion
   card shows:
   - suggested **category** and **department**
   - suggested **priority** and reason
   - a short neutral **summary**
   - detected language and confidence
   - a badge: **Gemini AI** when the real model answered, or **Fallback (not AI)** when the
     keyword fallback was used
   - any potential **duplicate references** (advisory only)
6. Choose **Accept** to copy the suggestion into the form, or **Edit** to adjust category,
   department and priority yourself. You can also ignore it. The AI never submits for you and
   never changes the official fields without your choice.
7. Set/confirm the priority and submit. The success panel displays your reference ID in the
   format `CMK-2026-000123`. Copy it for tracking.

Rules enforced by the server: valid district, category, subject length, description length,
priority, and file type/size. Errors appear next to the field or in the action panel.

### 2.4 Track a grievance publicly

1. Click **Track grievance** in the navbar (no login required).
2. Enter the reference ID, e.g. `CMK-2026-000123`.
3. See the status, category, assigned department (if any), priority, SLA and the public
   timeline.

The public page deliberately **does not show** your name, email, mobile number, attachments or
internal CMO/officer remarks. It is safe to share the reference ID.

### 2.5 Open your grievance detail

From the dashboard, open a case to see:

- Reference, subject, full description, district, category, department, priority, status and
  dates.
- The AI advice that was stored at submission.
- **Public** history/timeline. Internal staff remarks are hidden.
- Attachments you uploaded (download or view).
- CMO/public remarks.
- Feedback you submitted, if any.

### 2.6 Feedback and reopening

When the status becomes **Resolved**, the detail page shows two options:

- **Give feedback** – choose 1–5 stars and an optional comment. You can update it later while
  the case remains resolved.
- **Reopen** – enter a reason of at least 10 characters. The status becomes **Reopened**, the
  previous assignment is closed, and the CMO is asked to review again. You cannot reopen a
  case that is not Resolved.

Reopening is for cases where the problem persists or the action was inadequate. Feedback and
reopening are both optional.

### 2.7 Attachment privacy

Your complaint attachment can be downloaded by you, the CMO, and the assigned department
officer only. Other citizens and unrelated departments receive an access-denied response.
Action-report evidence uploaded by the department is not shown to citizens.

## 3. CMO administrator guide

Sign in with `cmo@demo.test` to reach **CMO overview**.

### 3.1 Stat cards and charts

- **Total grievances** – all cases.
- **Pending** – not Resolved.
- **Resolved** – accepted reports.
- **Overdue (SLA)** – unresolved beyond 3/7/15 days for High/Medium/Low.
- Sub-counters show Submitted, Under review, In progress and Reopened.
- Charts: district-wise bar, department-wise workload, status distribution pie and a six-month
  submitted-vs-resolved trend. All values come from live SQL aggregates.

### 3.2 Queue, filters and pagination

Use the filter panel to combine district, category, status, priority, overdue-only, free-text
search (reference or subject) and sort (newest/oldest/priority). The table shows reference,
subject, district, department, priority, status, submission date and overdue badge. Use the
pagination controls at the bottom. **Reset** clears all filters.

### 3.3 Review a grievance

Open a case from the queue. The detail page shows:

- Full complaint fields, citizen contact (staff only), AI advice and its source.
- **Potential duplicates** with reference IDs and similarity scores. They are flags only;
  nothing is merged or rejected.
- Attachments (complaint and action-report evidence).
- Assignment/report status.
- Full history including internal notes.
- Action panels for the current status.

Actions:

| Action | When | Effect |
| --- | --- | --- |
| **Move to Under Review** | Submitted or Reopened | Status Under Review; history entry |
| **Assign department & officer** | Under Review or Reopened | Creates assignment, sets In Progress, notifies the department queue |
| **Override category/department/priority** | Before In Progress/Resolved | Updates official fields with a history entry |
| **Add remark** | Any status | Public or internal history note |
| **Escalate** | Overdue and not Resolved | Raises priority one level, increments escalation count |
| **Review report** | In Progress with a submitted report | Accept → Resolved; Send back → remains In Progress |

The CMO cannot resolve a case before the department has submitted an action-taken report.
Sending a report back records the review remark and keeps the case with the department.

### 3.4 Overdue and escalation

Overdue is calculated from the priority SLA. The queue can be filtered to overdue-only. Use
**Escalate** to raise priority and create a public audit entry; the escalation count is shown
on the detail. A case that is still inside its SLA cannot be escalated, and a resolved case
cannot be escalated.

### 3.5 Internal vs public remarks

- **Public remarks** appear in the citizen detail and on the public tracking page.
- **Internal remarks** are visible only to CMO and officers; they are never returned to
  citizens or public tracking.

Use internal notes for verification details and public remarks for information the citizen
should see.

## 4. Department officer guide

Sign in with an officer account, e.g. `officer.pwd@demo.test`, to reach the **Department queue**.

### 4.1 Scope

You see only grievances assigned to **your department** and in a visible status (`In Progress`,
`Resolved`, `Reopened`). Cases in other departments are not listed and cannot be opened even
by URL. New assignments appear as soon as the CMO forwards them.

The dashboard shows assigned cases, pending, resolved and overdue counters, plus quick counts
of reports awaiting CMO review and reports sent back.

### 4.2 Work a case

1. Filter by status/priority or search by reference/subject.
2. Open a case to read the complaint, citizen-provided attachment, AI advice, assignment and
   history.
3. Optionally click **Investigation started** to record an In Progress note (status stays In
   Progress).
4. Add **investigation remarks**. Choose public (visible to the citizen) or internal (staff
   only).
5. Enter the **action-taken report** (at least 20 characters). Optionally attach one JPG, PNG
   or PDF (max 5 MB).
6. Click **Submit to CMO for review**. The report status becomes `SUBMITTED`; the case remains
   In Progress until the CMO accepts it.
7. If the CMO sends it back, read the review remark, update the report/evidence and resubmit.
8. When the CMO accepts, the case becomes **Resolved** and leaves your active queue (it can
   still be viewed under the Resolved filter).

You cannot resolve a case yourself, change its priority/department, or act on another
department’s case. Illegal transitions return a clear conflict message.

## 5. Understanding statuses

| Status | Citizen meaning | Staff meaning |
| --- | --- | --- |
| **Submitted** | Received; waiting for CMO review | No department owner yet |
| **Under Review** | CMO is checking the details | Eligible for assignment |
| **In Progress** | A department is investigating | Officer must submit a report; CMO can review/send back |
| **Resolved** | CMO accepted the action-taken report | Citizen may give feedback or reopen |
| **Reopened** | Citizen is not satisfied | CMO must review again and may reassign |

Every change is visible in the timeline; internal notes are excluded from citizen/public views.

## 6. Accessibility and responsiveness

- Semantic headings, labels, table headers, `aria-*` attributes and a skip link are provided.
- All interactive controls are keyboard reachable; focus rings are visible.
- The layout is responsive: the dashboard navigation collapses on small screens and the
  grievance table becomes stacked cards.
- Status is never conveyed by colour alone; text badges are always present.
- Charts have textual titles/descriptions; the underlying numbers are also shown in stat cards
  and tables.
- Reduced-motion users get near-instant transitions (the app uses standard CSS, no autoplay).

## 7. Common questions

**Why does the AI badge say “Fallback (not AI)”?**
No Gemini key is configured, the quota was reached, the request timed out, or the model output
was invalid after one retry. The suggestion still works but is keyword-based and lower
confidence. This is clearly labelled and documented.

**Can the AI resolve my case?**
No. It only suggests category/department/priority/summary. A citizen chooses whether to accept
it, and the CMO/officer make every official decision.

**Why can’t I see my name on public tracking?**
Public tracking intentionally hides personal data. Only the reference, subject, district,
category, department, status, dates and public timeline are exposed.

**Why can’t I reopen my case?**
Reopening is allowed only after the CMO marks it Resolved. If it is still active, use the
timeline or contact the CMO through the portal.

**Why did my officer not see the case?**
Only the assigned department sees the case, and only after the CMO assignment. Check the
assigned department on the CMO detail page.

**Can I change my feedback?**
Yes, while the case is Resolved; submitting again updates the existing feedback.

**Is this a real government site?**
No. It is a recruitment prototype with fictional data, no official logos and no affiliation
with the Government of Kerala or the Chief Minister’s Office.
