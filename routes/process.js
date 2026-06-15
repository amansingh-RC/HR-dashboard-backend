const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const router = express.Router();

const { parseTimeToMinutes, randInt } = require("../utils/timeUtils");
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
  minOtHours: 1, // an OT day adds at least 1 whole hour
  maxOtHours: 2, // an OT day adds at most 2 whole hours
  minArrivalMin: 5 * 60,
  jitter: 0.4,
  longShiftMin: 10 * 60, // "long" shift = 10h or more
  noOtMaxWorkMin: 9.5 * 60, // long-shift non-OT day: worked must stay below 9.5h
  noOtTrimRandomMin: 30, // when trimming, land 1..30 min below 9.5h (random, natural)
  naturalWindowMin: 60, // keep original punch if within +/-60 min of shift, else clean to shift
};

function distributeOt(totalMin, n, minPerDay, maxPerDay, jitter) {
  const alloc = new Array(n).fill(0);
  if (n <= 0 || totalMin <= 0) return alloc;

  const feasible = Math.min(totalMin, n * maxPerDay);

  // How many days should carry OT? Each carries [minPerDay, maxPerDay].
  const kMin = Math.ceil(feasible / maxPerDay);
  const kMax = Math.min(n, Math.floor(feasible / minPerDay));
  let k, lo;
  if (kMax < kMin) {
    k = Math.min(n, Math.max(1, kMin));
    lo = Math.floor(feasible / k);
  } else {
    // Pick the number of OT days RANDOMLY in the feasible range so the per-day
    // chunks come out as a natural mix of 1 / 2 / 3 hours (not all identical).
    k = kMin + Math.floor(Math.random() * (kMax - kMin + 1));
    if (k < 1) k = 1;
    lo = minPerDay;
  }

  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  const chosen = order.slice(0, k);
  const room = maxPerDay - lo;
  const sel = new Array(k).fill(lo);
  let rem = feasible - lo * k;
  if (rem > 0 && room > 0) {
    const weights = [];
    let wsum = 0;
    for (let i = 0; i < k; i++) {
      const w = 1 + (Math.random() * 2 - 1) * jitter;
      weights.push(w);
      wsum += w;
    }
    for (let i = 0; i < k; i++) {
      let add = Math.round((rem * weights[i]) / wsum);
      if (add > room) add = room;
      if (add < 0) add = 0;
      sel[i] += add;
    }
  }

  let diff = feasible - sel.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (diff !== 0 && guard++ < 1000000) {
    const i = Math.floor(Math.random() * k);
    if (diff > 0 && sel[i] < maxPerDay) {
      sel[i]++;
      diff--;
    } else if (diff < 0 && sel[i] > lo) {
      sel[i]--;
      diff++;
    }
  }

  for (let i = 0; i < k; i++) alloc[chosen[i]] = sel[i];
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
    const randInt = function (a, b) {
      return a + Math.floor(Math.random() * (b - a + 1));
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
    // WORK is written as an hours:minutes duration WITHOUT AM/PM (e.g. 8h 37m
    // -> "8:37"). Zero-work days stay as a plain 0.
    const writeWork = function (R, minutes) {
      if (col.work === undefined) return;
      let worked = minutes;
      if (worked < 0) worked += MIN_PER_DAY;
      worked = Math.round(worked);
      const cell = ensureCell(R, col.work, "General");
      if (worked > 0) {
        cell.v = worked / MIN_PER_DAY;
        cell.t = "n";
        cell.z = "[h]:mm";
      } else {
        cell.v = 0;
        cell.t = "n";
        cell.z = "General";
      }
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
        // otOk = OT may be added to this day ONLY if SPST is exactly "DP"
        // (not ABS/DP, PL/DP, etc.). Other present days are still cleaned but
        // never receive overtime.
        e.days.push({ R: R, siMin: siMin, soMin: soMin, otOk: ns === "DP" });
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
      // OT is distributed in WHOLE HOURS (1 or 2 per day) and ONLY to days whose
      // SPST is exactly "DP". The monthly OT is rounded to the nearest hour; any
      // hours that do not fit (capacity = pure-DP days x 2h) are simply dropped.
      const totalHours = Math.round(e.ot || 0);
      const otDays = e.days.filter((d) => d.otOk);
      const alloc = distributeOt(
        totalHours,
        otDays.length,
        OT_CONFIG.minOtHours,
        OT_CONFIG.maxOtHours,
        OT_CONFIG.jitter,
      );
      otDays.forEach((d, i) => {
        d.otHours = alloc[i];
      });

      for (let i = 0; i < e.days.length; i++) {
        const d = e.days[i];
        const otHours = d.otHours || 0; // whole hours of OT for this day (0..2)

        // Original punches are still in the cells at this point (pass 1 did not
        // touch eligible ARRV/DEPT) -> read them so we can keep the natural value.
        const origArr = readMin(d.R, col.arrv);
        const origDep = readMin(d.R, col.dept);
        const W = OT_CONFIG.naturalWindowMin;

        // ARRV never receives OT: keep the original punch when it is sane
        // (within +/-W of Shift In), else clean it to Shift In (drops AM/PM junk).
        let arr =
          origArr !== null && Math.abs(origArr - d.siMin) <= W
            ? origArr
            : d.siMin;
        if (arr < OT_CONFIG.minArrivalMin) arr = OT_CONFIG.minArrivalMin;

        // DEPT: start from the cleaned original departure punch (natural value),
        // then ADD the whole-hour OT for OT days (e.g. 9:45 PM + 1h -> 10:45 PM).
        let dep =
          origDep !== null && Math.abs(origDep - d.soMin) <= W
            ? origDep
            : d.soMin;
        if (otHours > 0) dep += otHours * 60;

        // Condition 1: for employees whose actual shift is 10h or longer, on a
        // day with NO OT the worked time must stay under 9.5h. If longer, trim the
        // departure to a little below 9.5h (random, so trimmed days vary).
        const shiftLen =
          (((d.soMin - d.siMin) % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
        if (otHours === 0 && shiftLen >= OT_CONFIG.longShiftMin) {
          let worked = dep - arr;
          if (worked < 0) worked += MIN_PER_DAY;
          if (worked > OT_CONFIG.noOtMaxWorkMin) {
            dep =
              arr +
              OT_CONFIG.noOtMaxWorkMin -
              randInt(1, OT_CONFIG.noOtTrimRandomMin);
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
