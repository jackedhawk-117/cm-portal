export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
];

export const STATUSES = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Reopened'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const STATUS_STYLES = {
  Submitted: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  'Under Review': 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Reopened: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
};

export const PRIORITY_STYLES = {
  High: 'bg-rose-100 text-rose-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-slate-100 text-slate-600',
};

export const ROLE_LABELS = {
  CITIZEN: 'Citizen',
  CMO_ADMIN: 'CMO Office',
  DEPT_OFFICER: 'Department officer',
};

export const ROLE_DASHBOARD = {
  CITIZEN: '/citizen',
  CMO_ADMIN: '/cmo',
  DEPT_OFFICER: '/officer',
};

export const WORKFLOW_STEPS = [
  {
    title: 'Citizen submits',
    body: 'A registered citizen files a grievance with district, category, description and an optional JPG/PNG/PDF attachment.',
    status: 'Submitted',
  },
  {
    title: 'CMO reviews',
    body: 'The Chief Minister’s Office checks the details, AI suggestions and duplicate flags, then takes the case up for review.',
    status: 'Under Review',
  },
  {
    title: 'Forwarded to a department',
    body: 'The CMO assigns a department and a named officer. The department now owns the investigation.',
    status: 'In Progress',
  },
  {
    title: 'Officer investigates',
    body: 'The officer inspects the issue, records investigation notes and prepares an action-taken report with optional evidence.',
    status: 'In Progress',
  },
  {
    title: 'CMO reviews the report',
    body: 'The CMO either accepts the report and resolves the grievance, or sends it back for more work.',
    status: 'Resolved',
  },
  {
    title: 'Citizen responds',
    body: 'The citizen can rate the response, leave feedback, or reopen the grievance if the problem persists.',
    status: 'Reopened',
  },
];

export const FAQS = [
  {
    q: 'Who can submit a grievance on this portal?',
    a: 'Any registered citizen with an email address, mobile number and password can submit a grievance. Registration is free and takes less than a minute. This is a recruitment prototype, so please use fictional information only.',
  },
  {
    q: 'How do I track my grievance?',
    a: 'Every submission receives a reference ID in the format CMK-2026-000123. Enter it on the Track Grievance page to see the current status, assigned department and public timeline. You can also open the grievance from your citizen dashboard.',
  },
  {
    q: 'What file types and sizes are accepted?',
    a: 'You may attach one JPG, PNG or PDF file of up to 5 MB to your grievance. Attachments are stored securely in the database and can only be downloaded by the citizen, the CMO and the assigned department.',
  },
  {
    q: 'What does the AI assistant do?',
    a: 'The assistant reads your description and suggests a category, department, priority and a short neutral summary. It is advisory only: you decide whether to accept or edit the suggestion, and a human officer always makes the official decision. If the AI service is unavailable, the portal uses a clearly labelled keyword fallback.',
  },
  {
    q: 'How is my personal data protected?',
    a: 'Your name, email and mobile number are never shown on the public tracking page. Public tracking only reveals the status, category, assigned department and timeline remarks. Internal notes are hidden from citizens.',
  },
  {
    q: 'What are the service-level deadlines?',
    a: 'Unresolved grievances become overdue after 3 days for High priority, 7 days for Medium and 15 days for Low. The CMO dashboard highlights overdue cases and allows the CMO to escalate them and raise their priority.',
  },
  {
    q: 'What happens after the CMO forwards my grievance?',
    a: 'The assigned department officer investigates the issue, adds notes and submits an action-taken report. The CMO reviews that report and either resolves the grievance or sends it back to the department for further action.',
  },
  {
    q: 'Can I reopen a resolved grievance?',
    a: 'Yes. Once a grievance is marked Resolved, you can either submit feedback (1–5 rating and an optional comment) or reopen it with a reason. Reopened cases return to the CMO for review.',
  },
  {
    q: 'Will I be notified when the status changes?',
    a: 'This prototype shows every update on the grievance timeline and dashboard. Email/SMS notifications are not enabled in this recruitment build; they are listed as a future enhancement.',
  },
  {
    q: 'Is this an official Kerala government website?',
    a: 'No. This is a recruitment prototype created for a machine test. All departments, officers, grievances and statistics are fictional, and the portal is not affiliated with or endorsed by the Government of Kerala or the Chief Minister’s Office.',
  },
];
