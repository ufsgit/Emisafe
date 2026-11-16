const path = require('path');
const db = require('../config/db');
const { saveBase64UploadMeta, deleteUploadedFile } = require('../services/uploadService');

/** Raw certificate format files live in their own uploads folder. */
const FORMAT_SUBDIR = 'certificates';

const FORMAT_COLUMNS = `id, file_name, file_path, mime_type, file_size, uploaded_by_name, created_at`;

/**
 * GET /api/certificate-formats
 * Every authenticated user may read the uploaded raw format.
 */
async function listCertificateFormats(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT ${FORMAT_COLUMNS}
       FROM certificate_formats
       ORDER BY id DESC`
    );

    return res.json({
      success: true,
      data: {
        formats: rows,
        format: rows.length > 0 ? rows[0] : null
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/certificate-formats  (admin only)
 * Body: { file_name, dataBase64, mime_type }
 * The file arrives as base64 inside the JSON body — no multipart parser needed.
 */
async function uploadCertificateFormat(req, res, next) {
  try {
    const { file_name, dataBase64, mime_type } = req.body || {};

    if (!dataBase64 || typeof dataBase64 !== 'string' || !dataBase64.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Raw certificate format file data (dataBase64) is required.'
      });
    }

    const originalName = path.basename(String(file_name || 'certificate-format')).slice(0, 255) || 'certificate-format';
    const originalExt = path.extname(originalName);

    // Unique on-disk name: timestamp + random token keeps every upload distinct.
    const uniqueStem = `certificate-format-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const saved = saveBase64UploadMeta(dataBase64, FORMAT_SUBDIR, `${uniqueStem}${originalExt}`);

    if (!saved) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data. Please upload a valid certificate format file.'
      });
    }

    const uploadedBy = req.admin ? req.admin.id : null;
    const uploadedByName = req.admin ? (req.admin.name || req.admin.email || 'Admin') : 'Admin';

    try {
      const [result] = await db.query(
        `INSERT INTO certificate_formats (file_name, file_path, mime_type, file_size, uploaded_by, uploaded_by_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          originalName,
          saved.filePath,
          mime_type || saved.mime || null,
          saved.size,
          uploadedBy,
          uploadedByName
        ]
      );

      const [rows] = await db.query(
        `SELECT ${FORMAT_COLUMNS} FROM certificate_formats WHERE id = ?`,
        [result.insertId]
      );

      return res.status(201).json({
        success: true,
        message: 'Raw certificate format uploaded successfully.',
        data: {
          format: rows[0]
        }
      });
    } catch (dbError) {
      // Clean up the orphaned file if the insert fails
      deleteUploadedFile(saved.filePath);
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/certificate-formats/:id  (admin only)
 * Removes the row and the file behind it.
 */
async function deleteCertificateFormat(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      'SELECT id, file_name, file_path FROM certificate_formats WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate format not found.'
      });
    }

    await db.query('DELETE FROM certificate_formats WHERE id = ?', [id]);
    if (rows[0].file_path) deleteUploadedFile(rows[0].file_path);

    return res.json({
      success: true,
      message: `Certificate format "${rows[0].file_name}" deleted successfully.`,
      data: { id: parseInt(id, 10) }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCertificateFormats,
  uploadCertificateFormat,
  deleteCertificateFormat
};
