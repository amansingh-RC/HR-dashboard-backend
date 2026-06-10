function parseStoredDate(val) {
  if (val === null || val === undefined || val === "") return null;

  // Excel serial date — number or numeric string > 1000
  if (!isNaN(val) && Number(val) > 1000) {
    const excelStart = new Date(1899, 11, 30); // Excel epoch (with the 1900 leap-year quirk)
    return new Date(excelStart.getTime() + Number(val) * 86400000);
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d;
}

function dateToYMD(d) {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

module.exports = { parseStoredDate, dateToYMD };
