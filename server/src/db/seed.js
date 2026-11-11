/**
 * Fictional demo seed for the CM Kerala grievance portal.
 *
 * Everything in this file is invented for a recruitment prototype. Names,
 * emails, phone numbers, grievance texts and locations are fictional.
 *
 * Usage: npm run db:seed  (idempotent: truncates the demo tables first)
 */
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const config = require('../config');

const DISTRICTS = [
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

const DEPARTMENTS = [
  { code: 'PWD', name: 'Public Works Department', email: 'pwd@demo.test', description: 'Roads, bridges, public buildings and other public works.' },
  { code: 'HEALTH', name: 'Department of Health & Family Welfare', email: 'health@demo.test', description: 'Primary health centres, hospitals and public health services.' },
  { code: 'EDUCATION', name: 'Department of General Education', email: 'education@demo.test', description: 'Government schools, teacher deployment and school infrastructure.' },
  { code: 'KSEB', name: 'Kerala State Electricity Board', email: 'kseb@demo.test', description: 'Electricity distribution, street lighting and power supply.' },
  { code: 'WATER', name: 'Kerala Water Authority', email: 'water@demo.test', description: 'Drinking water supply, pipelines and public water connections.' },
  { code: 'LSG', name: 'Local Self Government Department', email: 'lsg@demo.test', description: 'Panchayats, municipalities and local civic services.' },
  { code: 'REVENUE', name: 'Department of Revenue', email: 'revenue@demo.test', description: 'Land records, tax receipts, certificates and revenue administration.' },
  { code: 'TRANSPORT', name: 'Motor Vehicles & Transport Department', email: 'transport@demo.test', description: 'Public transport, vehicle services and road safety.' },
  { code: 'POLICE', name: 'Police Department', email: 'police@demo.test', description: 'Law and order, public safety and traffic enforcement.' },
  { code: 'SOCIAL', name: 'Department of Social Justice', email: 'social@demo.test', description: 'Pensions, welfare schemes and social security services.' },
];

const CATEGORIES = [
  { slug: 'roads', name: 'Roads & Potholes', dept: 'PWD', description: 'Damaged roads, potholes, footpaths and road safety works.' },
  { slug: 'water', name: 'Drinking Water', dept: 'WATER', description: 'Water supply interruptions, pipeline leaks and new connections.' },
  { slug: 'electricity', name: 'Electricity Supply', dept: 'KSEB', description: 'Power outages, low voltage, transformers and billing issues.' },
  { slug: 'health', name: 'Public Health & Hospitals', dept: 'HEALTH', description: 'Hospital services, medicine availability and public health.' },
  { slug: 'education', name: 'School Education', dept: 'EDUCATION', description: 'Government school facilities, teachers and admissions.' },
  { slug: 'sanitation', name: 'Sanitation & Waste', dept: 'LSG', description: 'Garbage collection, drainage and public sanitation.' },
  { slug: 'revenue', name: 'Revenue Certificates & Land', dept: 'REVENUE', description: 'Land records, tax receipts, certificates and encroachment.' },
  { slug: 'transport', name: 'Public Transport', dept: 'TRANSPORT', description: 'Bus services, fare issues and transport infrastructure.' },
  { slug: 'police', name: 'Law & Order & Safety', dept: 'POLICE', description: 'Public safety, traffic and law-and-order concerns.' },
  { slug: 'social', name: 'Pensions & Social Welfare', dept: 'SOCIAL', description: 'Pension delays, welfare schemes and social security.' },
  { slug: 'streetlight', name: 'Street Lighting', dept: 'LSG', description: 'Non-functional street lights and dark public spaces.' },
  { slug: 'other', name: 'Other Civic Issues', dept: 'LSG', description: 'Other civic issues not covered by the categories above.' },
];

const OFFICERS = [
  { dept: 'PWD', name: 'Suresh Kumar', email: 'officer.pwd@demo.test' },
  { dept: 'HEALTH', name: 'Dr. Meera Pillai', email: 'officer.health@demo.test' },
  { dept: 'EDUCATION', name: 'Jayesh Thomas', email: 'officer.education@demo.test' },
  { dept: 'KSEB', name: 'Anilkumar V.', email: 'officer.kseb@demo.test' },
  { dept: 'WATER', name: 'Latha Krishnan', email: 'officer.water@demo.test' },
  { dept: 'LSG', name: 'Bindu S.', email: 'officer.lsg@demo.test' },
  { dept: 'REVENUE', name: 'Rajesh Nair', email: 'officer.revenue@demo.test' },
  { dept: 'TRANSPORT', name: 'Shaji M.', email: 'officer.transport@demo.test' },
  { dept: 'POLICE', name: 'Deepa Menon', email: 'officer.police@demo.test' },
  { dept: 'SOCIAL', name: 'Sreelatha P.', email: 'officer.social@demo.test' },
];

const CITIZENS = [
  { name: 'Aisha Rahman', email: 'citizen@demo.test', mobile: '9876500001' },
  { name: 'Ravi Menon', email: 'ravi.menon@demo.test', mobile: '9876500002' },
  { name: 'Fatima Noor', email: 'fatima.noor@demo.test', mobile: '9876500003' },
];

const TEMPLATES = [
  {
    category: 'roads',
    subject: 'Deep potholes on the main road near the bus stand',
    description:
      'Several deep potholes have formed on the main road near the bus stand. Two-wheelers are skidding during the rain and the morning school traffic is badly affected. The road has not been repaired for more than a year.',
    priority: 'High',
  },
  {
    category: 'streetlight',
    subject: 'Street lights not working in our colony',
    description:
      'The street lights in our residential colony have been switched off for the past three weeks. Women and elderly residents find it unsafe to walk after 6 pm. The local electric post is also leaning.',
    priority: 'Medium',
  },
  {
    category: 'water',
    subject: 'Drinking water supply interrupted for four days',
    description:
      'Our ward has not received drinking water through the pipeline for four days. We are buying bottled water and the overhead tank is empty. The water authority office has not given any timeline for restoration.',
    priority: 'High',
  },
  {
    category: 'electricity',
    subject: 'Low voltage damaging household appliances',
    description:
      'The electricity supply in our area has very low voltage in the evenings. Fans run slowly and the refrigerator compressor has failed twice this month. The transformer near the junction appears overloaded.',
    priority: 'Medium',
  },
  {
    category: 'health',
    subject: 'No doctor available at the primary health centre',
    description:
      'The primary health centre in our panchayat has had no doctor for the last two weeks. Patients are being sent to the district hospital twelve kilometres away. Elderly patients and pregnant women are suffering.',
    priority: 'High',
  },
  {
    category: 'education',
    subject: 'Damaged classrooms in the government school',
    description:
      'Two classrooms in the government higher secondary school have damaged roofs. During the monsoon, water enters the classrooms and students have to sit in the corridor. A repair estimate was submitted months ago.',
    priority: 'High',
  },
  {
    category: 'sanitation',
    subject: 'Garbage not collected from the market area',
    description:
      'Garbage has not been collected from the market area for more than ten days. Waste is piling up in the open and there is a strong smell. Stray dogs are scattering the waste across the road.',
    priority: 'High',
  },
  {
    category: 'revenue',
    subject: 'Delay in issuing the land tax receipt',
    description:
      'I applied for a land tax receipt at the village office three weeks ago. The application is still pending without any reason and I need the receipt for a bank loan. The office has not responded to my follow-ups.',
    priority: 'Low',
  },
  {
    category: 'transport',
    subject: 'Irregular bus service on the route to the taluk hospital',
    description:
      'The private bus service on the route to the taluk hospital is highly irregular. Buses are frequently cancelled and passengers wait for more than an hour. There is no information displayed at the bus stop.',
    priority: 'Medium',
  },
  {
    category: 'roads',
    subject: 'Unsafe and unmarked road junction',
    description:
      'The road junction near the higher secondary school has no proper markings or warning signs. Several accidents have happened in the past two months. A speed breaker and a zebra crossing are urgently needed.',
    priority: 'High',
  },
  {
    category: 'social',
    subject: 'Pension not credited for three months',
    description:
      'My mother has been receiving the state pension for several years. Her pension has not been credited for the last three months even though the biometric verification was completed. We are unable to follow up at the office.',
    priority: 'Medium',
  },
  {
    category: 'sanitation',
    subject: 'Drainage overflowing near the town market',
    description:
      'The open drain near the town market is overflowing and wastewater is entering the shops. Mosquitoes are breeding in the stagnant water. The drainage was last cleaned two years ago.',
    priority: 'High',
  },
  {
    category: 'water',
    subject: 'Delay in getting a new water connection',
    description:
      'I applied for a new domestic water connection six weeks ago and paid the required fee. No survey has been done and the connection is still pending. I have a young child at home and no alternative water source.',
    priority: 'Medium',
  },
  {
    category: 'electricity',
    subject: 'Electricity bill dispute after meter replacement',
    description:
      'My electricity bill doubled after the meter was replaced in March. The readings seem to be computed incorrectly and the bill shows an average charge I did not request. I need an inspection of the new meter.',
    priority: 'Low',
  },
  {
    category: 'health',
    subject: 'Essential medicines unavailable at the PHC pharmacy',
    description:
      'Common medicines for blood pressure and diabetes are out of stock at the primary health centre pharmacy for the last month. Patients are forced to buy expensive medicines from private shops despite having a health card.',
    priority: 'Medium',
  },
  {
    category: 'education',
    subject: 'Teacher shortage in a government upper primary school',
    description:
      'Two sanctioned teaching posts in our government upper primary school have been vacant since June. Classes for the upper primary students are being combined in one room. The parents association has submitted a request.',
    priority: 'Medium',
  },
  {
    category: 'revenue',
    subject: 'Encroachment on public land near the canal',
    description:
      'A temporary fence has been put up on public land next to the canal, blocking access to a common footpath. This has also narrowed the canal and could cause flooding during the monsoon season.',
    priority: 'Medium',
  },
  {
    category: 'transport',
    subject: 'Auto rickshaws overcharging passengers',
    description:
      'Auto rickshaws operating from the railway station are refusing the meter and overcharging passengers. There is no display of the complaint number at the stand. A visible meter enforcement drive is needed.',
    priority: 'Low',
  },
  {
    category: 'police',
    subject: 'Stray dog menace near the school and playground',
    description:
      'A large group of stray dogs is roaming near the school and playground. Two children were chased last week. The local authorities have not taken any action despite repeated complaints from residents.',
    priority: 'High',
  },
  {
    category: 'social',
    subject: 'Anganwadi centre needs basic facilities',
    description:
      'The anganwadi centre in our ward does not have drinking water, a working toilet or a proper kitchen. Children are being taught in a single room. The building was promised under the local development plan.',
    priority: 'Medium',
  },
  {
    category: 'water',
    subject: 'കുടിവെള്ളം ലഭ്യമല്ല, പൈപ്പ് ചോർന്നൊലിക്കുന്നു',
    description:
      'ഞങ്ങളുടെ വാർഡിൽ കഴിഞ്ഞ ഒരാഴ്ചയായി കുടിവെള്ളം ലഭ്യമല്ല. പ്രധാന പൈപ്പ് ചോർന്നൊലിക്കുന്നു, പലവട്ടം പരാതിപ്പെട്ടിട്ടും അറ്റകുറ്റപ്പണി നടന്നിട്ടില്ല. കുട്ടികൾക്കും പ്രായമായവർക്കും വലിയ ബുദ്ധിമുട്ടാണ്.',
    priority: 'High',
  },
  {
    category: 'roads',
    subject: 'Road damaged after monsoon rains',
    description:
      'The road connecting the village to the state highway was badly damaged after the monsoon rains. Large portions of the tar surface have washed away and the shoulder is caved in. Temporary repairs have not been done.',
    priority: 'High',
  },
  {
    category: 'roadlight',
    subject: 'New street light never switched on',
    description:
      'A new street light was installed on our road last month but it has never been switched on. The labour of the installation is complete but the connection is pending. The junction is dark from 6.30 pm onwards.',
    priority: 'Low',
  },
  {
    category: 'sanitation',
    subject: 'Waste dumped on vacant land beside the temple',
    description:
      'Unidentified persons are dumping household and hotel waste on the vacant land beside the temple. The panchayat has not removed the waste for two weeks. This is becoming a health hazard for nearby houses.',
    priority: 'High',
  },
];

const FEEDBACK_COMMENTS = {
  5: 'The grievance was resolved quickly and the officer kept us informed.',
  4: 'The issue was addressed after a follow-up. Thank you for the update.',
  3: 'The immediate problem was fixed but a permanent solution is still needed.',
  2: 'There was a long delay and the final response was not fully satisfactory.',
};

/** Deterministic PRNG so every seed run produces the same demo dataset. */
function mulberry32(seed) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261112);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const addHours = (date, hours) => new Date(date.getTime() + hours * 3600 * 1000);
const addDays = (date, days) => new Date(date.getTime() + days * 86400 * 1000);

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Build a tiny but structurally valid PDF entirely in memory. */
function buildDemoPdf(title, lines) {
  const content = [
    'BT',
    '/F1 16 Tf',
    '50 740 Td',
    `(${title.replace(/[()\\]/g, '')}) Tj`,
    '/F1 11 Tf',
    ...lines.map((line) => `0 -20 Td (${line.replace(/[()\\]/g, '')}) Tj`),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean slate (safe: this script is only for demo/test databases).
    await client.query(`
      TRUNCATE TABLE
        grievance_duplicates,
        citizen_feedback,
        attachments,
        department_assignments,
        grievance_history,
        grievances,
        contact_enquiries,
        ai_audit_logs,
        users,
        categories,
        departments
      RESTART IDENTITY CASCADE
    `);
    await client.query('ALTER SEQUENCE grievance_ref_seq RESTART WITH 1');

    // --- Departments -------------------------------------------------------
    const deptIds = {};
    for (const d of DEPARTMENTS) {
      const { rows } = await client.query(
        `INSERT INTO departments (code, name, short_description, contact_email)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [d.code, d.name, d.description, d.email],
      );
      deptIds[d.code] = rows[0].id;
    }

    // --- Categories --------------------------------------------------------
    const categoryIds = {};
    for (const c of CATEGORIES) {
      const { rows } = await client.query(
        `INSERT INTO categories (slug, name, description, default_department_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [c.slug, c.name, c.description, deptIds[c.dept]],
      );
      categoryIds[c.slug] = rows[0].id;
    }

    // --- Users -------------------------------------------------------------
    const passwordHash = await bcrypt.hash(config.demoPassword, 10);
    const insertUser = async (u) => {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, mobile, password_hash, role, department_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [u.name, u.email, u.mobile || null, passwordHash, u.role, u.departmentId || null],
      );
      return rows[0].id;
    };

    const cmoId = await insertUser({
      name: 'Ananya Nair',
      email: 'cmo@demo.test',
      mobile: '9876500010',
      role: 'CMO_ADMIN',
    });

    const officerIds = {};
    for (const o of OFFICERS) {
      officerIds[o.dept] = await insertUser({
        name: o.name,
        email: o.email,
        mobile: null,
        role: 'DEPT_OFFICER',
        departmentId: deptIds[o.dept],
      });
    }

    const citizenIds = [];
    for (const c of CITIZENS) {
      citizenIds.push(
        await insertUser({ ...c, role: 'CITIZEN', departmentId: null }),
      );
    }

    // --- Grievances --------------------------------------------------------
    // 40 demo grievances: 6 submitted, 8 under review, 11 in progress,
    // 11 resolved, 4 reopened.
    const statusPlan = [
      ...Array(6).fill('Submitted'),
      ...Array(8).fill('Under Review'),
      ...Array(11).fill('In Progress'),
      ...Array(11).fill('Resolved'),
      ...Array(4).fill('Reopened'),
    ];
    // Fisher-Yates with the deterministic rng.
    for (let i = statusPlan.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [statusPlan[i], statusPlan[j]] = [statusPlan[j], statusPlan[i]];
    }

    const now = Date.now();
    const insertedGrievances = [];

    for (let i = 0; i < config.seed.grievanceCount; i += 1) {
      const template = TEMPLATES[i % TEMPLATES.length];
      const categorySlug = template.category === 'roadlight' ? 'streetlight' : template.category;
      const category = CATEGORIES.find((c) => c.slug === categorySlug);
      const departmentId = deptIds[category.dept];
      const district = DISTRICTS[(i * 5 + 2) % DISTRICTS.length];
      const citizenIndex = i % citizenIds.length;
      const status = statusPlan[i];
      const priority = template.priority || 'Medium';

      // Age by status: keeps some unresolved grievances overdue (SLA days).
      const ageDays =
        status === 'Submitted'
          ? 1 + Math.floor(rng() * 5)
          : status === 'Under Review'
            ? 8 + Math.floor(rng() * 20)
            : status === 'In Progress'
              ? 10 + Math.floor(rng() * 40)
              : status === 'Resolved'
                ? 25 + Math.floor(rng() * 110)
                : 20 + Math.floor(rng() * 45);

      const createdAt = new Date(now - ageDays * 86400 * 1000 - Math.floor(rng() * 20) * 3600 * 1000);
      const locality = `Ward ${3 + ((i * 7) % 18)}, ${district}`;
      const description = `${template.description}\n\nLocation: ${locality}.`;
      const subject =
        i === 1
          ? 'Potholes on the road near the bus stand need urgent repair'
          : template.subject;

      const aiSummary = template.description.split('. ').slice(0, 2).join('. ').slice(0, 260);
      const aiSource = i % 4 === 0 ? 'gemini' : 'fallback-keyword';
      const aiAccepted = i % 5 !== 0;

      // Reference ID is generated by the DB sequence.
      const refRes = await client.query('SELECT generate_grievance_ref($1) AS ref', [createdAt]);
      const refNo = refRes.rows[0].ref;

      const resolvedAt = status === 'Resolved' ? addDays(createdAt, 3 + Math.floor(rng() * 5)) : null;

      const { rows: gRows } = await client.query(
        `INSERT INTO grievances
           (ref_no, citizen_id, district, category_id, department_id, subject, description,
            priority, status, ai_category, ai_department, ai_priority, ai_priority_reason,
            ai_summary, ai_language, ai_source, ai_confidence, ai_accepted, ai_analyzed_at,
            resolved_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING id`,
        [
          refNo,
          citizenIds[citizenIndex],
          district,
          categoryIds[categorySlug],
          ['Submitted'].includes(status) ? null : departmentId,
          subject,
          description,
          priority,
          status,
          category.name,
          category.dept,
          priority,
          priority === 'High' ? 'Safety risk or loss of an essential public service.' : 'Routine civic issue affecting local residents.',
          aiSummary,
          /[\u0D00-\u0D7F]/.test(description) ? 'ml' : 'en',
          aiSource,
          (0.55 + rng() * 0.4).toFixed(3),
          aiAccepted,
          createdAt,
          resolvedAt,
          createdAt,
          resolvedAt || addHours(createdAt, 8),
        ],
      );
      const grievanceId = gRows[0].id;
      insertedGrievances.push({ id: grievanceId, refNo, status, district, categorySlug, createdAt });

      // History timeline ---------------------------------------------------
      const h = [];
      h.push({ from: null, to: 'Submitted', by: citizenIds[citizenIndex], role: 'CITIZEN', remark: 'Grievance submitted through the citizen portal.', internal: false, at: createdAt });

      if (['Under Review', 'In Progress', 'Resolved', 'Reopened'].includes(status)) {
        h.push({ from: 'Submitted', to: 'Under Review', by: cmoId, role: 'CMO_ADMIN', remark: 'Received by the Chief Minister’s Office. Preliminary review initiated.', internal: false, at: addHours(createdAt, 5) });
      }

      let assignment = null;
      if (['In Progress', 'Resolved', 'Reopened'].includes(status)) {
        const reportSubmitted = status !== 'In Progress' || i % 3 !== 0;
        const reportStatus = status === 'In Progress' ? (reportSubmitted ? 'SUBMITTED' : 'PENDING') : 'ACCEPTED';
        const assignedAt = addHours(createdAt, 20);
        const reportAt = addDays(createdAt, 2 + (i % 3));
        const reviewAt = addDays(createdAt, 4 + (i % 3));

        const a = await client.query(
          `INSERT INTO department_assignments
             (grievance_id, department_id, officer_id, assigned_by, assigned_at,
              action_taken_report, report_submitted_at, report_status,
              report_reviewed_by, report_reviewed_at, review_remark, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            grievanceId,
            departmentId,
            officerIds[category.dept],
            cmoId,
            assignedAt,
            reportSubmitted
              ? `The department inspected the site and took the following action: ${template.subject.toLowerCase()}. Field verification was completed and the necessary work order has been issued. The local office will monitor the site for the next two weeks.`
              : null,
            reportSubmitted ? reportAt : null,
            reportStatus,
            reportStatus === 'ACCEPTED' ? cmoId : null,
            reportStatus === 'ACCEPTED' ? reviewAt : null,
            reportStatus === 'ACCEPTED' ? 'Action-taken report reviewed and accepted by the CMO.' : null,
            true,
          ],
        );
        assignment = a.rows[0].id;

        h.push({ from: 'Submitted', to: 'In Progress', by: cmoId, role: 'CMO_ADMIN', remark: `Forwarded to ${DEPARTMENTS.find((d) => d.code === category.dept).name} (${OFFICERS.find((o) => o.dept === category.dept).name}) for investigation.`, internal: false, at: assignedAt });

        if (reportSubmitted) {
          h.push({ from: 'In Progress', to: 'In Progress', by: officerIds[category.dept], role: 'DEPT_OFFICER', remark: 'Site inspected; action-taken report submitted to the CMO for review.', internal: false, at: reportAt });
        }
        if (status === 'In Progress' && i % 5 === 0) {
          h.push({ from: 'In Progress', to: 'In Progress', by: officerIds[category.dept], role: 'DEPT_OFFICER', remark: 'Internal note: field verification is pending with the assistant engineer. Follow-up scheduled next week.', internal: true, at: addHours(reportAt, 5) });
        }

        if (status === 'Resolved') {
          h.push({ from: 'In Progress', to: 'Resolved', by: cmoId, role: 'CMO_ADMIN', remark: 'Action-taken report satisfactory. Grievance closed. Citizen may share feedback or reopen if the issue persists.', internal: false, at: reviewAt });
        }
        if (status === 'Reopened') {
          h.push({ from: 'In Progress', to: 'Resolved', by: cmoId, role: 'CMO_ADMIN', remark: 'Action-taken report accepted and grievance marked resolved.', internal: false, at: reviewAt });
          h.push({ from: 'Resolved', to: 'Reopened', by: citizenIds[citizenIndex], role: 'CITIZEN', remark: 'Reopened by the citizen: the issue has started again after a few days. Requesting a permanent fix.', internal: false, at: addDays(reviewAt, 2) });
        }
      }

      if (i % 7 === 0 && status !== 'Resolved') {
        // A few unresolved grievances were escalated by the CMO.
        await client.query(
          `UPDATE grievances
              SET priority = CASE WHEN priority = 'Low' THEN 'Medium' WHEN priority = 'Medium' THEN 'High' ELSE 'High' END,
                  escalation_count = escalation_count + 1,
                  escalated_at = $2
            WHERE id = $1`,
          [grievanceId, addDays(createdAt, 6)],
        );
        h.push({ from: status, to: status, by: cmoId, role: 'CMO_ADMIN', remark: 'Escalated by the CMO due to SLA breach. Priority raised for immediate attention.', internal: false, at: addDays(createdAt, 6) });
      }

      for (const event of h) {
        await client.query(
          `INSERT INTO grievance_history
             (grievance_id, from_status, to_status, changed_by, changed_by_role, remark, is_internal, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [grievanceId, event.from, event.to, event.by, event.role, event.remark, event.internal, event.at],
        );
      }

      // Feedback on most resolved grievances --------------------------------
      if (status === 'Resolved' && i % 3 !== 0) {
        const rating = [5, 5, 4, 4, 3][i % 5];
        await client.query(
          `INSERT INTO citizen_feedback (grievance_id, citizen_id, rating, comment, created_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [grievanceId, citizenIds[citizenIndex], rating, FEEDBACK_COMMENTS[rating], addDays(resolvedAt, 1)],
        );
      }

      // Attachments on a handful of grievances -----------------------------
      if (i === 0) {
        const pdf = buildDemoPdf('Site inspection note (fictional)', [
          'This attachment is fictional demo data for a recruitment prototype.',
          `Reference: ${refNo}`,
          `District: ${district}`,
          'Photograph of the damaged road near the bus stand is not included.',
        ]);
        await client.query(
          `INSERT INTO attachments (grievance_id, uploaded_by, filename, mime, size, data, kind, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,'complaint',$7)`,
          [grievanceId, citizenIds[citizenIndex], 'road-damage-note.pdf', 'application/pdf', pdf.length, pdf, createdAt],
        );
        await client.query(
          `INSERT INTO attachments (grievance_id, uploaded_by, filename, mime, size, data, kind, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,'complaint',$7)`,
          [grievanceId, citizenIds[citizenIndex], 'site-photo.png', 'image/png', TINY_PNG.length, TINY_PNG, createdAt],
        );
      }
      if (assignment && status === 'Resolved' && i % 4 === 1) {
        const pdf = buildDemoPdf('Action-taken report (fictional)', [
          'Demo action-taken report for the recruitment prototype.',
          `Reference: ${refNo}`,
          'Work order issued and field verification completed.',
        ]);
        await client.query(
          `INSERT INTO attachments (grievance_id, uploaded_by, filename, mime, size, data, kind, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,'action_report',$7)`,
          [grievanceId, officerIds[category.dept], 'action-taken-report.pdf', 'application/pdf', pdf.length, pdf, addDays(resolvedAt, -2)],
        );
      }
    }

    // --- Related demo contact enquiries ------------------------------------
    await client.query(
      `INSERT INTO contact_enquiries (name, email, subject, message, created_at) VALUES
        ('Test User', 'test.user@demo.test', 'Question about tracking', 'How do I track a grievance without logging in?', now() - interval '2 days'),
        ('Priya S.', 'priya.s@demo.test', 'Feedback on the prototype', 'The portal is easy to use. Please add more languages.', now() - interval '5 days')`,
    );

    // --- Duplicate flags ---------------------------------------------------
    // Use pg_trgm to flag near-identical complaints in the same district and
    // category. Only pairs above 0.35 similarity are stored.
    await client.query(`
      INSERT INTO grievance_duplicates (grievance_id, duplicate_of_id, similarity)
      SELECT a.id, b.id, round(similarity(a.description, b.description)::numeric, 3)
      FROM grievances a
      JOIN grievances b
        ON b.id < a.id
       AND b.district = a.district
       AND b.category_id = a.category_id
      WHERE similarity(a.description, b.description) > 0.35
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');

    // Summary ---------------------------------------------------------------
    const counts = await client.query(`
      SELECT status, count(*)::int AS count FROM grievances GROUP BY status ORDER BY status
    `);
    const total = await client.query('SELECT count(*)::int AS c FROM grievances');
    // eslint-disable-next-line no-console
    console.log(`[seed] users=${CITIZENS.length + OFFICERS.length + 1}, grievances=${total.rows[0].c}`);
    // eslint-disable-next-line no-console
    console.log('[seed] status mix:', counts.rows.map((r) => `${r.status}=${r.count}`).join(', '));
    // eslint-disable-next-line no-console
    console.log(`[seed] demo password: ${config.demoPassword}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[seed] failed:', err.message);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seed };
