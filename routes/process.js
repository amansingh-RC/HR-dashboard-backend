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
  minOtHours: 1,
  maxOtHours: 2,
  arrvMaxLateMin: 20, // ARRV = Shift In + 0..20 min
  jitter: 0.4,
  otWorkedSlackMin: 10, // OT only on days whose worked is <= shift + 10 min
  maxWorkMin: 10 * 60, // trim trigger: worked over 10h
  trimTargetMin: 9.5 * 60, // ...is trimmed down to ~9.5h
  noOtTrimRandomMin: 30,
  naturalWindowMin: 60,
};

function distributeOt(totalMin, n, minPerDay, maxPerDay, jitter) {
  const alloc = new Array(n).fill(0);
  if (n <= 0 || totalMin <= 0) return alloc;

  const feasible = Math.min(totalMin, n * maxPerDay);
  const kMin = Math.ceil(feasible / maxPerDay);
  const kMax = Math.min(n, Math.floor(feasible / minPerDay));
  let k, lo;
  if (kMax < kMin) {
    k = Math.min(n, Math.max(1, kMin));
    lo = Math.floor(feasible / k);
  } else {
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

      // DP/ABS and ABS/DP: keep ARRV & DEPT as the original sheet, EXCEPT when the
      // worked time goes over 9.5h -- then trim it back below 9.5h (randomised):
      //   - ABS/DP -> trim the DEPT column (pull departure earlier)
      //   - DP/ABS -> trim the ARRV column (push arrival later)
      if (ns === "ABS/DP" || ns === "DP/ABS") {
        const a = readMin(R, col.arrv);
        const d = readMin(R, col.dept);
        if (a !== null && d !== null) {
          let w = d - a;
          if (w < 0) w += MIN_PER_DAY;
          if (w > OT_CONFIG.trimTargetMin) {
            const target =
              OT_CONFIG.trimTargetMin - randInt(1, OT_CONFIG.noOtTrimRandomMin);
            if (ns === "ABS/DP") {
              const deptCell = cellAt(R, col.dept);
              if (deptCell) writeTime(deptCell, a + target); // new DEPT = ARRV + target
            } else {
              const arrvCell = cellAt(R, col.arrv);
              if (arrvCell) writeTime(arrvCell, d - target); // new ARRV = DEPT - target
            }
            w = target;
          }
          writeWork(R, w);
        } else {
          writeWork(R, 0);
        }
        continue;
      }

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

        const W = OT_CONFIG.naturalWindowMin;
        const origDep = readMin(R, col.dept);
        const shiftLen =
          (((soMin - siMin) % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;

        // REQ 4: ARRV = Shift In + 0..20 min. (ABS/DP and DP/ABS were already
        // handled above and never reach here.)
        const arr = siMin + randInt(0, OT_CONFIG.arrvMaxLateMin);
        writeTime(ensureCell(R, col.arrv, "h:mm AM/PM"), arr);
        arrvFixed++;

        // DEPT base = cleaned original departure (original if sane, else Shift Out).
        let dep =
          origDep !== null && Math.abs(origDep - soMin) <= W ? origDep : soMin;

        // REQ 1: a base worked over 10h is trimmed down to ~9.5h (randomised).
        let baseWorked = dep - arr;
        if (baseWorked < 0) baseWorked += MIN_PER_DAY;
        if (baseWorked > OT_CONFIG.maxWorkMin) {
          dep =
            arr +
            OT_CONFIG.trimTargetMin -
            randInt(0, OT_CONFIG.noOtTrimRandomMin);
          baseWorked = dep - arr;
          if (baseWorked < 0) baseWorked += MIN_PER_DAY;
        }

        // REQ 2/3 gate: OT only when SPST is exactly "DP" AND the (trimmed) worked
        // time is at most 10 min above the shift hours.
        const otOk =
          ns === "DP" && baseWorked <= shiftLen + OT_CONFIG.otWorkedSlackMin;

        e.days.push({
          R: R,
          arr: arr,
          dep: dep,
          otOk: otOk,
          shiftLen: shiftLen,
        });
      } else {
        const origArr = readMin(R, col.arrv);
        const origDep = readMin(R, col.dept);
        // REQ 4: present non-DP/ABS rows (OD, CO+, ...) also get ARRV = Shift In
        // + 0..20 min. (ABS/DP and DP/ABS never reach here -- they are eligible.)
        let a = origArr;
        if (siMin !== null && (origArr !== null || origDep !== null)) {
          a = siMin + randInt(0, OT_CONFIG.arrvMaxLateMin);
          writeTime(ensureCell(R, col.arrv, "h:mm AM/PM"), a);
          arrvFixed++;
        }
        const d = origDep;
        if (a !== null && d !== null) {
          let w = d - a;
          if (w < 0) w += MIN_PER_DAY;
          // REQ 1: worked over 10h is trimmed down to ~9.5h.
          if (w > OT_CONFIG.maxWorkMin) {
            const target =
              OT_CONFIG.trimTargetMin - randInt(0, OT_CONFIG.noOtTrimRandomMin);
            const deptCell = cellAt(R, col.dept);
            if (deptCell) writeTime(deptCell, a + target);
            w = target;
          }
          writeWork(R, w);
        } else {
          writeWork(R, 0);
        }
      }
    }

    for (const e of employees.values()) {
      const otRaw = e.ot || 0;
      let intHours = Math.floor(otRaw);
      const fracMin = Math.round((otRaw - intHours) * 60); // e.g. 0.5h -> 30

      const otDays = e.days.filter((d) => d.otOk);
      const dayOtMin = new Array(otDays.length).fill(0);
      let pool = otDays.map((_, i) => i);

      // The fractional part (e.g. 0.5h) is parked on ONE day that gets 1 whole
      // hour, making it 1.5h -- never on a 2h day (that would exceed the 2h max).
      let halfPlaced = false;
      if (fracMin > 0 && intHours >= 1 && pool.length >= 1) {
        const halfIdx = pool[Math.floor(Math.random() * pool.length)];
        dayOtMin[halfIdx] = 60 + fracMin; // 1h + frac
        intHours -= 1;
        pool = pool.filter((i) => i !== halfIdx);
        halfPlaced = true;
      }

      // Distribute the remaining WHOLE hours (1 or 2 per day) over the rest.
      const alloc = distributeOt(
        intHours,
        pool.length,
        OT_CONFIG.minOtHours,
        OT_CONFIG.maxOtHours,
        OT_CONFIG.jitter,
      );
      for (let j = 0; j < pool.length; j++) dayOtMin[pool[j]] += alloc[j] * 60;

      // Lone fractional OT (no whole hours, e.g. 0.5h) -> put it on one day.
      if (fracMin > 0 && !halfPlaced && otDays.length >= 1) {
        dayOtMin[Math.floor(Math.random() * otDays.length)] += fracMin;
      }

      otDays.forEach((d, i) => {
        d.otMin = dayOtMin[i];
      });

      for (let i = 0; i < e.days.length; i++) {
        const d = e.days[i];
        const otMin = d.otMin || 0;

        // REQ 5: on an OT day the worked time = shift hours + OT hours (start the
        // day's value at 0, then add shift + OT). Non-OT days keep the cleaned/
        // trimmed base departure.
        const arr = d.arr;
        let dep = otMin > 0 ? arr + d.shiftLen + otMin : d.dep;

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
