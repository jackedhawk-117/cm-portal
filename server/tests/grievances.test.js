const {
  app,
  request,
  login,
  getMeta,
  submitGrievance,
  ACCOUNTS,
  TINY_PNG,
} = require('./helpers');

let citizen;
let citizen2;
let cmo;
let categoryId;

beforeAll(async () => {
  citizen = await login(ACCOUNTS.citizen);
  citizen2 = await login(ACCOUNTS.citizen2);
  cmo = await login(ACCOUNTS.cmo);
  const meta = await getMeta();
  categoryId = meta.categories.find((c) => c.slug === 'roads')?.id || meta.categories[0].id;
  expect(categoryId).toBeDefined();
});

describe('Grievance creation', () => {
  test('creates a grievance with a generated reference and stores AI suggestions', async () => {
    const res = await submitGrievance(citizen, {
      category_id: categoryId,
      priority: 'High',
      ai_category: 'Roads & Potholes',
      ai_department: 'PWD',
      ai_priority: 'High',
      ai_priority_reason: 'Public safety risk on a busy road',
      ai_summary: 'Citizen reports damaged road surface near a busy junction.',
      ai_language: 'en',
      ai_source: 'fallback-keyword',
      ai_confidence: '0.4',
      ai_accepted: 'true',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.ref_no).toMatch(/^CMK-\d{4}-\d{6}$/);
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.category.id).toBe(categoryId);
    expect(res.body.data.priority).toBe('High');
    expect(res.body.data.ai.source).toBe('fallback-keyword');
    expect(res.body.data.ai.accepted).toBe(true);
    expect(res.body.data.timeline).toHaveLength(1);
    expect(res.body.data.timeline[0].to_status).toBe('Submitted');
  });

  test('rejects invalid input with a 422 and field details', async () => {
    const res = await citizen.post('/api/grievances').field('district', 'Atlantis');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  test('stores a valid PNG attachment and serves it only to authorised users', async () => {
    const created = await submitGrievance(
      citizen,
      { category_id: categoryId, subject: 'Attachment upload test near the market' },
      { buffer: TINY_PNG, filename: 'evidence.png', contentType: 'image/png' },
    );
    expect(created.status).toBe(201);
    expect(created.body.data.attachments).toHaveLength(1);
    const attachment = created.body.data.attachments[0];
    expect(attachment.mime).toBe('image/png');
    expect(attachment.size).toBe(TINY_PNG.length);

    const ownerDownload = await citizen.get(`/api/attachments/${attachment.id}`);
    expect(ownerDownload.status).toBe(200);
    expect(ownerDownload.headers['content-type']).toContain('image/png');

    const otherCitizen = await citizen2.get(`/api/attachments/${attachment.id}`);
    expect(otherCitizen.status).toBe(403);

    const cmoDownload = await cmo.get(`/api/attachments/${attachment.id}`);
    expect(cmoDownload.status).toBe(200);
  });

  test('rejects a file whose bytes do not match its declared type', async () => {
    const res = await submitGrievance(
      citizen,
      { category_id: categoryId, subject: 'Fake PDF upload attempt' },
      { buffer: Buffer.from('this is definitely not a pdf'), filename: 'fake.pdf', contentType: 'application/pdf' },
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE');
  });

  test('rejects an unsupported file type', async () => {
    const res = await submitGrievance(
      citizen,
      { category_id: categoryId, subject: 'Unsupported upload attempt' },
      { buffer: Buffer.from('plain text'), filename: 'note.txt', contentType: 'text/plain' },
    );
    expect(res.status).toBe(400);
  });
});

describe('Listing and detail access', () => {
  let grievance;

  beforeAll(async () => {
    const res = await submitGrievance(citizen, {
      category_id: categoryId,
      subject: 'Listed grievance for access control tests',
      description:
        'This is a detailed fictional complaint used to verify list and detail access control across roles.',
    });
    grievance = res.body.data;
  });

  test('citizen sees own grievances and a summary', async () => {
    const res = await citizen.get('/api/grievances?limit=50');
    expect(res.status).toBe(200);
    expect(res.body.data.some((g) => g.id === grievance.id)).toBe(true);
    expect(res.body.summary.total).toBeGreaterThan(0);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  test('another citizen cannot read the grievance or its history', async () => {
    const res = await citizen2.get(`/api/grievances/${grievance.id}`);
    expect(res.status).toBe(403);
  });

  test('CMO sees all fields and duplicate flags on detail', async () => {
    const res = await cmo.get(`/api/grievances/${grievance.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.citizen.email).toBe(ACCOUNTS.citizen);
    expect(Array.isArray(res.body.data.duplicates)).toBe(true);
    expect(res.body.data.available_actions).toContain('move_under_review');
  });

  test('tracking by reference exposes the public timeline but no personal data', async () => {
    const res = await request(app).get(`/api/track/${grievance.ref_no}`);
    expect(res.status).toBe(200);
    expect(res.body.data.ref_no).toBe(grievance.ref_no);
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.timeline.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toContain(ACCOUNTS.citizen);
    expect(res.body.data.citizen).toBeUndefined();
  });

  test('tracking an unknown reference returns 404', async () => {
    const res = await request(app).get('/api/track/CMK-2026-999999');
    expect(res.status).toBe(404);
  });

  test('tracking validates the reference format', async () => {
    const res = await request(app).get('/api/track/not-a-reference');
    expect(res.status).toBe(422);
  });
});

describe('AI assistant', () => {
  test('returns a labelled fallback suggestion when Gemini is unavailable', async () => {
    const res = await citizen.post('/api/ai/analyze').send({
      description:
        'There is no drinking water supply in our ward for the last four days. The pipeline appears to be leaking near the temple.',
      district: 'Thrissur',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('fallback-keyword');
    expect(res.body.data.category.name).toBeTruthy();
    expect(res.body.data.department_code).toBeTruthy();
    expect(['Low', 'Medium', 'High']).toContain(res.body.data.priority);
    expect(res.body.data.summary.length).toBeLessThanOrEqual(400);
    expect(typeof res.body.data.confidence).toBe('number');
    expect(Array.isArray(res.body.data.duplicates)).toBe(true);
  });

  test('supports Malayalam input and is restricted to citizens', async () => {
    const res = await citizen.post('/api/ai/analyze').send({
      description:
        'ഞങ്ങളുടെ തെരുവിൽ ഒരു ആഴ്ചയായി തെരുവുവിളക്ക് കത്തുന്നില്ല. രാത്രിയിൽ നടക്കാൻ വളരെ ബുദ്ധിമുട്ടാണ്.',
    });
    expect(res.status).toBe(200);
    expect(['ml', 'ml-en']).toContain(res.body.data.language_detected);

    const forbidden = await cmo.post('/api/ai/analyze').send({
      description: 'A sufficiently long description that would otherwise be valid input for analysis.',
    });
    expect(forbidden.status).toBe(403);
  });
});
