const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const router = express.Router();

const { parseTimeToMinutes } = require("../utils/timeUtils");
const normalizeStatus = require("../utils/normalizeStatus");

const upload = multer({ storage: multer.memoryStorage() });

function normalizeKey(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[\s_/]+/g, "");
}

const MIN_PER_DAY = 24 * 60;

const OT_CONFIG = {
  maxOtPerDayMin: 180,
  minArrivalMin: 5 * 60,
  maxDepartureMin: 23 * 60 + 30,
  jitter: 0.4,
  noOtMaxWorkMin: 9.5 * 60,
};

function distributeOt(totalMin, n, maxPerDay, jitter) {
  const alloc = new Array(n).fill(0);
  if (n === 0 || totalMin <= 0) return alloc;

  const feasible = Math.min(totalMin, n * maxPerDay);

  const weights = [];
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    const w = 1 + (Math.random() * 2 - 1) * jitter; // 1 +/- jitter
    weights.push(w);
    wsum += w;
  }
  for (let i = 0; i < n; i++) {
    let v = Math.round((feasible * weights[i]) / wsum);
    if (v > maxPerDay) v = maxPerDay;
    if (v < 0) v = 0;
    alloc[i] = v;
  }

  // Correct rounding so the total is EXACT, respecting [0, maxPerDay].
  let diff = feasible - alloc.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (diff !== 0 && guard++ < 1000000) {
    const i = Math.floor(Math.random() * n);
    if (diff > 0 && alloc[i] < maxPerDay) {
      alloc[i]++;
      diff--;
    } else if (diff < 0 && alloc[i] > 0) {
      alloc[i]--;
      diff++;
    }
  }
  return alloc;
}

router.post("/", upload.single("file"), function (req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  try {
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellNF: true,
    });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet || !sheet["!ref"]) {
      return res
        .status(400)
        .json({ error: "Excel file is empty or has no data rows." });
    }

    const range = XLSX.utils.decode_range(sheet["!ref"]);

    const colOf = {};
    for (let C = range.s.c; C <= range.e.c; C++) {
      const hc = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (hc && hc.v != null && String(hc.v).trim() !== "") {
        colOf[normalizeKey(hc.v)] = C;
      }
    }
    const pick = function () {
      for (const name of arguments) {
        if (colOf[name] !== undefined) return colOf[name];
      }
      return undefined;
    };

    const hasDepartment = colOf.department !== undefined;
    const col = {
      empKey: pick("employeecode", "code", "employeename", "name"),
      spst: pick("spst", "status"),
      shiftIn: pick("shiftin"),
      shiftOut: pick("shiftout"),
      arrv: pick("arrv", "arrival", "entry"),
      dept: hasDepartment ? pick("dept") : undefined,
      work: pick("work"),
      ot: pick("othours"),
    };

    if (col.spst === undefined) {
      return res
        .status(400)
        .json({ error: "No SPST / Status column found in the sheet." });
    }

    const cellAt = function (R, C) {
      return C === undefined
        ? undefined
        : sheet[XLSX.utils.encode_cell({ r: R, c: C })];
    };
    const readMin = function (R, C) {
      const c = cellAt(R, C);
      return c ? parseTimeToMinutes(c.v) : null;
    };
    const wrapDay = function (m) {
      return ((m % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
    };
    const ensureCell = function (R, C, z) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      let c = sheet[addr];
      if (!c) c = sheet[addr] = { t: "n", z: z };
      return c;
    };
    const writeTime = function (cell, minutes) {
      cell.v = wrapDay(minutes) / MIN_PER_DAY;
      cell.t = "n";
      delete cell.w;
    };
    const writeWork = function (R, minutes) {
      if (col.work === undefined) return;
      let worked = minutes;
      if (worked < 0) worked += MIN_PER_DAY;
      const cell = ensureCell(R, col.work, "General");
      cell.v = Number((worked / 60).toFixed(2));
      cell.t = "n";
      delete cell.w;
    };
    const zeroCell = function (cell) {
      if (!cell) return;
      cell.v = 0;
      cell.t = "n";
      if (!cell.z) cell.z = "General";
      delete cell.w;
    };
    const blankCell = function (cell) {
      if (!cell) return;
      cell.v = "";
      cell.t = "s";
      delete cell.w;
    };

    let arrvFixed = 0,
      deptFixed = 0,
      spstNormalized = 0,
      workUpdated = 0;

    const employees = new Map();
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const spstCell = cellAt(R, col.spst);
      if (!spstCell) continue;

      const status = String(spstCell.v || "")
        .toUpperCase()
        .trim();
      const ns = normalizeStatus(status);

      // 1) Normalize SPST in place
      if (ns && ns !== status) {
        spstCell.v = ns;
        spstCell.t = "s";
        delete spstCell.w;
        spstNormalized++;
      }

      const otCell = cellAt(R, col.ot);
      const arrvCell = cellAt(R, col.arrv);
      const deptCell = cellAt(R, col.dept);

      if (ns === "WO" || ns === "PH") {
        blankCell(arrvCell);
        blankCell(deptCell);
        writeWork(R, 0);
        zeroCell(otCell);
        continue;
      }

      const otVal = otCell ? parseFloat(otCell.v) : NaN;
      zeroCell(otCell);

      const siMin = readMin(R, col.shiftIn);
      const soMin = readMin(R, col.shiftOut);

      const eligible =
        ns.indexOf("DP") !== -1 && siMin !== null && soMin !== null;

      if (eligible) {
        const key =
          col.empKey !== undefined
            ? String((cellAt(R, col.empKey) || {}).v || "").trim()
            : "__all__";
        let e = employees.get(key);
        if (!e) {
          e = { ot: 0, days: [] };
          employees.set(key, e);
        }
        if (otVal > 0) e.ot = otVal;
        e.days.push({ R: R, siMin: siMin, soMin: soMin });
      } else {
        const a = readMin(R, col.arrv);
        const d = readMin(R, col.dept);
        if (a !== null && d !== null) {
          let w = d - a;
          if (w < 0) w += MIN_PER_DAY;
          writeWork(R, w);
        } else {
          writeWork(R, 0);
        }
      }
    }

    for (const e of employees.values()) {
      const n = e.days.length;
      const totalMin = Math.round((e.ot || 0) * 60);
      const alloc = distributeOt(
        totalMin,
        n,
        OT_CONFIG.maxOtPerDayMin,
        OT_CONFIG.jitter,
      );

      for (let i = 0; i < n; i++) {
        const d = e.days[i];
        const dailyOt = alloc[i];
        const cut = Math.floor(dailyOt / 2);
        const add = dailyOt - cut;

        let arr = d.siMin - cut;
        if (arr < OT_CONFIG.minArrivalMin) arr = OT_CONFIG.minArrivalMin;

        let dep = d.soMin + add;
        if (dep > OT_CONFIG.maxDepartureMin) dep = OT_CONFIG.maxDepartureMin;

        if ((e.ot || 0) <= 0) {
          let worked = dep - arr;
          if (worked < 0) worked += MIN_PER_DAY;
          if (worked > OT_CONFIG.noOtMaxWorkMin) {
            dep = arr + OT_CONFIG.noOtMaxWorkMin;
          }
        }

        if (col.arrv !== undefined) {
          writeTime(ensureCell(d.R, col.arrv, "h:mm AM/PM"), arr);
          arrvFixed++;
        }
        if (col.dept !== undefined) {
          writeTime(ensureCell(d.R, col.dept, "h:mm AM/PM"), dep);
          deptFixed++;
        }

        let worked = dep - arr;
        if (worked < 0) worked += MIN_PER_DAY;
        writeWork(d.R, worked);
        workUpdated++;
      }
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="RC_HR_Processed.xlsx"',
      "X-Process-Stats": JSON.stringify({
        employees: employees.size,
        arrvFixed,
        deptFixed,
        spstNormalized,
        workUpdated,
      }),
      "Access-Control-Expose-Headers": "X-Process-Stats, Content-Disposition",
    });

    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
