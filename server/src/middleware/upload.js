const multer = require('multer');
const config = require('../config');
const { AppError, badRequest } = require('../utils/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxBytes,
    files: 1,
    fields: 30,
  },
  fileFilter(_req, file, cb) {
    if (!config.uploads.allowedMime.includes(file.mimetype)) {
      return cb(badRequest('Only JPG, PNG or PDF files are allowed'));
    }
    return cb(null, true);
  },
});

/** Check the file magic bytes so a renamed executable cannot pass as a PDF. */
function isAllowedFileSignature(buffer, mime) {
  if (!buffer || buffer.length < 4) return false;
  if (mime === 'application/pdf') return buffer.subarray(0, 4).toString('latin1') === '%PDF';
  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8;
  return false;
}

/** Normalise a multipart filename (multer decodes as latin1). */
function safeFilename(name) {
  const decoded = Buffer.from(name || 'attachment', 'latin1').toString('utf8');
  const cleaned = decoded.replace(/[\\/\r\n"]/g, '_').slice(0, 180);
  return cleaned || 'attachment';
}

function assertFileSignature(file) {
  if (!file) return;
  if (!isAllowedFileSignature(file.buffer, file.mimetype)) {
    throw new AppError(400, 'INVALID_FILE', 'The uploaded file content does not match its type');
  }
}

module.exports = { upload, assertFileSignature, safeFilename };
