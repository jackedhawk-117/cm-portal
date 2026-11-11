const { query, withTransaction } = require('../db/pool');
const {
  badRequest,
  forbidden,
  notFound,
  conflict,
} = require('../utils/AppError');
const { overdueSql, slaDaysFor } = require('../utils/sla');
const { findDuplicates, recordDuplicateFlags } = require('./duplicate.service');
const { canTransition, ASSIGNABLE_STATUSES } = require('./workflow.service');

const OVERDUE = overdueSql('g');
const VIEWABLE_OFFICER_STATUSES = ['In Progress', 'Resolved', 'Reopened'];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------
const LIST_SELECT = `
  SELECT g.id, g.ref_no, g.subject, g.district, g.priority, g.status,
         g.category_id, c.name AS category_name, c.slug AS category_slug,
         g.department_id, d.name AS department_name, d.code AS department_code,
         g.ai_accepted, g.created_at, g.updated_at, g.resolved_at,
         g.escalation_count,
         ${OVERDUE} AS is_overdue,
         u.name AS citizen_name,
         (SELECT a.report_status FROM department_assignments a
           WHERE a.grievance_id = g.id AND a.is_active) AS report_status,
         (SELECT f.rating FROM citizen_feedback f WHERE f.grievance_id = g.id) AS feedback_rating,
         (SELECT count(*)::int FROM attachments at WHERE at.grievance_id = g.id) AS attachment_count
    FROM grievances g
    JOIN categories c ON c.id = g.category_id
    LEFT JOIN departments d ON d.id = g.department_id
    JOIN users u ON u.id = g.citizen_id
`;

function roleScope(user, conditions, params) {
  if (user.role === 'CITIZEN') {
    params.push(user.id);
    conditions.push(`g.citizen_id = $${params.length}`);
  } else if (user.role === 'DEPT_OFFICER') {
    params.push(user.department_id);
    conditions.push(
      `g.department_id = $${params.length} AND g.status = ANY($${params.length + 1}::text[])`,
    );
    params.push(VIEWABLE_OFFICER_STATUSES);
  }
}

function canView(grievance, user) {
  if (user.role === 'CMO_ADMIN') return true;
  if (user.role === 'CITIZEN') return grievance.citizen_id === user.id;
  if (user.role === 'DEPT_OFFICER') {
    return (
      grievance.department_id === user.department_id &&
      VIEWABLE_OFFICER_STATUSES.includes(grievance.status)
    );
  }
  return false;
}

function assertOfficerScope(grievance, user) {
  if (grievance.department_id !== user.department_id) {
    throw forbidden('This grievance is not assigned to your department');
  }
}

function serializeBase(g, viewer) {
  const staff = viewer.role !== 'CITIZEN';
  const base = {
    id: g.id,
    ref_no: g.ref_no,
    district: g.district,
    subject: g.subject,
    description: g.description,
    category: { id: g.category_id, name: g.category_name, slug: g.category_slug },
    department: g.department_id
      ? { id: g.department_id, name: g.department_name, code: g.department_code }
      : null,
    priority: g.priority,
    status: g.status,
    is_overdue: Boolean(g.is_overdue),
    sla_days: slaDaysFor(g.priority),
    escalation_count: g.escalation_count,
    escalated_at: g.escalated_at,
    resolved_at: g.resolved_at,
    created_at: g.created_at,
    updated_at: g.updated_at,
    citizen: {
      id: g.citizen_id,
      name: g.citizen_name,
      email: g.citizen_email,
      mobile: g.citizen_mobile,
    },
    ai: {
      category: g.ai_category,
      department: g.ai_department,
      priority: g.ai_priority,
      priority_reason: g.ai_priority_reason,
      summary: g.ai_summary,
      language: g.ai_language,
      source: g.ai_source,
      confidence: g.ai_confidence === null ? null : Number(g.ai_confidence),
      accepted: g.ai_accepted,
      analyzed_at: g.ai_analyzed_at,
    },
  };
  if (staff) {
    base.citizen.email = g.citizen_email;
    base.citizen.mobile = g.citizen_mobile;
  }
  return base;
}

async function fetchRow(id, db = { query }) {
  const { rows } = await db.query(
    `SELECT g.*, ${OVERDUE} AS is_overdue,
            c.name AS category_name, c.slug AS category_slug,
            d.name AS department_name, d.code AS department_code,
            u.name AS citizen_name, u.email AS citizen_email, u.mobile AS citizen_mobile
       FROM grievances g
       JOIN categories c ON c.id = g.category_id
       LEFT JOIN departments d ON d.id = g.department_id
       JOIN users u ON u.id = g.citizen_id
      WHERE g.id = $1`,
    [id],
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------
async function listGrievances({ user, filters }) {
  const conditions = [];
  const params = [];
  roleScope(user, conditions, params);

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`g.status = $${params.length}`);
  }
  if (filters.district) {
    params.push(filters.district);
    conditions.push(`g.district = $${params.length}`);
  }
  if (filters.category_id) {
    params.push(filters.category_id);
    conditions.push(`g.category_id = $${params.length}`);
  }
  if (filters.department_id) {
    params.push(filters.department_id);
    conditions.push(`g.department_id = $${params.length}`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`g.priority = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(g.ref_no ILIKE $${params.length} OR g.subject ILIKE $${params.length})`);
  }
  if (filters.overdue === 'true') conditions.push(OVERDUE);
  if (filters.overdue === 'false') conditions.push(`NOT ${OVERDUE}`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const order =
    filters.sort === 'oldest'
      ? 'g.created_at ASC'
      : filters.sort === 'priority'
        ? `CASE g.priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END DESC, g.created_at DESC`
        : 'g.created_at DESC';

  const countParams = [...params];
  const listParams = [...params, limit, offset];
  const [rows, count, summary] = await Promise.all([
    query(
      `${LIST_SELECT} ${where}
       ORDER BY ${order}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    ),
    query(`SELECT count(*)::int AS total FROM grievances g ${where}`, countParams),
    summaryFor(user),
  ]);

  const total = count.rows[0].total;
  return {
    data: rows.rows.map((row) => ({
      ...row,
      is_overdue: Boolean(row.is_overdue),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary,
  };
}

async function summaryFor(user) {
  const conditions = [];
  const params = [];
  roleScope(user, conditions, params);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE g.status <> 'Resolved')::int AS pending,
            count(*) FILTER (WHERE g.status = 'Resolved')::int AS resolved,
            count(*) FILTER (WHERE ${OVERDUE})::int AS overdue
       FROM grievances g ${where}`,
    params,
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------
async function getGrievanceDetail({ id, user }) {
  const row = await fetchRow(id);
  if (!row) throw notFound('Grievance not found');
  if (!canView(row, user)) throw forbidden('You do not have access to this grievance');

  const isCitizen = user.role === 'CITIZEN';
  const historyFilter = isCitizen ? 'AND h.is_internal = FALSE' : '';
  const attachmentFilter = isCitizen ? "AND a.kind = 'complaint'" : '';

  const [history, attachments, assignment, feedback, duplicates] = await Promise.all([
    query(
      `SELECT h.id, h.from_status, h.to_status, h.changed_by, h.changed_by_role,
              h.remark, h.is_internal, h.created_at, u.name AS changed_by_name
         FROM grievance_history h
         LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.grievance_id = $1 ${historyFilter}
        ORDER BY h.created_at ASC, h.id ASC`,
      [id],
    ),
    query(
      `SELECT a.id, a.filename, a.mime, a.size, a.kind, a.created_at,
              u.name AS uploaded_by_name
         FROM attachments a
         LEFT JOIN users u ON u.id = a.uploaded_by
        WHERE a.grievance_id = $1 ${attachmentFilter}
        ORDER BY a.created_at ASC`,
      [id],
    ),
    query(
      `SELECT a.id, a.department_id, d.name AS department_name, d.code AS department_code,
              a.officer_id, o.name AS officer_name, a.assigned_at,
              a.action_taken_report, a.report_submitted_at, a.report_status,
              a.report_reviewed_at, a.review_remark, a.is_active
         FROM department_assignments a
         JOIN departments d ON d.id = a.department_id
         JOIN users o ON o.id = a.officer_id
        WHERE a.grievance_id = $1 AND a.is_active
        ORDER BY a.assigned_at DESC
        LIMIT 1`,
      [id],
    ),
    query(
      `SELECT f.id, f.rating, f.comment, f.created_at
         FROM citizen_feedback f WHERE f.grievance_id = $1`,
      [id],
    ),
    query(
      `SELECT gd.similarity::float AS similarity, g2.id, g2.ref_no, g2.subject, g2.status, g2.created_at
         FROM grievance_duplicates gd
         JOIN grievances g2 ON g2.id = gd.duplicate_of_id
        WHERE gd.grievance_id = $1
        ORDER BY gd.similarity DESC
        LIMIT 5`,
      [id],
    ),
  ]);

  const base = serializeBase(row, user);
  const staff = !isCitizen;

  let assignmentData = null;
  if (assignment.rows.length) {
    const a = assignment.rows[0];
    assignmentData = {
      id: a.id,
      department: { id: a.department_id, name: a.department_name, code: a.department_code },
      officer: { id: a.officer_id, name: a.officer_name },
      assigned_at: a.assigned_at,
      report_submitted_at: a.report_submitted_at,
      report_status: a.report_status,
      report_reviewed_at: a.report_reviewed_at,
    };
    if (staff) {
      assignmentData.action_taken_report = a.action_taken_report;
      assignmentData.review_remark = a.review_remark;
      assignmentData.officer_name = a.officer_name;
    }
  }

  const detail = {
    ...base,
    timeline: history.rows.map((h) => ({
      id: h.id,
      from_status: h.from_status,
      to_status: h.to_status,
      remark: h.remark,
      is_internal: h.is_internal,
      changed_by_role: h.changed_by_role,
      changed_by_name: staff ? h.changed_by_name : null,
      created_at: h.created_at,
    })),
    attachments: attachments.rows,
    assignment: assignmentData,
    feedback: feedback.rows[0]
      ? {
          rating: feedback.rows[0].rating,
          comment: feedback.rows[0].comment,
          created_at: feedback.rows[0].created_at,
        }
      : null,
    duplicates: staff ? duplicates.rows : [],
    available_actions: availableActions(row, user),
  };
  return detail;
}

function availableActions(g, user) {
  const actions = [];
  if (user.role === 'CMO_ADMIN') {
    actions.push('override');
    if (['Submitted', 'Reopened'].includes(g.status)) actions.push('move_under_review');
    if (ASSIGNABLE_STATUSES.includes(g.status)) actions.push('assign');
    if (g.status === 'In Progress') actions.push('review_report');
    if (g.is_overdue && g.status !== 'Resolved') actions.push('escalate');
    actions.push('remark');
  } else if (user.role === 'DEPT_OFFICER' && g.department_id === user.department_id) {
    if (g.status === 'In Progress') {
      actions.push('start', 'report', 'remark');
    }
  } else if (user.role === 'CITIZEN' && g.citizen_id === user.id) {
    if (g.status === 'Resolved') actions.push('feedback', 'reopen');
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------
async function createGrievance({ user, body, file, assertFileSignature, safeFilename }) {
  if (file) assertFileSignature(file);

  const category = await query(
    'SELECT id, name FROM categories WHERE id = $1 AND is_active',
    [body.category_id],
  );
  if (!category.rows.length) throw badRequest('Select a valid category');

  const created = await withTransaction(async (client) => {
    const refRes = await client.query('SELECT generate_grievance_ref() AS ref');
    const refNo = refRes.rows[0].ref;
    const hasAi = Boolean(body.ai_source);

    const { rows } = await client.query(
      `INSERT INTO grievances
         (ref_no, citizen_id, district, category_id, department_id, subject, description,
          priority, status, ai_category, ai_department, ai_priority, ai_priority_reason,
          ai_summary, ai_language, ai_source, ai_confidence, ai_accepted, ai_analyzed_at)
       VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,'Submitted',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        refNo,
        user.id,
        body.district,
        body.category_id,
        body.subject,
        body.description,
        body.priority,
        body.ai_category || null,
        body.ai_department || null,
        body.ai_priority || null,
        body.ai_priority_reason || null,
        body.ai_summary || null,
        body.ai_language || null,
        body.ai_source || null,
        body.ai_confidence ?? null,
        Boolean(body.ai_accepted),
        hasAi ? new Date() : null,
      ],
    );
    const grievanceId = rows[0].id;

    if (file) {
      await client.query(
        `INSERT INTO attachments (grievance_id, uploaded_by, filename, mime, size, data, kind)
         VALUES ($1,$2,$3,$4,$5,$6,'complaint')`,
        [
          grievanceId,
          user.id,
          safeFilename(file.originalname),
          file.mimetype,
          file.size,
          file.buffer,
        ],
      );
    }

    await client.query(
      `INSERT INTO grievance_history
         (grievance_id, from_status, to_status, changed_by, changed_by_role, remark, is_internal)
       VALUES ($1, NULL, 'Submitted', $2, 'CITIZEN', $3, FALSE)`,
      [
        grievanceId,
        user.id,
        `Grievance submitted through the citizen portal${
          body.ai_accepted ? ' with AI-assisted suggestions accepted by the citizen' : ''
        }.`,
      ],
    );

    // Duplicate flags are advisory; they never block or merge a complaint.
    const duplicates = await findDuplicates({
      description: body.description,
      district: body.district,
      categoryId: body.category_id,
      excludeId: grievanceId,
      db: client,
    });
    await recordDuplicateFlags(client, grievanceId, duplicates);

    return { grievanceId, refNo };
  });

  const detail = await getGrievanceDetail({ id: created.grievanceId, user });
  return { ...detail, duplicates: detail.duplicates, ref_no: created.refNo };
}

// ---------------------------------------------------------------------------
// Workflow mutations
// ---------------------------------------------------------------------------
async function lockGrievance(client, id) {
  const { rows } = await client.query(
    `SELECT g.*, ${OVERDUE} AS is_overdue
       FROM grievances g WHERE g.id = $1 FOR UPDATE OF g`,
    [id],
  );
  if (!rows.length) throw notFound('Grievance not found');
  return rows[0];
}

async function addHistory(db, { grievanceId, from, to, userId, role, remark, isInternal = false }) {
  await db.query(
    `INSERT INTO grievance_history
       (grievance_id, from_status, to_status, changed_by, changed_by_role, remark, is_internal)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [grievanceId, from, to, userId, role, remark || null, isInternal],
  );
}

async function updateStatus({ id, user, status, remark, isInternal }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);

    if (user.role === 'DEPT_OFFICER') {
      assertOfficerScope(g, user);
    }
    if (!canTransition(g.status, status, user.role)) {
      throw conflict(
        `Cannot move a grievance from "${g.status}" to "${status}" as ${user.role.replace('_', ' ').toLowerCase()}.`,
        {
          from: g.status,
          to: status,
          role: user.role,
          hint:
            g.status === 'Submitted' && user.role === 'CMO_ADMIN'
              ? 'Review the grievance first.'
              : undefined,
        },
      );
    }

    if (status === 'Resolved') {
      const { rows } = await client.query(
        `SELECT id, report_status FROM department_assignments
          WHERE grievance_id = $1 AND is_active FOR UPDATE`,
        [id],
      );
      if (!rows.length || !['SUBMITTED', 'ACCEPTED'].includes(rows[0].report_status)) {
        throw conflict(
          'The action-taken report must be submitted by the department before the grievance can be resolved.',
          { code: 'REPORT_REQUIRED' },
        );
      }
      await client.query(
        `UPDATE department_assignments
            SET report_status = 'ACCEPTED', report_reviewed_by = $1, report_reviewed_at = now()
          WHERE id = $2`,
        [user.id, rows[0].id],
      );
      await client.query(
        `UPDATE grievances SET status = $1, resolved_at = now() WHERE id = $2`,
        [status, id],
      );
    } else {
      await client.query('UPDATE grievances SET status = $1 WHERE id = $2', [status, id]);
    }

    await addHistory(client, {
      grievanceId: id,
      from: g.status,
      to: status,
      userId: user.id,
      role: user.role,
      remark:
        remark ||
        (status === 'Under Review'
          ? 'Grievance taken up for review by the Chief Minister’s Office.'
          : status === 'Resolved'
            ? 'Action-taken report reviewed. Grievance marked resolved by the CMO.'
            : 'Investigation started by the department officer.'),
      isInternal: Boolean(isInternal),
    });
  });
  return getGrievanceDetail({ id, user });
}

async function assignGrievance({ id, user, departmentId, officerId, remark }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    if (!ASSIGNABLE_STATUSES.includes(g.status)) {
      throw conflict(
        `Grievances can only be assigned after CMO review (current status: ${g.status}). Move it to Under Review first.`,
        { from: g.status, allowed_from: ASSIGNABLE_STATUSES },
      );
    }
    const dept = await client.query(
      'SELECT id, name, code FROM departments WHERE id = $1 AND is_active',
      [departmentId],
    );
    if (!dept.rows.length) throw badRequest('Select a valid department');
    const officer = await client.query(
      `SELECT id, name, department_id FROM users
        WHERE id = $1 AND role = 'DEPT_OFFICER' AND is_active`,
      [officerId],
    );
    if (!officer.rows.length) throw badRequest('Select a valid department officer');
    if (officer.rows[0].department_id !== Number(departmentId)) {
      throw badRequest('The selected officer does not belong to the selected department');
    }

    await client.query(
      'UPDATE department_assignments SET is_active = FALSE WHERE grievance_id = $1 AND is_active',
      [id],
    );
    await client.query(
      `INSERT INTO department_assignments (grievance_id, department_id, officer_id, assigned_by)
       VALUES ($1,$2,$3,$4)`,
      [id, departmentId, officerId, user.id],
    );
    await client.query(
      'UPDATE grievances SET department_id = $1, status = $2 WHERE id = $3',
      [departmentId, 'In Progress', id],
    );
    await addHistory(client, {
      grievanceId: id,
      from: g.status,
      to: 'In Progress',
      userId: user.id,
      role: user.role,
      remark:
        remark ||
        `Forwarded to ${dept.rows[0].name} for investigation. Assigned officer: ${officer.rows[0].name}.`,
      isInternal: false,
    });
  });
  return getGrievanceDetail({ id, user });
}

async function addRemark({ id, user, remark, isInternal }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    if (user.role === 'DEPT_OFFICER') assertOfficerScope(g, user);
    await addHistory(client, {
      grievanceId: id,
      from: g.status,
      to: g.status,
      userId: user.id,
      role: user.role,
      remark,
      isInternal: Boolean(isInternal),
    });
  });
  return getGrievanceDetail({ id, user });
}

const PRIORITY_UP = { Low: 'Medium', Medium: 'High', High: 'High' };

async function escalateGrievance({ id, user, remark }) {
  let newPriority;
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    if (g.status === 'Resolved') throw conflict('A resolved grievance cannot be escalated');
    if (!g.is_overdue) {
      throw conflict('This grievance is within its SLA window and cannot be escalated yet', {
        sla_days: slaDaysFor(g.priority),
        created_at: g.created_at,
      });
    }
    newPriority = PRIORITY_UP[g.priority] || 'High';
    await client.query(
      `UPDATE grievances
          SET priority = $1, escalated_at = now(), escalation_count = escalation_count + 1
        WHERE id = $2`,
      [newPriority, id],
    );
    await addHistory(client, {
      grievanceId: id,
      from: g.status,
      to: g.status,
      userId: user.id,
      role: user.role,
      remark: `Escalated by the CMO due to an SLA breach. Priority raised from ${g.priority} to ${newPriority}.${
        remark ? ` ${remark}` : ''
      }`,
      isInternal: false,
    });
  });
  return getGrievanceDetail({ id, user });
}

async function submitActionReport({ id, user, report, file, assertFileSignature, safeFilename }) {
  if (file) assertFileSignature(file);
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    assertOfficerScope(g, user);
    if (g.status !== 'In Progress') {
      throw conflict('The action-taken report can only be submitted while the grievance is In Progress');
    }
    const { rows } = await client.query(
      `SELECT id FROM department_assignments
        WHERE grievance_id = $1 AND is_active FOR UPDATE`,
      [id],
    );
    if (!rows.length) {
      throw conflict('This grievance has no active department assignment');
    }
    await client.query(
      `UPDATE department_assignments
          SET action_taken_report = $1,
              report_submitted_at = now(),
              report_status = 'SUBMITTED',
              report_reviewed_by = NULL,
              report_reviewed_at = NULL,
              review_remark = NULL
        WHERE id = $2`,
      [report, rows[0].id],
    );
    if (file) {
      await client.query(
        `INSERT INTO attachments (grievance_id, uploaded_by, filename, mime, size, data, kind)
         VALUES ($1,$2,$3,$4,$5,$6,'action_report')`,
        [id, user.id, safeFilename(file.originalname), file.mimetype, file.size, file.buffer],
      );
    }
    await addHistory(client, {
      grievanceId: id,
      from: 'In Progress',
      to: 'In Progress',
      userId: user.id,
      role: user.role,
      remark: 'Action-taken report submitted to the CMO for review.',
      isInternal: false,
    });
  });
  return getGrievanceDetail({ id, user });
}

async function reviewReport({ id, user, decision, remark }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    if (g.status !== 'In Progress') {
      throw conflict('Only an in-progress grievance can have its report reviewed');
    }
    const { rows } = await client.query(
      `SELECT id, report_status FROM department_assignments
        WHERE grievance_id = $1 AND is_active FOR UPDATE`,
      [id],
    );
    if (!rows.length || rows[0].report_status !== 'SUBMITTED') {
      throw conflict('There is no submitted action-taken report to review');
    }
    if (decision === 'ACCEPT') {
      await client.query(
        `UPDATE department_assignments
            SET report_status = 'ACCEPTED', report_reviewed_by = $1,
                report_reviewed_at = now(), review_remark = $2
          WHERE id = $3`,
        [user.id, remark || null, rows[0].id],
      );
      await client.query(
        'UPDATE grievances SET status = $1, resolved_at = now() WHERE id = $2',
        ['Resolved', id],
      );
      await addHistory(client, {
        grievanceId: id,
        from: 'In Progress',
        to: 'Resolved',
        userId: user.id,
        role: user.role,
        remark:
          remark ||
          'Action-taken report reviewed and accepted. Grievance marked resolved by the CMO.',
        isInternal: false,
      });
    } else {
      await client.query(
        `UPDATE department_assignments
            SET report_status = 'SENT_BACK', report_reviewed_by = $1,
                report_reviewed_at = now(), review_remark = $2
          WHERE id = $3`,
        [user.id, remark || null, rows[0].id],
      );
      await addHistory(client, {
        grievanceId: id,
        from: 'In Progress',
        to: 'In Progress',
        userId: user.id,
        role: user.role,
        remark: `Action-taken report sent back to the department for revision.${
          remark ? ` ${remark}` : ''
        }`,
        isInternal: false,
      });
    }
  });
  return getGrievanceDetail({ id, user });
}

async function submitFeedback({ id, user, rating, comment }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    if (g.citizen_id !== user.id) throw forbidden('You can only give feedback on your own grievance');
    if (g.status !== 'Resolved') {
      throw conflict('Feedback can only be submitted after the grievance is Resolved');
    }
    await client.query(
      `INSERT INTO citizen_feedback (grievance_id, citizen_id, rating, comment)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (grievance_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment`,
      [id, user.id, rating, comment || null],
    );
  });
  return getGrievanceDetail({ id, user });
}

async function reopenGrievance({ id, user, reason }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    if (g.citizen_id !== user.id) throw forbidden('You can only reopen your own grievance');
    if (g.status !== 'Resolved') {
      throw conflict('Only a resolved grievance can be reopened');
    }
    await client.query(
      'UPDATE grievances SET status = $1, resolved_at = NULL WHERE id = $2',
      ['Reopened', id],
    );
    await client.query(
      'UPDATE department_assignments SET is_active = FALSE WHERE grievance_id = $1 AND is_active',
      [id],
    );
    await addHistory(client, {
      grievanceId: id,
      from: 'Resolved',
      to: 'Reopened',
      userId: user.id,
      role: user.role,
      remark: `Reopened by the citizen: ${reason}`,
      isInternal: false,
    });
  });
  return getGrievanceDetail({ id, user });
}

async function overrideGrievance({ id, user, categoryId, departmentId, priority }) {
  await withTransaction(async (client) => {
    const g = await lockGrievance(client, id);
    const lockedStatus = ['In Progress', 'Resolved'].includes(g.status);
    const changes = [];

    if (categoryId && Number(categoryId) !== g.category_id) {
      if (lockedStatus) {
        throw conflict('The category cannot be changed once the grievance is in progress');
      }
      const cat = await client.query(
        'SELECT id, name FROM categories WHERE id = $1 AND is_active',
        [categoryId],
      );
      if (!cat.rows.length) throw badRequest('Select a valid category');
      await client.query('UPDATE grievances SET category_id = $1 WHERE id = $2', [categoryId, id]);
      changes.push(`category → ${cat.rows[0].name}`);
    }

    if (departmentId !== undefined && departmentId !== null && Number(departmentId) !== g.department_id) {
      if (lockedStatus) {
        throw conflict('The department cannot be changed once the grievance is in progress');
      }
      const dept = await client.query(
        'SELECT id, name FROM departments WHERE id = $1 AND is_active',
        [departmentId],
      );
      if (!dept.rows.length) throw badRequest('Select a valid department');
      await client.query('UPDATE grievances SET department_id = $1 WHERE id = $2', [
        departmentId,
        id,
      ]);
      changes.push(`department → ${dept.rows[0].name}`);
    }

    if (priority && priority !== g.priority) {
      await client.query('UPDATE grievances SET priority = $1 WHERE id = $2', [priority, id]);
      changes.push(`priority ${g.priority} → ${priority}`);
    }

    if (!changes.length) throw badRequest('No changes were supplied');
    await addHistory(client, {
      grievanceId: id,
      from: g.status,
      to: g.status,
      userId: user.id,
      role: user.role,
      remark: `CMO updated official fields: ${changes.join('; ')}.`,
      isInternal: false,
    });
  });
  return getGrievanceDetail({ id, user });
}

// ---------------------------------------------------------------------------
// Public tracking + attachments
// ---------------------------------------------------------------------------
async function trackByRef(refNo) {
  const { rows } = await query(
    `SELECT g.id, g.ref_no, g.subject, g.district, g.priority, g.status,
            ${OVERDUE} AS is_overdue, g.created_at, g.updated_at, g.resolved_at,
            g.escalation_count,
            c.name AS category_name, d.name AS department_name, d.code AS department_code
       FROM grievances g
       JOIN categories c ON c.id = g.category_id
       LEFT JOIN departments d ON d.id = g.department_id
      WHERE upper(g.ref_no) = $1`,
    [refNo],
  );
  if (!rows.length) throw notFound('No grievance found for this reference ID');
  const g = rows[0];
  const history = await query(
    `SELECT from_status, to_status, changed_by_role, remark, created_at
       FROM grievance_history
      WHERE grievance_id = $1 AND is_internal = FALSE
      ORDER BY created_at ASC, id ASC`,
    [g.id],
  );
  return {
    ref_no: g.ref_no,
    subject: g.subject,
    district: g.district,
    category: { name: g.category_name },
    department: g.department_name
      ? { name: g.department_name, code: g.department_code }
      : null,
    priority: g.priority,
    status: g.status,
    is_overdue: Boolean(g.is_overdue),
    sla_days: slaDaysFor(g.priority),
    escalation_count: g.escalation_count,
    created_at: g.created_at,
    updated_at: g.updated_at,
    resolved_at: g.resolved_at,
    timeline: history.rows.map((h) => ({
      from_status: h.from_status,
      to_status: h.to_status,
      remark: h.remark,
      changed_by_role: h.changed_by_role,
      created_at: h.created_at,
    })),
  };
}

async function getAttachmentForUser({ id, user }) {
  const { rows } = await query(
    `SELECT a.*, g.citizen_id, g.department_id, g.status, g.ref_no
       FROM attachments a
       JOIN grievances g ON g.id = a.grievance_id
      WHERE a.id = $1`,
    [id],
  );
  if (!rows.length) throw notFound('Attachment not found');
  const row = rows[0];
  const allowed =
    user.role === 'CMO_ADMIN' ||
    row.citizen_id === user.id ||
    (user.role === 'DEPT_OFFICER' &&
      row.department_id === user.department_id &&
      VIEWABLE_OFFICER_STATUSES.includes(row.status));
  if (!allowed) throw forbidden('You do not have access to this attachment');
  return row;
}

async function listOfficers(departmentId) {
  const params = [];
  let where = "u.role = 'DEPT_OFFICER' AND u.is_active";
  if (departmentId) {
    params.push(departmentId);
    where += ` AND u.department_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.department_id, d.code AS department_code, d.name AS department_name
       FROM users u JOIN departments d ON d.id = u.department_id
      WHERE ${where}
      ORDER BY d.name, u.name`,
    params,
  );
  return rows;
}

module.exports = {
  listGrievances,
  getGrievanceDetail,
  createGrievance,
  updateStatus,
  assignGrievance,
  addRemark,
  escalateGrievance,
  submitActionReport,
  reviewReport,
  submitFeedback,
  reopenGrievance,
  overrideGrievance,
  trackByRef,
  getAttachmentForUser,
  listOfficers,
  canView,
  summaryFor,
};
