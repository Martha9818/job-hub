const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { run, get, query } = require('../common/database');
const { authenticate } = require('../auth/middleware');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/resumes';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE = (parseInt(process.env.MAX_RESUME_SIZE_MB) || 10) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// 上传简历
router.post('/upload', authenticate, upload.single('resume'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ code: 'BAD_REQUEST', message: '请上传简历文件' });

    const id = uuidv4();
    run('INSERT INTO resumes (id, user_id, filename, filepath, file_size) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, req.file.originalname, req.file.path, req.file.size]);

    res.status(201).json({ message: '简历上传成功', data: { id, filename: req.file.originalname, file_size: req.file.size } });
  } catch (err) { next(err); }
});

// 获取简历列表
router.get('/', authenticate, (req, res, next) => {
  try {
    const resumes = query('SELECT id, filename, file_size, is_default, parse_status, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ data: resumes });
  } catch (err) { next(err); }
});

// 设默认简历
router.put('/:id/default', authenticate, (req, res, next) => {
  try {
    const resume = get('SELECT id FROM resumes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!resume) return res.status(404).json({ code: 'NOT_FOUND', message: '简历未找到' });
    run('UPDATE resumes SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    run('UPDATE resumes SET is_default = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: '已设置为默认简历' });
  } catch (err) { next(err); }
});

// 删除简历
router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const resume = get('SELECT filepath FROM resumes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!resume) return res.status(404).json({ code: 'NOT_FOUND', message: '简历未找到' });
    if (fs.existsSync(resume.filepath)) fs.unlinkSync(resume.filepath);
    run('DELETE FROM resumes WHERE id = ?', [req.params.id]);
    res.json({ message: '简历已删除' });
  } catch (err) { next(err); }
});

module.exports = router;
