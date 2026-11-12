const { app, request, ACCOUNTS } = require('./helpers');

let uniqueEmail;

beforeAll(() => {
  uniqueEmail = `test.citizen.${Date.now()}@example.test`;
});

describe('Auth API', () => {
  test('GET /api/health reports a healthy database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
  });

  test('registers a citizen, sets an httpOnly cookie and returns /me', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({
      name: 'Test Citizen',
      email: uniqueEmail,
      mobile: '9876512345',
      password: 'TestPass123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: uniqueEmail, role: 'CITIZEN' });
    expect(res.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(uniqueEmail);
    expect(me.body.data.password_hash).toBeUndefined();
  });

  test('registers a citizen with mobile only (no email) and signs in with mobile', async () => {
    const mobileNo = `98765${Math.floor(10000 + Math.random() * 90000)}`;
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({
      name: 'Mobile Citizen',
      mobile: mobileNo,
      password: 'TestPass123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBeNull();
    expect(res.body.data.role).toBe('CITIZEN');

    // Sign in using mobile number as the identifier
    const loginRes = await agent.post('/api/auth/login').send({
      identifier: mobileNo,
      password: 'TestPass123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.name).toBe('Mobile Citizen');
  });

  test('rejects a duplicate mobile number with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Mobile',
      email: `diff.${Date.now()}@example.test`,
      mobile: '9876512345',
      password: 'TestPass123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('sends OTP, returns dev_otp and verifies OTP to authenticate citizen', async () => {
    const testMobile = `98470${Math.floor(10000 + Math.random() * 90000)}`;
    const sendRes = await request(app).post('/api/auth/otp/send').send({ mobile: testMobile });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.dev_otp).toMatch(/^\d{6}$/);

    const devOtp = sendRes.body.data.dev_otp;

    // Verify OTP and auto-register new citizen
    const agent = request.agent(app);
    const verifyRes = await agent.post('/api/auth/otp/verify').send({
      mobile: testMobile,
      otp: devOtp,
      name: 'OTP Verified Citizen',
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.name).toBe('OTP Verified Citizen');
    expect(verifyRes.body.data.role).toBe('CITIZEN');
    expect(verifyRes.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);

    // Verify session is active
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe('OTP Verified Citizen');
  });

  test('rejects invalid OTP with 401', async () => {
    const testMobile = '9876500001';
    await request(app).post('/api/auth/otp/send').send({ mobile: testMobile });

    const badVerify = await request(app).post('/api/auth/otp/verify').send({
      mobile: testMobile,
      otp: '000000',
    });
    expect(badVerify.status).toBe(401);
    expect(badVerify.body.error.code).toBe('INVALID_OTP');
  });

  test('prompts for citizen name if mobile number is non-existent in database, then completes registration', async () => {
    const freshMobile = `98471${Math.floor(10000 + Math.random() * 90000)}`;
    const sendRes = await request(app).post('/api/auth/otp/send').send({ mobile: freshMobile });
    expect(sendRes.status).toBe(200);
    const devOtp = sendRes.body.data.dev_otp;

    // First verify without name: should detect number does not exist and ask for name
    const verifyRes = await request(app).post('/api/auth/otp/verify').send({
      mobile: freshMobile,
      otp: devOtp,
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.needs_name).toBe(true);
    expect(verifyRes.body.data.registration_token).toBeDefined();

    const regToken = verifyRes.body.data.registration_token;

    // Submit full name to complete registration
    const agent = request.agent(app);
    const completeRes = await agent.post('/api/auth/otp/complete-registration').send({
      registration_token: regToken,
      name: 'Anjali Nair',
    });
    expect(completeRes.status).toBe(201);
    expect(completeRes.body.data.name).toBe('Anjali Nair');
    expect(completeRes.body.data.role).toBe('CITIZEN');
    expect(completeRes.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);

    // Verify session
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe('Anjali Nair');
  });

  test('ignores a role supplied during registration (privilege escalation)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky User',
      email: `sneaky.${Date.now()}@example.test`,
      mobile: '9876512346',
      password: 'TestPass123',
      role: 'CMO_ADMIN',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('CITIZEN');
  });

  test('rejects a duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate User',
      email: uniqueEmail,
      mobile: '9876512347',
      password: 'TestPass123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('validates weak passwords and invalid mobile numbers', async () => {
    const weak = await request(app).post('/api/auth/register').send({
      name: 'Weak User',
      email: 'weak@example.test',
      mobile: '9876512348',
      password: 'short',
    });
    expect(weak.status).toBe(422);
    expect(weak.body.error.details.some((d) => d.path === 'password')).toBe(true);

    const badMobile = await request(app).post('/api/auth/register').send({
      name: 'Bad Mobile',
      email: 'badmobile@example.test',
      mobile: '12345',
      password: 'TestPass123',
    });
    expect(badMobile.status).toBe(422);
    expect(badMobile.body.error.details.some((d) => d.path === 'mobile')).toBe(true);
  });

  test('rejects wrong credentials with 401 and accepts demo credentials', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: ACCOUNTS.citizen, password: 'WrongPass123' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');

    const good = await request(app)
      .post('/api/auth/login')
      .send({ email: ACCOUNTS.citizen, password: 'Demo@12345' });
    expect(good.status).toBe(200);
    expect(good.body.data.role).toBe('CITIZEN');
  });

  test('protects private routes without a session', async () => {
    const res = await request(app).get('/api/grievances');
    expect(res.status).toBe(401);
    const me = await request(app).get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  test('logout clears the session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: ACCOUNTS.citizen, password: 'Demo@12345' });
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});

describe('RBAC', () => {
  test('citizens cannot access CMO statistics or officer listings', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: ACCOUNTS.citizen, password: 'Demo@12345' });

    const stats = await agent.get('/api/stats/cmo');
    expect(stats.status).toBe(403);

    const officers = await agent.get('/api/users/officers');
    expect(officers.status).toBe(403);
  });

  test('officers cannot access CMO statistics', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: ACCOUNTS.officerPwd, password: 'Demo@12345' });
    const stats = await agent.get('/api/stats/cmo');
    expect(stats.status).toBe(403);
  });

  test('CMO can access statistics but not submit citizen grievances', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: ACCOUNTS.cmo, password: 'Demo@12345' });

    const stats = await agent.get('/api/stats/cmo');
    expect(stats.status).toBe(200);
    expect(stats.body.data.counts.total).toBeGreaterThan(0);

    const submission = await agent.post('/api/grievances').field('district', 'Ernakulam');
    expect(submission.status).toBe(403);
  });
});
