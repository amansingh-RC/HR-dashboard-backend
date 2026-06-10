const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/", async function (req, res) {
  try {
    const totalResult = await pool.query("SELECT COUNT(*) as c FROM employees");
    const total = parseInt(totalResult.rows[0].c);

    const latestResult = await pool.query(
      "SELECT date FROM attendance ORDER BY date DESC LIMIT 1",
    );
    const latestDate =
      latestResult.rows.length > 0 ? latestResult.rows[0].date : "";

    const presentResult = await pool.query(
      `SELECT COUNT(*) as c FROM attendance WHERE date = $1 AND status IN ('DP','DP/ABS')`,
      [latestDate],
    );
    const present = parseInt(presentResult.rows[0].c);

    const absentResult = await pool.query(
      `SELECT COUNT(*) as c FROM attendance WHERE date = $1 AND status IN ('ABS','ABS/DP')`,
      [latestDate],
    );
    const absent = parseInt(absentResult.rows[0].c);

    // Total employees per department
    const deptTotalsResult = await pool.query(
      `SELECT department, COUNT(*) as total FROM employees GROUP BY department ORDER BY department`,
    );
    const deptTotals = deptTotalsResult.rows;

    // Present per department on latest date
    const deptPresentResult = await pool.query(
      `SELECT e.department, COUNT(*) as present
       FROM attendance a JOIN employees e ON e.code = a.employee_code
       WHERE a.date = $1 AND a.status IN ('DP','DP/ABS')
       GROUP BY e.department`,
      [latestDate],
    );
    const deptPresent = deptPresentResult.rows;

    // Absent per department on latest date
    const deptAbsentResult = await pool.query(
      `SELECT e.department, COUNT(*) as absent
       FROM attendance a JOIN employees e ON e.code = a.employee_code
       WHERE a.date = $1 AND a.status IN ('ABS','ABS/DP')
       GROUP BY e.department`,
      [latestDate],
    );
    const deptAbsent = deptAbsentResult.rows;

    const presentMap = {};
    deptPresent.forEach(function (r) {
      presentMap[r.department] = r.present;
    });
    const absentMap = {};
    deptAbsent.forEach(function (r) {
      absentMap[r.department] = r.absent;
    });

    const departments = {};
    deptTotals.forEach(function (r) {
      departments[r.department] = {
        total: parseInt(r.total),
        present: presentMap[r.department] || 0,
        absent: absentMap[r.department] || 0,
      };
    });

    res.json({ total, present, absent, latestDate, departments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
