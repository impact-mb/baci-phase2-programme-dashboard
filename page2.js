const MULTIPLE_SUMMARY_FILE =
  "data/BACI_Multiple_Session_Bucket_Summary.csv";

const SUNDAY_SUMMARY_FILE =
  "data/BACI_All_Locations_Sunday_Session_Summary.csv";


let multipleRows = [];
let sundayRows = [];


const districtFilter =
  document.getElementById("analysisDistrictFilter");

const monthFilter =
  document.getElementById("analysisMonthFilter");

const resetFilters =
  document.getElementById("resetAnalysisFilters");

const multipleTable =
  document.getElementById("multipleSessionTable");

const sundayTable =
  document.getElementById("sundaySessionTable");

const multipleMessage =
  document.getElementById("multipleMessage");

const sundayMessage =
  document.getElementById("sundayMessage");

const multipleStatus =
  document.getElementById("multipleStatus");

const sundayStatus =
  document.getElementById("sundayStatus");

const downloadMultipleBtn =
  document.getElementById("downloadMultipleSummary");

const downloadSundayBtn =
  document.getElementById("downloadSundaySummary");


document.addEventListener(
  "DOMContentLoaded",
  loadPage2Data
);


// ============================================================
// LOAD DATA
// ============================================================

async function loadPage2Data() {

  try {

    const [
      multipleResponse,
      sundayResponse
    ] = await Promise.all([

      fetch(
        MULTIPLE_SUMMARY_FILE,
        { cache: "no-store" }
      ),

      fetch(
        SUNDAY_SUMMARY_FILE,
        { cache: "no-store" }
      )

    ]);


    if (!multipleResponse.ok) {
      throw new Error(
        `Could not load ${MULTIPLE_SUMMARY_FILE}`
      );
    }


    if (!sundayResponse.ok) {
      throw new Error(
        `Could not load ${SUNDAY_SUMMARY_FILE}`
      );
    }


    const multipleParsed =
      parseCSV(await multipleResponse.text());

    const sundayParsed =
      parseCSV(await sundayResponse.text());


    multipleRows = multipleParsed.rows;
    sundayRows = sundayParsed.rows;


    populateFilters();
    renderPage2();


    hideMessage(multipleMessage);
    hideMessage(sundayMessage);

  }

  catch (error) {

    console.error(error);

    showMessage(
      multipleMessage,
      error.message
    );

    showMessage(
      sundayMessage,
      "Check that both Page 2 CSV files exist inside the data folder."
    );

    multipleStatus.textContent = "";
    sundayStatus.textContent = "";

  }

}


// ============================================================
// CSV PARSER
// ============================================================

function parseCSV(text) {

  const rows = [];

  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;


  for (let i = 0; i < text.length; i++) {

    const char = text[i];
    const nextChar = text[i + 1];


    if (
      char === '"' &&
      insideQuotes &&
      nextChar === '"'
    ) {

      currentCell += '"';
      i++;
      continue;

    }


    if (char === '"') {

      insideQuotes = !insideQuotes;
      continue;

    }


    if (
      char === "," &&
      !insideQuotes
    ) {

      currentRow.push(currentCell);
      currentCell = "";
      continue;

    }


    if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {

      if (
        char === "\r" &&
        nextChar === "\n"
      ) {
        i++;
      }


      currentRow.push(currentCell);


      if (
        currentRow.some(
          value => value.trim() !== ""
        )
      ) {

        rows.push(currentRow);

      }


      currentRow = [];
      currentCell = "";

      continue;

    }


    currentCell += char;

  }


  if (
    currentCell.length ||
    currentRow.length
  ) {

    currentRow.push(currentCell);
    rows.push(currentRow);

  }


  if (!rows.length) {

    return {
      headers: [],
      rows: []
    };

  }


  const headers = rows[0].map(
    (header, index) => {

      let value = header.trim();

      if (index === 0) {
        value = value.replace(/^\uFEFF/, "");
      }

      return value;

    }
  );


  const dataRows = rows
    .slice(1)
    .map(values => {

      const row = {};

      headers.forEach(
        (header, index) => {

          row[header] =
            (values[index] ?? "").trim();

        }
      );

      return row;

    });


  return {
    headers,
    rows: dataRows
  };

}


// ============================================================
// DISTRICT / MONTH HELPERS
// ============================================================

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


  const match =
    dateText.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );


  if (!match) {
    return "";
  }


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

  const match =
    value.match(
      /^([A-Za-z]+)(\d{4})$/
    );


  if (!match) {
    return 0;
  }


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


  return (
    Number(match[2]) * 100 +
    monthNo[match[1]]
  );

}


// ============================================================
// FILTER OPTIONS
// ============================================================

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
  ].sort(
    (a, b) =>
      monthSortValue(a) -
      monthSortValue(b)
  );


  setSelectOptions(
    monthFilter,
    months,
    "All Months"
  );

}


function setSelectOptions(
  selectElement,
  values,
  allLabel
) {

  const currentValue =
    selectElement.value;


  selectElement.innerHTML = "";


  const allOption =
    document.createElement("option");

  allOption.value = "";
  allOption.textContent = allLabel;

  selectElement.appendChild(allOption);


  values.forEach(value => {

    const option =
      document.createElement("option");

    option.value = value;
    option.textContent = value;

    selectElement.appendChild(option);

  });


  if (
    values.includes(currentValue)
  ) {

    selectElement.value =
      currentValue;

  }

}


// ============================================================
// FILTER DATA
// ============================================================

function getFilteredSundayRows() {

  const selectedDistrict =
    districtFilter.value;

  const selectedMonth =
    monthFilter.value;


  return sundayRows.filter(row => {

    const districtOK =
      !selectedDistrict ||
      getDistrict(row) === selectedDistrict;


    const monthOK =
      !selectedMonth ||
      getMonthFromDate(row) === selectedMonth;


    return (
      districtOK &&
      monthOK
    );

  });

}


function getFilteredMultipleRows() {

  const selectedDistrict =
    districtFilter.value;


  if (
    selectedDistrict &&
    multipleRows.some(
      row => getDistrict(row)
    )
  ) {

    return multipleRows.filter(
      row =>
        getDistrict(row) ===
        selectedDistrict
    );

  }


  return [...multipleRows];

}


// ============================================================
// RENDER PAGE
// ============================================================

function renderPage2() {

  const filteredMultiple =
    getFilteredMultipleRows();

  const filteredSunday =
    getFilteredSundayRows();


  renderTable(
    multipleTable,
    filteredMultiple,
    [
      "District",
      "DISTRICTNAME",
      "Bucket",
      "Cases",
      "Unique_ChildIDs"
    ]
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


  updateStatusText(
    filteredMultiple,
    filteredSunday
  );

}


// ============================================================
// STATUS TEXT
// ============================================================

function updateStatusText(
  filteredMultiple,
  filteredSunday
) {

  multipleStatus.textContent =
    `${filteredMultiple.length.toLocaleString()} summary row(s) shown`;


  sundayStatus.textContent =
    `${filteredSunday.length.toLocaleString()} Sunday summary row(s) shown`;

}


// ============================================================
// GENERIC TABLE RENDER
// ============================================================

function renderTable(
  tableElement,
  rows,
  preferredHeaders
) {

  const thead =
    tableElement.querySelector("thead");

  const tbody =
    tableElement.querySelector("tbody");


  thead.innerHTML = "";
  tbody.innerHTML = "";


  if (!rows.length) {

    tbody.innerHTML =
      `<tr>
        <td class="empty-cell">
          No matching records found.
        </td>
      </tr>`;

    return;

  }


  const headers =
    preferredHeaders.filter(
      header =>
        rows.some(
          row =>
            Object.prototype
              .hasOwnProperty
              .call(row, header)
        )
    );


  const finalHeaders =
    headers.length
      ? headers
      : Object.keys(rows[0]);


  const headRow =
    document.createElement("tr");


  finalHeaders.forEach(header => {

    const th =
      document.createElement("th");

    th.textContent = header;

    headRow.appendChild(th);

  });


  thead.appendChild(headRow);


  rows.forEach(row => {

    const tr =
      document.createElement("tr");


    finalHeaders.forEach(header => {

      const td =
        document.createElement("td");

      td.textContent =
        row[header] ?? "";

      tr.appendChild(td);

    });


    tbody.appendChild(tr);

  });

}


// ============================================================
// DOWNLOAD CSV
// ============================================================

function downloadCSV(
  rows,
  filename
) {

  if (!rows.length) {

    alert(
      "No data available to export."
    );

    return;

  }


  const headers =
    Object.keys(rows[0]);


  const escapeCSV = value => {

    const str =
      String(value ?? "");


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

    headers
      .map(escapeCSV)
      .join(","),

    ...rows.map(
      row =>
        headers
          .map(
            header =>
              escapeCSV(row[header])
          )
          .join(",")
    )

  ];


  const blob =
    new Blob(

      [
        "\uFEFF" +
        lines.join("\r\n")
      ],

      {
        type:
          "text/csv;charset=utf-8;"
      }

    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;
  link.download = filename;


  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);


  URL.revokeObjectURL(url);

}


// ============================================================
// MESSAGE HELPERS
// ============================================================

function showMessage(
  element,
  message
) {

  element.textContent =
    message;

  element.classList.remove(
    "hidden"
  );

}


function hideMessage(
  element
) {

  element.classList.add(
    "hidden"
  );

  element.textContent = "";

}


// ============================================================
// EVENTS
// ============================================================

districtFilter.addEventListener(
  "change",
  renderPage2
);


monthFilter.addEventListener(
  "change",
  renderPage2
);


resetFilters.addEventListener(
  "click",
  () => {

    districtFilter.value = "";
    monthFilter.value = "";

    renderPage2();

  }
);


downloadMultipleBtn.addEventListener(
  "click",
  () => {

    downloadCSV(
      getFilteredMultipleRows(),
      "BACI_Multiple_Session_Summary.csv"
    );

  }
);


downloadSundayBtn.addEventListener(
  "click",
  () => {

    downloadCSV(
      getFilteredSundayRows(),
      "BACI_Sunday_Session_Summary_Filtered.csv"
    );

  }
);
