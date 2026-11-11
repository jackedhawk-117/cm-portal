const express = require('express');
const { validate } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimit');
const { contactSchema } = require('../validators/common.schema');
const ctrl = require('../controllers/public.controller');

const router = express.Router();

router.get('/departments', ctrl.listDepartments);
router.get('/categories', ctrl.listCategories);
router.get('/meta', ctrl.meta);
router.post('/contact', contactLimiter, validate({ body: contactSchema }), ctrl.contact);

module.exports = router;
