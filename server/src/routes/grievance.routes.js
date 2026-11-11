const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/grievance.controller');
const schemas = require('../validators/grievance.schema');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorize('CITIZEN'),
  upload.single('attachment'),
  validate({ body: schemas.createGrievanceSchema }),
  ctrl.create,
);

router.get('/', validate({ query: schemas.listQuerySchema }), ctrl.list);

router.get('/:id', validate({ params: schemas.idParamSchema }), ctrl.detail);

router.patch(
  '/:id/status',
  authorize('CMO_ADMIN', 'DEPT_OFFICER'),
  validate({ params: schemas.idParamSchema, body: schemas.statusUpdateSchema }),
  ctrl.updateStatus,
);

router.post(
  '/:id/assign',
  authorize('CMO_ADMIN'),
  validate({ params: schemas.idParamSchema, body: schemas.assignSchema }),
  ctrl.assign,
);

router.post(
  '/:id/remarks',
  authorize('CMO_ADMIN', 'DEPT_OFFICER'),
  validate({ params: schemas.idParamSchema, body: schemas.remarkSchema }),
  ctrl.remarks,
);

router.post(
  '/:id/escalate',
  authorize('CMO_ADMIN'),
  validate({ params: schemas.idParamSchema, body: schemas.escalateSchema }),
  ctrl.escalate,
);

router.post(
  '/:id/action-report',
  authorize('DEPT_OFFICER'),
  upload.single('report_file'),
  validate({ params: schemas.idParamSchema, body: schemas.reportSchema }),
  ctrl.actionReport,
);

router.post(
  '/:id/report-review',
  authorize('CMO_ADMIN'),
  validate({ params: schemas.idParamSchema, body: schemas.reportReviewSchema }),
  ctrl.reportReview,
);

router.post(
  '/:id/feedback',
  authorize('CITIZEN'),
  validate({ params: schemas.idParamSchema, body: schemas.feedbackSchema }),
  ctrl.feedback,
);

router.post(
  '/:id/reopen',
  authorize('CITIZEN'),
  validate({ params: schemas.idParamSchema, body: schemas.reopenSchema }),
  ctrl.reopen,
);

router.patch(
  '/:id',
  authorize('CMO_ADMIN'),
  validate({ params: schemas.idParamSchema, body: schemas.overrideSchema }),
  ctrl.override,
);

module.exports = router;
