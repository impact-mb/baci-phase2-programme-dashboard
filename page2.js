const MULTIPLE_SUMMARY_FILE =
  "data/BACI_Multiple_Session_Bucket_Summary.csv";

const SUNDAY_SUMMARY_FILE =
  "data/BACI_District_Wise_Sunday_Session_Summary.csv";

let multipleRows = [];
let sundayRows = [];

const districtFilter = document.getElementById("analysisDistrictFilter");
const monthFilter = document.getElementById("analysisMonthFilter");
const resetFilters = document.getElementById("resetAnalysisFilters");

const multipleTable = document.getElementById("multipleSessionTable");
const sundayTable = document.getElementById("sundaySessionTable");

const multipleMessage = document.getElementById("multipleMessage");
const sundayMessage = document.getElementById("sundayMessage");
const sundayStatus = document.getElementById("sundayStatus");

const downloadMultipleBtn = document.getElementById("downloadMultipleSummary");
const downloadSundayBtn = document.getElementById("downloadSundaySummary");

const kpiMultipleCases = document.getElementById("kpiMultipleCases");
const kpiMultipleChildren = document.getElementById("kpiMultipleChildren");
const kpiSundaySessions = document.getElementById("kpiSundaySessions");
const kpiSundayChildren = document.getElementById("kpiSundayChildren");

document.addEventListener("DOMContentLoaded", loadPage2Data);

async function loadPage2Data() {
  try {
    const [multipleResponse, sundayResponse] = await Promise.all([
      fetch(MULTIPLE_SUMMARY_FILE, { cache: "no-store" }),
      fetch(SUNDAY_SUMMARY_FILE, { cache: "no-store" })
    ]);

    if (!multipleResponse.ok) {
      throw new Error(`Could not load ${MULTIPLE_SUMMARY_FILE}`);
    }

    if (!sundayResponse.ok) {
      throw new Error(`Could not load ${SUNDAY_SUMMARY_FILE}`);
    }

    const multipleParsed = parseCSV(await multipleResponse.text());
    const sundayParsed = parseCSV(await sundayResponse.text());

    multipleRows = multipleParsed.rows;
    sundayRows = sundayParsed.rows;

    populateFilters();
    renderPage2();

    hideMessage(multipleMessage);
    hideMessage(sundayMessage);

  } catch (error) {
    console.error(error);

    showMessage(
      multipleMessage,
      error.message,
      "error"
    );

    showMessage(
      sundayMessage,
      "Make sure both analysis CSV files are inside the data folder.",
      "error"
    );

    sundayStatus.textContent = "Analysis CSV files not loaded";
  }
}

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      currentRow.push(currentCell);

      if (currentRow.some(v => v.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length || currentRow.length) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  if (!rows.length) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h, i) => {
    let value = h.trim();
    if (i === 0) {
      value = value.replace(/^\uFEFF/, "");
    }
    return value;
  });

  const dataRows = rows.slice(1).map(values => {
    const row = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").trim();
    });

    return row;
  });

  return { headers, rows: dataRows };
}

function getDistrict(row) {
  return (
    row.DISTRICTNAME ||
    row.District ||
    ""
  ).trim();
}

function getMonthFromDate(row) {
  const dateText = (
    row.SessionDateStr ||
    row.Attendance_Date ||
    ""
  ).trim();

  const match = dateText.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) return "";

  const monthNames = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December"
  };

  return `${monthNames[match[2]]}${match[3]}`;
}

function monthSortValue(value) {
  const match = value.match(/^([A-Za-z]+)(\d{4})$/);

  if (!match) return 0;

  const monthNo = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12
  };

  return Number(match[2]) * 100 + monthNo[match[1]];
}

function populateFilters() {
  const districts = [
    ...new Set(
      sundayRows
        .map(getDistrict)
        .filter(Boolean)
    )
  ].sort();

  setSelectOptions(
    districtFilter,
    districts,
    "All Districts"
  );

  const months = [
    ...new Set(
      sundayRows
        .map(getMonthFromDate)
        .filter(Boolean)
    )
  ].sort((a, b) => monthSortValue(a) - monthSortValue(b));

  setSelectOptions(
    monthFilter,
    months,
    "All Months"
  );
}

function setSelectOptions(select, values, allLabel) {
  const current = select.value;

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(current)) {
    select.value = current;
  }
}

function getFilteredSundayRows() {
  const district = districtFilter.value;
  const month = monthFilter.value;

  return sundayRows.filter(row => {
    const districtOK =
      !district || getDistrict(row) === district;

    const monthOK =
      !month || getMonthFromDate(row) === month;

    return districtOK && monthOK;
  });
}

function getFilteredMultipleRows() {
  const district = districtFilter.value;

  // Current overall bucket summary may not contain District.
  // If future CSV contains District/DISTRICTNAME, district filter works automatically.
  if (
    district &&
    multipleRows.some(row => getDistrict(row))
  ) {
    return multipleRows.filter(
      row => getDistrict(row) === district
    );
  }

  return [...multipleRows];
}

function renderPage2() {
  const filteredMultiple = getFilteredMultipleRows();
  const filteredSunday = getFilteredSundayRows();

  renderTable(
    multipleTable,
    filteredMultiple,
    ["District", "DISTRICTNAME", "Bucket", "Cases", "Unique_ChildIDs"]
  );

  renderTable(
    sundayTable,
    filteredSunday,
    [
      "DISTRICTNAME",
      "YMName",
      "TMOName",
      "SessionDateStr",
      "DayName",
      "Unique_Children",
      "Sessions_Delivered",
      "Unique_Curriculum_Codes"
    ]
  );

  updateKPIs(filteredMultiple, filteredSunday);

  sundayStatus.textContent =
    `${filteredSunday.length.toLocaleString()} Sunday summary row(s) shown`;
}

function renderTable(table, rows, preferredHeaders) {
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td class="empty-cell">No matching records found.</td></tr>`;
    return;
  }

  const headers = preferredHeaders.filter(
    header => rows.some(row =>
      Object.prototype.hasOwnProperty.call(row, header)
    )
  );

  const finalHeaders = headers.length
    ? headers
    : Object.keys(rows[0]);

  const headRow = document.createElement("tr");

  finalHeaders.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);

  rows.forEach(row => {
    const tr = document.createElement("tr");

    finalHeaders.forEach(header => {
      const td = document.createElement("td");
      td.textContent = row[header] ?? "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function updateKPIs(multipleData, sundayData) {
  // Prefer AllCases row for overall bucket metrics.
  const allCaseRows = multipleData.filter(
    row => (row.Bucket || "").trim() === "AllCases"
  );

  const multiCases = allCaseRows.reduce(
    (sum, row) => sum + numberValue(row.Cases),
    0
  );

  const multiChildren = allCaseRows.reduce(
    (sum, row) => sum + numberValue(row.Unique_ChildIDs),
    0
  );

  const sundaySessions = sundayData.reduce(
    (sum, row) => sum + numberValue(row.Sessions_Delivered),
    0
  );

  // District summary may repeat a child across dates, so this is
  // the sum of date-level unique counts, not deduplicated lifetime children.
  const sundayChildren = sundayData.reduce(
    (sum, row) => sum + numberValue(row.Unique_Children),
    0
  );

  kpiMultipleCases.textContent =
    multiCases.toLocaleString();

  kpiMultipleChildren.textContent =
    multiChildren.toLocaleString();

  kpiSundaySessions.textContent =
    sundaySessions.toLocaleString();

  kpiSundayChildren.textContent =
    sundayChildren.toLocaleString();
}

function numberValue(value) {
  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function downloadCSV(rows, filename) {
  if (!rows.length) {
    alert("No data available to export.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const escapeCSV = value => {
    const str = String(value ?? "");

    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  const lines = [
    headers.map(escapeCSV).join(","),
    ...rows.map(row =>
      headers.map(header => escapeCSV(row[header])).join(",")
    )
  ];

  const blob = new Blob(
    ["\uFEFF" + lines.join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.classList.remove("hidden");

  if (type) {
    element.dataset.type = type;
  }
}

function hideMessage(element) {
  element.classList.add("hidden");
  element.textContent = "";
}

districtFilter.addEventListener("change", renderPage2);
monthFilter.addEventListener("change", renderPage2);

resetFilters.addEventListener("click", () => {
  districtFilter.value = "";
  monthFilter.value = "";
  renderPage2();
});

downloadMultipleBtn.addEventListener("click", () => {
  downloadCSV(
    getFilteredMultipleRows(),
    "BACI_Multiple_Session_Summary.csv"
  );
});

downloadSundayBtn.addEventListener("click", () => {
  downloadCSV(
    getFilteredSundayRows(),
    "BACI_Sunday_Session_Summary_Filtered.csv"
  );
});
