const PROGRAMME_DATA_FILE = "data/01_Programme_Summary.csv";

const CHILD_DATA_FILES = {
  "AHMADABAD": "data/ChildID_Session_Date_Matrix_AHMADABAD.csv",
  "CHENNAI": "data/ChildID_Session_Date_Matrix_CHENNAI.csv",
  "GREATER HYDERABAD": "data/ChildID_Session_Date_Matrix_GREATER_HYDERABAD.csv",
  "MUMBAI": "data/ChildID_Session_Date_Matrix_MUMBAI.csv",
  "NORTH WEST DELHI": "data/ChildID_Session_Date_Matrix_NORTH_WEST_DELHI.csv"
};

const CHILD_SESSION_COLUMNS = [
  "CLS/RB/Y1/SS1",
  "CLS/RB/Y1/SS2",
  "CLS/Y1/SA/C1/SS3",
  "CLS/Y1/SA/C1/SS4",
  "CLS/Y1/CM/C1/SS5",
  "CLS/Y1/EM/C1/SS6",
  "CLS/Y1/EM/C2/SS7",
  "CLS/Y1/SA/C2/SS8",
  "CLS/Y1/SA/C3/SS9",
  "CLS/Y1/SA/C2/SS10",
  "CLS/Y1/PS/C1/SS11",
  "CLS/Y1/PS/C2/SS12",
  "CLS/Y1/NE/C2/SS13",
  "CLS/Y1/EM/SS14"
];

const CHILD_VISIBLE_HEADERS = [
  "ChildID",
  ...CHILD_SESSION_COLUMNS
];

const HIDDEN_COLUMNS = new Set([
  "Unique_Children_Atleast_1_Session",
  "Region",
  "Target_Outreach",
  "Total_Session_Attendance",
  "Sessions_Conducted",
  "Average_Sessions_Per_Child"
]);

let allRows = [];
let filteredRows = [];
let headers = [];
let visibleHeaders = [];

let currentChildRows = [];
let filteredChildRows = [];
let selectedChildDistrict = "";

// Sorting state
let programmeSort = {
  column: null,
  direction: "asc"
};

let childSort = {
  column: "ChildID",
  direction: "asc"
};

// Global FY / Month
const fyFilter = document.getElementById("fyFilter");
const monthFilter = document.getElementById("monthFilter");

const regionFilter = document.getElementById("regionFilter");
const stateFilter = document.getElementById("stateFilter");
const districtFilter = document.getElementById("districtFilter");
const programSubtypeFilter = document.getElementById("programSubtypeFilter");

const resetFilters = document.getElementById("resetFilters");
const downloadAll = document.getElementById("downloadAll");
const downloadFiltered = document.getElementById("downloadFiltered");
const exportProgrammeTable = document.getElementById("exportProgrammeTable");

const programmeTable = document.getElementById("programmeTable");
const programmeThead = programmeTable.querySelector("thead");
const programmeTbody = programmeTable.querySelector("tbody");

const tableStatus = document.getElementById("tableStatus");
const messageBox = document.getElementById("messageBox");

const childDistrictFilter = document.getElementById("childDistrictFilter");
const childIdSearch = document.getElementById("childIdSearch");
const clearChildSearch = document.getElementById("clearChildSearch");
const downloadChildMatrix = document.getElementById("downloadChildMatrix");

const childMatrixTable = document.getElementById("childMatrixTable");
const childMatrixThead = childMatrixTable.querySelector("thead");
const childMatrixTbody = childMatrixTable.querySelector("tbody");

const childTableTitle = document.getElementById("childTableTitle");
const childTableStatus = document.getElementById("childTableStatus");
const childMessageBox = document.getElementById("childMessageBox");

document.addEventListener("DOMContentLoaded", () => {
  loadProgrammeData();
});

async function loadProgrammeData() {
  try {
    const response = await fetch(PROGRAMME_DATA_FILE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsed = parseCSV(csvText);

    headers = parsed.headers;
    visibleHeaders = headers.filter(header => !HIDDEN_COLUMNS.has(header));

    allRows = parsed.rows;
    filteredRows = [...allRows];

    populateProgrammeFilters();
    applyProgrammeSort();
    renderProgrammeTable();

    tableStatus.textContent =
      `${filteredRows.length.toLocaleString("en-IN")} record(s) shown`;

    hideMessage(messageBox);

  } catch (error) {
    console.error(error);

    tableStatus.textContent = "CSV not loaded";

    showMessage(
      messageBox,
      "Unable to load data/01_Programme_Summary.csv.",
      "error"
    );
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

      if (currentRow.some(value => value.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  if (!rows.length) {
    return { headers: [], rows: [] };
  }

  const csvHeaders = rows[0].map((header, index) => {
    let clean = header.trim();

    if (index === 0) {
      clean = clean.replace(/^\uFEFF/, "");
    }

    return clean;
  });

  const dataRows = rows.slice(1).map(values => {
    const row = {};

    csvHeaders.forEach((header, index) => {
      let value = (values[index] ?? "").trim();

      if (header === "ChildID") {
        value = normalizeChildID(value);
      }

      row[header] = value;
    });

    return row;
  });

  return {
    headers: csvHeaders,
    rows: dataRows
  };
}

function normalizeChildID(value) {
  const text = String(value ?? "").trim();

  if (/^\d+\.0+$/.test(text)) {
    return text.replace(/\.0+$/, "");
  }

  return text;
}

function populateProgrammeFilters() {
  setFilterOptions(regionFilter, getUniqueValues(allRows, "Region"), "All Regions");
  setFilterOptions(stateFilter, getUniqueValues(allRows, "STATENAME"), "All States");
  setFilterOptions(districtFilter, getUniqueValues(allRows, "DISTRICTNAME"), "All Districts");
  setFilterOptions(
    programSubtypeFilter,
    getUniqueValues(allRows, "ProgramSubType"),
    "All Programme Types"
  );
}

function getUniqueValues(rows, columnName) {
  return [
    ...new Set(
      rows
        .map(row => row[columnName])
        .filter(value => value && value.trim() !== "")
    )
  ].sort((a, b) => a.localeCompare(b));
}

function setFilterOptions(selectElement, values, defaultLabel) {
  const currentValue = selectElement.value;

  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  if (values.includes(currentValue)) {
    selectElement.value = currentValue;
  }
}

function applyProgrammeFilters() {
  const region = regionFilter.value;
  const state = stateFilter.value;
  const district = districtFilter.value;
  const subtype = programSubtypeFilter.value;

  filteredRows = allRows.filter(row => {
    const matchesRegion = !region || row["Region"] === region;
    const matchesState = !state || row["STATENAME"] === state;
    const matchesDistrict = !district || row["DISTRICTNAME"] === district;
    const matchesSubtype = !subtype || row["ProgramSubType"] === subtype;

    return (
      matchesRegion &&
      matchesState &&
      matchesDistrict &&
      matchesSubtype
    );
  });

  applyProgrammeSort();
  renderProgrammeTable();

  tableStatus.textContent =
    `${filteredRows.length.toLocaleString("en-IN")} record(s) shown`;
}

// ============================================================
// SORT HELPERS
// ============================================================

function smartCompare(a, b, column, direction) {
  const dir = direction === "asc" ? 1 : -1;

  const av = a[column] ?? "";
  const bv = b[column] ?? "";

  // Numeric session columns
  if (/\/SS\d+$/i.test(column)) {
    return (toNumber(av) - toNumber(bv)) * dir;
  }

  // ChildID numeric sorting
  if (column === "ChildID") {
    return (toNumber(av) - toNumber(bv)) * dir;
  }

  // Session date columns in DD-MM-YYYY HH:MM format
  if (CHILD_SESSION_COLUMNS.includes(column)) {
    const ad = parseSessionDate(av);
    const bd = parseSessionDate(bv);

    if (ad === null && bd === null) return 0;
    if (ad === null) return 1;
    if (bd === null) return -1;

    return (ad - bd) * dir;
  }

  return String(av).localeCompare(
    String(bv),
    undefined,
    { numeric: true, sensitivity: "base" }
  ) * dir;
}

function parseSessionDate(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  // If multiple dates are present, use the first date for sorting/filtering
  const firstDate = text.split("|")[0].trim();

  const match = firstDate.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [, dd, mm, yyyy, hh, min, ss = "00"] = match;

  return new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(ss)
  ).getTime();
}

function applyProgrammeSort() {
  if (!programmeSort.column) {
    return;
  }

  filteredRows.sort((a, b) =>
    smartCompare(
      a,
      b,
      programmeSort.column,
      programmeSort.direction
    )
  );
}

function applyChildSort() {
  if (!childSort.column) {
    return;
  }

  filteredChildRows.sort((a, b) =>
    smartCompare(
      a,
      b,
      childSort.column,
      childSort.direction
    )
  );
}

function toggleProgrammeSort(column) {
  if (programmeSort.column === column) {
    programmeSort.direction =
      programmeSort.direction === "asc" ? "desc" : "asc";
  } else {
    programmeSort.column = column;
    programmeSort.direction = "asc";
  }

  applyProgrammeSort();
  renderProgrammeTable();
}

function toggleChildSort(column) {
  if (childSort.column === column) {
    childSort.direction =
      childSort.direction === "asc" ? "desc" : "asc";
  } else {
    childSort.column = column;
    childSort.direction = "asc";
  }

  applyChildSort();
  renderChildMatrix();
}

function addSortableHeader(th, column, sortState, clickHandler) {
  th.classList.add("sortable");

  const label = document.createElement("span");
  label.textContent = column;

  const indicator = document.createElement("span");
  indicator.className = "sort-indicator";

  if (sortState.column === column) {
    indicator.textContent =
      sortState.direction === "asc" ? "▲" : "▼";
  } else {
    indicator.textContent = "↕";
  }

  th.appendChild(label);
  th.appendChild(indicator);

  th.addEventListener("click", () => clickHandler(column));
}

// ============================================================
// PROGRAMME TABLE
// ============================================================

function renderProgrammeTable() {
  programmeThead.innerHTML = "";
  programmeTbody.innerHTML = "";

  if (!visibleHeaders.length) {
    return;
  }

  const headerRow = document.createElement("tr");

  visibleHeaders.forEach(header => {
    const th = document.createElement("th");

    addSortableHeader(
      th,
      header,
      programmeSort,
      toggleProgrammeSort
    );

    headerRow.appendChild(th);
  });

  programmeThead.appendChild(headerRow);

  filteredRows.forEach(row => {
    const tr = document.createElement("tr");

    visibleHeaders.forEach(header => {
      const td = document.createElement("td");
      const value = row[header] ?? "";

      td.textContent = formatProgrammeCell(header, value);

      if (isSessionNumericColumn(header)) {
        td.classList.add("numeric");
      }

      if (header === "PROGRAMLAUNCHNAME") {
        td.classList.add("long-text");
      }

      tr.appendChild(td);
    });

    programmeTbody.appendChild(tr);
  });
}

function formatProgrammeCell(header, value) {
  if (value === "") {
    return "";
  }

  if (isSessionNumericColumn(header)) {
    const number = toNumber(value);

    if (Number.isFinite(number)) {
      return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
      });
    }
  }

  return value;
}

function isSessionNumericColumn(header) {
  return /\/SS\d+$/i.test(header);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

// ============================================================
// CHILD MATRIX LOAD / FILTER
// ============================================================

async function loadChildDistrictData(district) {
  selectedChildDistrict = district;
  currentChildRows = [];
  filteredChildRows = [];

  childMatrixThead.innerHTML = "";
  childMatrixTbody.innerHTML = "";
  childIdSearch.value = "";

  if (!district) {
    childIdSearch.disabled = true;
    childTableTitle.textContent = "District Child Session Data";
    childTableStatus.textContent = "Select a district to load data";
    return;
  }

  childIdSearch.disabled = false;

  const file = CHILD_DATA_FILES[district];

  try {
    showMessage(
      childMessageBox,
      `Loading ${district} child session data...`,
      "info"
    );

    const response = await fetch(file, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsed = parseCSV(csvText);

    currentChildRows = parsed.rows;

    applyChildFilters();

    childTableTitle.textContent = `${district} — Child Session Matrix`;

    hideMessage(childMessageBox);

  } catch (error) {
    console.error(error);

    childTableStatus.textContent = "CSV not loaded";

    showMessage(
      childMessageBox,
      `Unable to load ${file}.`,
      "error"
    );
  }
}

function sessionValueMatchesMonth(value, monthCode) {
  if (!monthCode) {
    return true;
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return false;
  }

  // Support one or more session dates separated by |
  const dates = text.split("|").map(x => x.trim()).filter(Boolean);

  return dates.some(dateText => {
    const match = dateText.match(/^(\d{2})-(\d{2})-(\d{4})/);

    if (!match) {
      return false;
    }

    const [, dd, mm, yyyy] = match;

    // FY 2026-27:
    // Apr-Dec => 2026
    // Jan-Mar => 2027
    const expectedYear =
      ["01", "02", "03"].includes(monthCode)
        ? "2027"
        : "2026";

    return mm === monthCode && yyyy === expectedYear;
  });
}

function getMonthFilteredValue(value) {
  const monthCode = monthFilter.value;

  if (!monthCode || !value) {
    return value ?? "";
  }

  const dates = String(value)
    .split("|")
    .map(x => x.trim())
    .filter(Boolean);

  const matchingDates = dates.filter(dateText =>
    sessionValueMatchesMonth(dateText, monthCode)
  );

  return matchingDates.join(" | ");
}

function applyChildFilters() {
  const query = childIdSearch.value.trim().toLowerCase();
  const selectedMonth = monthFilter.value;

  filteredChildRows = currentChildRows
    .map(row => {
      const copy = { ...row };

      // When month is selected, blank session dates outside that month
      if (selectedMonth) {
        CHILD_SESSION_COLUMNS.forEach(col => {
          copy[col] = getMonthFilteredValue(row[col] ?? "");
        });
      }

      return copy;
    })
    .filter(row => {
      const matchesChild =
        !query ||
        String(row["ChildID"] ?? "")
          .toLowerCase()
          .includes(query);

      if (!matchesChild) {
        return false;
      }

      // If month selected, child must have at least one session in that month
      if (selectedMonth) {
        return CHILD_SESSION_COLUMNS.some(
          col => String(row[col] ?? "").trim() !== ""
        );
      }

      return true;
    });

  applyChildSort();
  renderChildMatrix();

  const monthLabel =
    monthFilter.options[monthFilter.selectedIndex]?.text || "All Months";

  childTableStatus.textContent =
    `${filteredChildRows.length.toLocaleString("en-IN")} child record(s) shown • ${monthLabel}`;
}

function renderChildMatrix() {
  childMatrixThead.innerHTML = "";
  childMatrixTbody.innerHTML = "";

  const headerRow = document.createElement("tr");

  CHILD_VISIBLE_HEADERS.forEach(header => {
    const th = document.createElement("th");

    addSortableHeader(
      th,
      header,
      childSort,
      toggleChildSort
    );

    headerRow.appendChild(th);
  });

  childMatrixThead.appendChild(headerRow);

  filteredChildRows.forEach(row => {
    const tr = document.createElement("tr");

    CHILD_VISIBLE_HEADERS.forEach(header => {
      const td = document.createElement("td");

      let value = row[header] ?? "";

      if (header === "ChildID") {
        value = normalizeChildID(value);
        td.classList.add("numeric");
      }

      td.textContent = value;

      tr.appendChild(td);
    });

    childMatrixTbody.appendChild(tr);
  });
}

// ============================================================
// CSV EXPORT
// ============================================================

function escapeCSV(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCSV(rows, exportHeaders) {
  const lines = [];

  lines.push(
    exportHeaders
      .map(escapeCSV)
      .join(",")
  );

  rows.forEach(row => {
    lines.push(
      exportHeaders
        .map(header => {
          let value = row[header] ?? "";

          if (header === "ChildID") {
            value = normalizeChildID(value);
          }

          return escapeCSV(value);
        })
        .join(",")
    );
  });

  return lines.join("\r\n");
}

function downloadCSV(rows, exportHeaders, fileName) {
  if (!rows.length) {
    alert("No data available to download.");
    return;
  }

  const csvText = buildCSV(rows, exportHeaders);

  const blob = new Blob(
    ["\uFEFF" + csvText],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================================
// MESSAGE HELPERS
// ============================================================

function showMessage(element, message, type = "info") {
  element.className = `message-box ${type}`;
  element.textContent = message;
}

function hideMessage(element) {
  element.className = "message-box hidden";
  element.textContent = "";
}

// ============================================================
// EVENTS
// ============================================================

regionFilter.addEventListener("change", applyProgrammeFilters);
stateFilter.addEventListener("change", applyProgrammeFilters);
districtFilter.addEventListener("change", applyProgrammeFilters);
programSubtypeFilter.addEventListener("change", applyProgrammeFilters);

resetFilters.addEventListener("click", () => {
  regionFilter.value = "";
  stateFilter.value = "";
  districtFilter.value = "";
  programSubtypeFilter.value = "";

  filteredRows = [...allRows];

  programmeSort = {
    column: null,
    direction: "asc"
  };

  populateProgrammeFilters();
  renderProgrammeTable();

  tableStatus.textContent =
    `${filteredRows.length.toLocaleString("en-IN")} record(s) shown`;
});

downloadAll.addEventListener("click", () => {
  downloadCSV(
    allRows,
    visibleHeaders,
    "BACI_Phase2_Programme_Summary_All.csv"
  );
});

downloadFiltered.addEventListener("click", () => {
  downloadCSV(
    filteredRows,
    visibleHeaders,
    "BACI_Phase2_Programme_Summary_Filtered.csv"
  );
});

exportProgrammeTable.addEventListener("click", () => {
  downloadCSV(
    filteredRows,
    visibleHeaders,
    "BACI_Phase2_Programme_Level_Attendance.csv"
  );
});

childDistrictFilter.addEventListener("change", event => {
  loadChildDistrictData(event.target.value);
});

childIdSearch.addEventListener("input", applyChildFilters);

clearChildSearch.addEventListener("click", () => {
  childIdSearch.value = "";
  applyChildFilters();
});

monthFilter.addEventListener("change", () => {
  if (selectedChildDistrict && currentChildRows.length) {
    applyChildFilters();
  }
});

fyFilter.addEventListener("change", () => {
  // Current dashboard is configured for FY 2026-27.
  // Kept as a filter structure so additional FYs can be added later.
  if (selectedChildDistrict && currentChildRows.length) {
    applyChildFilters();
  }
});

downloadChildMatrix.addEventListener("click", () => {
  if (!selectedChildDistrict || !filteredChildRows.length) {
    alert("Please select a district first.");
    return;
  }

  const safeDistrict = selectedChildDistrict.replace(/\s+/g, "_");
  const monthText =
    monthFilter.value
      ? monthFilter.options[monthFilter.selectedIndex].text.replace(/\s+/g, "_")
      : "All_Months";

  downloadCSV(
    filteredChildRows,
    CHILD_VISIBLE_HEADERS,
    `ChildID_Session_Date_Matrix_${safeDistrict}_${monthText}.csv`
  );
});
