// middlewares/uploadFile.js  (PERBAIKAN)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFilenamePart(name) {
    if (!name) return 'file';
    return name.toString()
        .normalize('NFKD')
        .replace(/\s+/g, '_')
        .replace(/[^\w\-\.]/g, '')
        .slice(0, 80);
}

function formatDateISO(d = new Date()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Hanya PDF
const ALLOWED_MIMETYPES = ['application/pdf'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per file (ubah jika butuh)

function uploadFor(modelName, opts = {}) {
    const model = (modelName || 'default').toString().toLowerCase();
    const baseUploadDir = path.join(__dirname, '..', 'uploads');
    const uploadDir = path.join(baseUploadDir, model);
    ensureDirSync(uploadDir);

    const allowedMimes = opts.allowedMimes || ALLOWED_MIMETYPES;
    const maxSize = opts.maxFileSize || MAX_FILE_SIZE;

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const dateStr = formatDateISO(new Date());
            const rawName = (req.body && req.body.nama_berkas) ? req.body.nama_berkas : path.basename(file.originalname, path.extname(file.originalname));
            const safeName = sanitizeFilenamePart(rawName);
            const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
            const idPart = (req.body && (req.body.nomor_hak || req.body.nik || req.body.id)) ? sanitizeFilenamePart(req.body.nomor_hak || req.body.nik || req.body.id) : `unknown-${Date.now()}`;
            const filename = `${model}-${dateStr}-${idPart}-${safeName}${ext}`;
            cb(null, filename);
        }
    });

    function fileFilter(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedMimes.includes(file.mimetype) || ext !== '.pdf') {
            // reject: bukan pdf
            return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `type_not_allowed:${file.mimetype || ext}`));
        }
        cb(null, true);
    }

    const upload = multer({ storage, fileFilter, limits: { fileSize: maxSize } });

    // normalizeUploaded: buat req.uploadedFiles & req.body.files
    function normalizeUploaded(req) {
        let uploaded = [];
        if (req.file) uploaded = [req.file];
        else if (Array.isArray(req.files)) uploaded = req.files;
        else if (req.files && typeof req.files === 'object') {
            for (const key of Object.keys(req.files)) {
                const arr = req.files[key];
                if (Array.isArray(arr)) uploaded.push(...arr);
            }
        }

        const mapped = uploaded.map(f => ({
            fieldname: f.fieldname,
            originalname: f.originalname,
            filename: f.filename,
            fullpath: f.path,
            size: f.size,
            mimetype: f.mimetype,
            relativePath: path.posix.join('uploads', model, f.filename)
        }));

        req.uploadedFiles = mapped;

        const filesForDb = mapped.map(m => m.relativePath);
        if (filesForDb.length) req.body.files = JSON.stringify(filesForDb);
        else req.body.files = req.body.files || null;
    }

    // helper compose supaya multer dijalankan dulu lalu normalizeUploaded
    function composeMulter(middlewareFn) {
        return function (req, res, next) {
            try {
                middlewareFn(req, res, function (err) {
                    if (err) {
                        // pass multer errors and others downstream
                        return next(err);
                    }
                    try {
                        normalizeUploaded(req);
                    } catch (e) {
                        return next(e);
                    }
                    return next();
                });
            } catch (e) {
                return next(e);
            }
        };
    }

    return {
        single: (fieldname) => composeMulter(upload.single(fieldname)),
        array: (fieldname, maxCount = 10) => composeMulter(upload.array(fieldname, maxCount)),
        fields: (fields) => composeMulter(upload.fields(fields)),
        raw: upload
    };
}

module.exports = { uploadFor };
