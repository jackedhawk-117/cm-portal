const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@12345';

const ACCOUNTS = {
  citizen: 'citizen@demo.test',
  citizen2: 'ravi.menon@demo.test',
  cmo: 'cmo@demo.test',
  officerPwd: 'officer.pwd@demo.test',
  officerHealth: 'officer.health@demo.test',
};

/** Log in and return a supertest agent that keeps the httpOnly cookie. */
async function login(email, password = DEMO_PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}

async function getMeta(agent = request(app)) {
  const [departments, categories] = await Promise.all([
    agent.get('/api/departments'),
    agent.get('/api/categories'),
  ]);
  return { departments: departments.body.data, categories: categories.body.data };
}

/**
 * Create a grievance as the given citizen agent.
 * Returns the supertest response.
 */
function submitGrievance(agent, fields = {}, attachment) {
  const payload = {
    district: 'Ernakulam',
    category_id: fields.category_id || 1,
    subject: fields.subject || 'Street light not working near the junction',
    description:
      fields.description ||
      'The street light near the bus stop has been dark for more than two weeks, making it unsafe for pedestrians at night.',
    priority: fields.priority || 'Medium',
    ...fields,
  };
  let req = agent.post('/api/grievances');
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') req = req.field(key, String(value));
  });
  if (attachment) {
    req = req.attach('attachment', attachment.buffer, {
      filename: attachment.filename,
      contentType: attachment.contentType,
    });
  }
  return req;
}

/** Minimal valid 1x1 PNG (signature + payload) for upload tests. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcS8AAAAASUVORK5CYII=',
  'base64',
);

module.exports = { app, request, login, getMeta, submitGrievance, ACCOUNTS, DEMO_PASSWORD, TINY_PNG };
