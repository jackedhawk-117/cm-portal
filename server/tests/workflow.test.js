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
let officerPwd;
let officerHealth;
let cmo;
let pwdDepartment;
let pwdOfficer;
let categoryId;

beforeAll(async () => {
  [citizen, officerPwd, officerHealth, cmo] = await Promise.all([
    login(ACCOUNTS.citizen),
    login(ACCOUNTS.officerPwd),
    login(ACCOUNTS.officerHealth),
    login(ACCOUNTS.cmo),
  ]);
  const meta = await getMeta();
  pwdDepartment = meta.departments.find((d) => d.code === 'PWD');
  categoryId = meta.categories.find((c) => c.slug === 'roads')?.id || meta.categories[0].id;
  const officers = await cmo.get(`/api/users/officers?department_id=${pwdDepartment.id}`);
  expect(officers.status).toBe(200);
  pwdOfficer = officers.body.data[0];
  expect(pwdOfficer.department_code).toBe('PWD');
});

describe('Workflow transitions', () => {
  let id;
  let refNo;

  test('creates a fresh grievance for the workflow walkthrough', async () => {
    const res = await submitGrievance(citizen, {
      category_id: categoryId,
      subject: 'Workflow walkthrough grievance for road repairs',
      description:
        'A large pothole has formed near the school gate and two-wheelers are swerving into traffic every morning.',
    });
    expect(res.status).toBe(201);
    id = res.body.data.id;
    refNo = res.body.data.ref_no;
    expect(res.body.data.status).toBe('Submitted');
  });

  test('rejects assignment before CMO review with 409', async () => {
    const res = await cmo.post(`/api/grievances/${id}/assign`).send({
      department_id: pwdDepartment.id,
      officer_id: pwdOfficer.id,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('CMO moves the grievance to Under Review', async () => {
    const res = await cmo
      .patch(`/api/grievances/${id}/status`)
      .send({ status: 'Under Review', remark: 'Taken up by the CMO for verification.' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Under Review');
  });

  test('CMO assigns a department and named officer, moving to In Progress', async () => {
    const res = await cmo.post(`/api/grievances/${id}/assign`).send({
      department_id: pwdDepartment.id,
      officer_id: pwdOfficer.id,
      remark: 'Forwarded to PWD for inspection and repair.',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('In Progress');
    expect(res.body.data.department.code).toBe('PWD');
    expect(res.body.data.assignment.officer.id).toBe(pwdOfficer.id);
    expect(res.body.data.assignment.report_status).toBe('PENDING');
  });

  test('only the assigned department officer can view the case', async () => {
    const allowed = await officerPwd.get(`/api/grievances/${id}`);
    expect(allowed.status).toBe(200);

    const denied = await officerHealth.get(`/api/grievances/${id}`);
    expect(denied.status).toBe(403);
  });

  test('officers cannot resolve a case directly (409), and CMO cannot resolve without a report', async () => {
    const officerAttempt = await officerPwd
      .patch(`/api/grievances/${id}/status`)
      .send({ status: 'Resolved' });
    expect(officerAttempt.status).toBe(409);

    const cmoAttempt = await cmo
      .patch(`/api/grievances/${id}/status`)
      .send({ status: 'Resolved' });
    expect(cmoAttempt.status).toBe(409);
    expect(cmoAttempt.body.error.details?.code).toBe('REPORT_REQUIRED');
  });

  test('officer submits an action-taken report with evidence', async () => {
    const res = await officerPwd
      .post(`/api/grievances/${id}/action-report`)
      .field('report', 'The road was inspected and the pothole was filled with hot mix on the same day.')
      .attach('report_file', TINY_PNG, { filename: 'repair-photo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('In Progress');
    expect(res.body.data.assignment.report_status).toBe('SUBMITTED');
    expect(res.body.data.attachments.some((a) => a.kind === 'action_report')).toBe(true);
  });

  test('CMO sends the report back for revision, keeping In Progress', async () => {
    const res = await cmo.post(`/api/grievances/${id}/report-review`).send({
      decision: 'SEND_BACK',
      remark: 'Please add the measurement of the repaired area and a completion date.',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('In Progress');
    expect(res.body.data.assignment.report_status).toBe('SENT_BACK');
  });

  test('officer resubmits and CMO accepts, resolving the grievance', async () => {
    const resubmit = await officerPwd
      .post(`/api/grievances/${id}/action-report`)
      .field('report', 'The repair covers 12 square metres and was completed on 10 November 2026.');
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.data.assignment.report_status).toBe('SUBMITTED');

    const accepted = await cmo.post(`/api/grievances/${id}/report-review`).send({
      decision: 'ACCEPT',
      remark: 'Report verified. Marking the grievance resolved.',
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('Resolved');
    expect(accepted.body.data.resolved_at).toBeTruthy();
  });

  test('citizen submits feedback on the resolved grievance', async () => {
    const res = await citizen
      .post(`/api/grievances/${id}/feedback`)
      .send({ rating: 5, comment: 'Fast response and the repair was completed properly.' });
    expect(res.status).toBe(201);
    expect(res.body.data.feedback.rating).toBe(5);
  });

  test('citizen reopens the grievance with a reason', async () => {
    const res = await citizen.post(`/api/grievances/${id}/reopen`).send({
      reason: 'The pothole has reappeared after the first rain and is dangerous again.',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Reopened');
    expect(res.body.data.resolved_at).toBeNull();
  });

  test('CMO reviews the reopened grievance and can assign it again', async () => {
    const review = await cmo
      .patch(`/api/grievances/${id}/status`)
      .send({ status: 'Under Review' });
    expect(review.status).toBe(200);
    expect(review.body.data.status).toBe('Under Review');

    const assign = await cmo.post(`/api/grievances/${id}/assign`).send({
      department_id: pwdDepartment.id,
      officer_id: pwdOfficer.id,
      remark: 'Reassigned after citizen reopen.',
    });
    expect(assign.status).toBe(200);
    expect(assign.body.data.status).toBe('In Progress');
  });

  test('internal remarks are hidden from citizens but visible to the CMO', async () => {
    const remarkText = `Internal verification note ${Date.now()}`;
    const add = await cmo
      .post(`/api/grievances/${id}/remarks`)
      .send({ remark: remarkText, is_internal: true });
    expect(add.status).toBe(200);

    const cmoDetail = await cmo.get(`/api/grievances/${id}`);
    expect(cmoDetail.body.data.timeline.some((h) => h.remark === remarkText)).toBe(true);

    const citizenDetail = await citizen.get(`/api/grievances/${id}`);
    expect(citizenDetail.body.data.timeline.some((h) => h.remark === remarkText)).toBe(false);
    expect(citizenDetail.body.data.available_actions).not.toContain('remark');
  });

  test('status history records every transition', async () => {
    const res = await cmo.get(`/api/grievances/${id}`);
    const transitions = res.body.data.timeline.map((h) => `${h.from_status || 'null'}->${h.to_status}`);
    expect(transitions).toEqual(
      expect.arrayContaining([
        'null->Submitted',
        'Submitted->Under Review',
        'Under Review->In Progress',
        'In Progress->In Progress',
        'In Progress->Resolved',
        'Resolved->Reopened',
        'Reopened->Under Review',
      ]),
    );
  });

  test('citizen cannot reopen a grievance that is not resolved', async () => {
    const res = await citizen.post(`/api/grievances/${id}/reopen`).send({
      reason: 'Trying to reopen an already active grievance should fail clearly.',
    });
    expect(res.status).toBe(409);
  });
});

describe('SLA escalation', () => {
  test('CMO can escalate an overdue grievance and priority is raised', async () => {
    const list = await cmo.get('/api/grievances?overdue=true&limit=20&sort=oldest');
    expect(list.status).toBe(200);
    const target = list.body.data.find((g) => g.status !== 'Resolved');
    expect(target).toBeDefined();

    const before = await cmo.get(`/api/grievances/${target.id}`);
    const beforeCount = before.body.data.escalation_count;

    const res = await cmo.post(`/api/grievances/${target.id}/escalate`).send({
      remark: 'Escalated during automated workflow test.',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.escalation_count).toBe(beforeCount + 1);
    expect(['Low', 'Medium', 'High']).toContain(res.body.data.priority);
  });

  test('a non-overdue grievance cannot be escalated', async () => {
    const created = await submitGrievance(citizen, {
      category_id: categoryId,
      subject: 'Fresh grievance that is inside its SLA window',
      description:
        'This fictional complaint was created moments ago, so it is well inside the service level window.',
    });
    const res = await cmo.post(`/api/grievances/${created.body.data.id}/escalate`).send({});
    expect(res.status).toBe(409);
  });
});
