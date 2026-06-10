const express = require("express");
const pool = require("../db");
const normalizeStatus = require("../utils/normalizeStatus");
const router = express.Router();

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

router.get("/", async function (req, res) {
  try {
    const { search = "", month = "" } = req.query;

    let rows;
    if (search) {
      const like = "%" + search.toLowerCase() + "%";
      const result = await pool.query(
        `SELECT id, name, code, branch, department, join_date
         FROM employees
         WHERE LOWER(name) LIKE $1 OR LOWER(code) LIKE $2
         ORDER BY name ASC`,
        [like, like],
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT id, name, code, branch, department, join_date FROM employees ORDER BY name ASC`,
      );
      rows = result.rows;
    }

    if (month && month !== "All Months") {
      const idx = MONTH_NAMES.indexOf(month);
      if (idx > 0) {
        rows = rows.filter(function (r) {
          return r.join_date && new Date(r.join_date).getMonth() + 1 === idx;
        });
      }
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:code/attendance", async function (req, res) {
  try {
    const { code } = req.params;
    const { month = "" } = req.query;

    const result = await pool.query(
      `SELECT * FROM attendance WHERE employee_code = $1 ORDER BY date DESC`,
      [code],
    );
    const rows = result.rows.map(function (r) {
      return Object.assign({}, r, { status: normalizeStatus(r.status) });
    });

    let records = rows;
    if (month && month !== "All Months") {
      const idx = MONTH_NAMES.indexOf(month);
      if (idx > 0) {
        records = rows.filter(function (r) {
          return new Date(r.date).getMonth() + 1 === idx;
        });
      }
    }

    const counts = {
      DP: 0,
      PL: 0,
      WO: 0,
      PH: 0,
      "ABS/DP": 0,
      "DP/ABS": 0,
      ABS: 0,
    };
    rows.forEach(function (r) {
      if (counts[r.status] !== undefined) counts[r.status]++;
      else counts.ABS++;
    });
    const totalPresent = rows.filter(function (r) {
      return r.status === "DP" || r.status === "DP/ABS";
    }).length;
    const totalAbsent = rows.filter(function (r) {
      return r.status === "ABS" || r.status === "ABS/DP";
    }).length;

    res.json({ records, summary: { counts, totalPresent, totalAbsent } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
