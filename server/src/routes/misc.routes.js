const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParamSchema, trackParamSchema } = require('../validators/grievance.schema');
const ctrl = require('../controllers/grievance.controller');

const router = express.Router();

router.get('/track/:refNo', validate({ params: trackParamSchema }), ctrl.track);

router.get(
  '/attachments/:id',
  authenticate,
  validate({ params: idParamSchema }),
  ctrl.downloadAttachment,
);

router.get('/users/officers', authenticate, authorize('CMO_ADMIN'), ctrl.officers);

module.exports = router;
