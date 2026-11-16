const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

const MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
};

function sanitizeFileName(name) {
  const base = path.basename(String(name || 'file')).replace(/[^\w.\- ]+/g, '_').trim();
  return base || 'file';
}

function extFromName(name) {
  const ext = path.extname(sanitizeFileName(name)).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

/**
 * Decodes a dataURL or raw base64 string into a Buffer.
 * Returns null when the payload cannot be decoded.
 */
function decodeBase64(dataBase64) {
  if (typeof dataBase64 !== 'string' || !dataBase64.trim()) return null;
  const dataUrlMatch = dataBase64.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  let b64;
  let mime = null;
  if (dataUrlMatch) {
    mime = dataUrlMatch[1] || null;
    if (!dataUrlMatch[2]) {
      // non-base64 data URL (percent encoded) — decode as text
      try {
        return Buffer.from(decodeURIComponent(dataUrlMatch[3]), 'utf8');
      } catch (e) {
        return null;
      }
    }
    b64 = dataUrlMatch[3];
  } else {
    b64 = dataBase64;
  }
  try {
    const buf = Buffer.from(b64, 'base64');
    // Buffer.from silently produces empty output for garbage — treat empty as failure
    if (!buf.length) return null;
    return { buf, mime };
  } catch (e) {
    return null;
  }
}

/**
 * Writes a base64 payload to backend/uploads/<subdir>/.
 * Returns the public URL path ('/uploads/<subdir>/<file>') or null on failure.
 */
function saveBase64Upload(dataBase64, subdir, originalName) {
  const saved = saveBase64UploadMeta(dataBase64, subdir, originalName);
  return saved ? saved.filePath : null;
}

/**
 * Same as saveBase64Upload but also returns the decoded size and detected mime type.
 * Returns null when the payload cannot be decoded.
 */
function saveBase64UploadMeta(dataBase64, subdir, originalName) {
  const decoded = decodeBase64(dataBase64);
  if (!decoded) return null;

  const safeSubdir = String(subdir || '').replace(/[^\w\-]+/g, '');
  const targetDir = path.join(UPLOADS_ROOT, safeSubdir);
  fs.mkdirSync(targetDir, { recursive: true });

  const safeName = sanitizeFileName(originalName);
  const ext = extFromName(safeName) || (decoded.mime && MIME_EXT[decoded.mime]) || '';
  const withoutExt = ext ? safeName.slice(0, -ext.length) : safeName;
  const fileName = `${Date.now()}-${withoutExt.slice(0, 80)}${ext}`;

  fs.writeFileSync(path.join(targetDir, fileName), decoded.buf);
  return {
    filePath: `/uploads/${safeSubdir}/${fileName}`,
    size: decoded.buf.length,
    mime: decoded.mime || null
  };
}

/**
 * Deletes a file previously returned by saveBase64Upload.
 * Never throws — returns true when a file was removed.
 */
function deleteUploadedFile(publicPath) {
  try {
    if (!publicPath || typeof publicPath !== 'string') return false;
    if (!publicPath.startsWith('/uploads/')) return false;
    const rel = publicPath.slice('/uploads/'.length).replace(/\\/g, '/');
    if (rel.includes('..')) return false;
    const filePath = path.join(UPLOADS_ROOT, rel);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  UPLOADS_ROOT,
  decodeBase64,
  saveBase64Upload,
  saveBase64UploadMeta,
  deleteUploadedFile
};
