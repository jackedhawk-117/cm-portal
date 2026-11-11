const svc = require('../services/grievance.service');
const { assertFileSignature, safeFilename } = require('../middleware/upload');

async function create(req, res, next) {
  try {
    const detail = await svc.createGrievance({
      user: req.user,
      body: req.body,
      file: req.file,
      assertFileSignature,
      safeFilename,
    });
    res.status(201).location(`/api/grievances/${detail.id}`).json({ data: detail });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await svc.listGrievances({
      user: req.user,
      filters: req.validatedQuery || req.query,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    res.json({ data: await svc.getGrievanceDetail({ id: req.params.id, user: req.user }) });
  } catch (err) {
    next(err);
  }
}

async function track(req, res, next) {
  try {
    res.json({ data: await svc.trackByRef(req.params.refNo) });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, remark, is_internal } = req.body;
    res.json({
      data: await svc.updateStatus({
        id: req.params.id,
        user: req.user,
        status,
        remark,
        isInternal: is_internal,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const { department_id, officer_id, remark } = req.body;
    res.json({
      data: await svc.assignGrievance({
        id: req.params.id,
        user: req.user,
        departmentId: department_id,
        officerId: officer_id,
        remark,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function remarks(req, res, next) {
  try {
    res.json({
      data: await svc.addRemark({
        id: req.params.id,
        user: req.user,
        remark: req.body.remark,
        isInternal: req.body.is_internal,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function escalate(req, res, next) {
  try {
    res.json({
      data: await svc.escalateGrievance({
        id: req.params.id,
        user: req.user,
        remark: req.body.remark,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function actionReport(req, res, next) {
  try {
    res.json({
      data: await svc.submitActionReport({
        id: req.params.id,
        user: req.user,
        report: req.body.report,
        file: req.file,
        assertFileSignature,
        safeFilename,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function reportReview(req, res, next) {
  try {
    res.json({
      data: await svc.reviewReport({
        id: req.params.id,
        user: req.user,
        decision: req.body.decision,
        remark: req.body.remark,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function feedback(req, res, next) {
  try {
    res.status(201).json({
      data: await svc.submitFeedback({
        id: req.params.id,
        user: req.user,
        rating: req.body.rating,
        comment: req.body.comment,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function reopen(req, res, next) {
  try {
    res.json({
      data: await svc.reopenGrievance({
        id: req.params.id,
        user: req.user,
        reason: req.body.reason,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function override(req, res, next) {
  try {
    res.json({
      data: await svc.overrideGrievance({
        id: req.params.id,
        user: req.user,
        categoryId: req.body.category_id,
        departmentId: req.body.department_id,
        priority: req.body.priority,
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function downloadAttachment(req, res, next) {
  try {
    const row = await svc.getAttachmentForUser({ id: req.params.id, user: req.user });
    const download = req.query.download === '1';
    const filename = encodeURIComponent(row.filename);
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Content-Length', row.size);
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="attachment"; filename*=UTF-8''${filename}`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(row.data);
  } catch (err) {
    next(err);
  }
}

async function officers(req, res, next) {
  try {
    const departmentId = req.query.department_id
      ? Number.parseInt(req.query.department_id, 10)
      : undefined;
    res.json({ data: await svc.listOfficers(departmentId) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  detail,
  track,
  updateStatus,
  assign,
  remarks,
  escalate,
  actionReport,
  reportReview,
  feedback,
  reopen,
  override,
  downloadAttachment,
  officers,
};
