const express         = require('express');
const multer          = require('multer');
const XLSX            = require('xlsx');
const pool            = require('../db');
const normalizeStatus = require('../utils/normalizeStatus');
const router          = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

function normalize(str) {
  return String(str).toLowerCase().trim().replace(/[\s_/]+/g, '');
}

// Excel columns: Employee Name | Employee Code | Join Date | Branch |
//                Department | Day | Date | SPST | SHIFT IN | SHIFT OUT | ARRV | DEPT
const COL_MAP = {
  'employeename':  'name',
  'name':          'name',
  'employeecode':  'code',
  'code':          'code',
  'joindate':      'joinDate',
  'joiningdate':   'joinDate',
  'branch':        'branch',
  'department':    'department',
  'day':           'day',
  'date':          'date',
  'spst':          'status',
  'status':        'status',
  'shiftin':       'shiftIn',
  'shiftout':      'shiftOut',
  'arrv':          'entry',
  'arrival':       'entry',
  'entry':         'entry',
};

function mapRow(rawRow) {
  const keys   = Object.keys(rawRow);
  const mapped = {};
  const hasDepartmentCol = keys.some(function(k) { return normalize(k) === 'department'; });

  keys.forEach(function(key) {
    const norm = normalize(key);
    const val  = rawRow[key] == null ? '' : String(rawRow[key]).trim();

    if (norm === 'dept') {
      // DEPT = departure/exit when a separate Department column exists; else = department
      if (hasDepartmentCol) mapped.exit = val;
      else mapped.department = val;
      return;
    }
    const dest = COL_MAP[norm];
    if (dest) mapped[dest] = val;
  });

  return mapped;
}

// POST /api/sync
router.post('/', upload.single('file'), async function(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const client = await pool.connect();
  try {
    const workbook  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rawRows   = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty or has no data rows.' });
    }

    // Start transaction
    await client.query('BEGIN');

    let empUpserted = 0, attUpserted = 0, skipped = 0;

    for (const raw of rawRows) {
      const row = mapRow(raw);
      if (!row.code) { skipped++; continue; }

      // Upsert employee
      await client.query(
        `INSERT INTO employees (code, name, branch, department, join_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET
           name       = CASE WHEN $2 != '' THEN $2 ELSE employees.name END,
           branch     = CASE WHEN $3 != '' THEN $3 ELSE employees.branch END,
           department = CASE WHEN $4 != '' THEN $4 ELSE employees.department END,
           join_date  = CASE WHEN $5 != '' THEN $5 ELSE employees.join_date END`,
        [row.code, row.name || '', row.branch || '', row.department || '', row.joinDate || '']
      );
      empUpserted++;

      // Upsert attendance if date exists
      if (row.date) {
        await client.query(
          `INSERT INTO attendance (employee_code, date, day, shift_in, shift_out, entry, exit_time, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (employee_code, date) DO UPDATE SET
             day       = CASE WHEN $3 != '' THEN $3 ELSE attendance.day END,
             shift_in  = CASE WHEN $4 != '' THEN $4 ELSE attendance.shift_in END,
             shift_out = CASE WHEN $5 != '' THEN $5 ELSE attendance.shift_out END,
             entry     = CASE WHEN $6 != '' THEN $6 ELSE attendance.entry END,
             exit_time = CASE WHEN $7 != '' THEN $7 ELSE attendance.exit_time END,
             status    = CASE WHEN $8 != '' THEN $8 ELSE attendance.status END`,
          [row.code, row.date, row.day || '', row.shiftIn || '',
           row.shiftOut || '', row.entry || '', row.exit || '', normalizeStatus(row.status)]
        );
        attUpserted++;
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Sync complete. ${empUpserted} employee record(s) updated, ` +
               `${attUpserted} attendance record(s) upserted, ` +
               `${skipped} row(s) skipped (missing Employee Code).`,
    });
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/sync/clear  — wipe ALL employees and attendance from the database
router.post('/clear', async function(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const att = await client.query('DELETE FROM attendance');
    const emp = await client.query('DELETE FROM employees');
    // Reset SERIAL sequences so new IDs start from 1
    await client.query("SELECT setval(pg_get_serial_sequence('employees','id'), 1, false)");
    await client.query("SELECT setval(pg_get_serial_sequence('attendance','id'), 1, false)");
    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Cleared ${emp.rowCount} employee(s) and ${att.rowCount} attendance record(s).`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/sync/normalize  — manually clean up SPST values in the DB
router.post('/normalize', async function(req, res) {
  try {
    const distinct = await pool.query(
      `SELECT DISTINCT status FROM attendance WHERE status IS NOT NULL AND status != ''`
    );
    const changes = [];
    let totalRows = 0;
    for (const row of distinct.rows) {
      const original   = row.status;
      const normalized = normalizeStatus(original);
      if (normalized !== original) {
        const result = await pool.query(
          `UPDATE attendance SET status = $1 WHERE status = $2`,
          [normalized, original]
        );
        changes.push({ from: original, to: normalized, rows: result.rowCount });
        totalRows += result.rowCount;
      }
    }
    res.json({ success: true, totalRows, changes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
