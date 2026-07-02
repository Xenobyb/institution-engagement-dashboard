var dashboardState = {
    rawData: [],
    filteredData: [],
    filters: {
        year: "All",
        category: "All",
        region: "All",
        state: "All"
    }
};

var DOM = {};

function cacheDomElements() {
    DOM = {
        totalInstitutions: document.getElementById("total-institutions"),
        totalEngaged: document.getElementById("total-engaged"),
        engagementRate: document.getElementById("engagement-rate"),
        nonEngaged: document.getElementById("non-engaged-institutions"),
        recentlyEngaged: document.getElementById("recently-engaged"),
        directoryTableBody: document.getElementById("directory-table-body"),
        yearFilter: document.getElementById("year-filter"),
        categoryFilter: document.getElementById("category-filter"),
        regionFilter: document.getElementById("region-filter"),
        stateFilter: document.getElementById("state-filter"),
        lastUpdated: document.getElementById("last-updated"),
        dataSource: document.getElementById("data-source"),
        dashboardVersion: document.getElementById("dashboard-version")
    };
}

function isTrue(value) {
    return String(value)
        .trim()
        .toUpperCase() === "TRUE";
}

function getUniqueValues(data, field) {
    var values = new Set();

    data.forEach(function (record) {
        var value = String(record[field] || "").trim();

        if (value) {
            values.add(value);
        }
    });

    return Array.from(values);
}

function loadCsvData() {
    console.log("[Dashboard] Loading CSV...");

    return fetch(CONFIG.DATA_SOURCE)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("CSV request failed with status " + response.status);
            }

            return response.text();
        })
        .then(function (csvText) {
            var data = parseCsv(csvText);
            console.log("[Dashboard] CSV loaded (" + data.length + " records)");
            return data;
        });
}

function parseCsv(csvText) {
    var text = String(csvText || "").replace(/^\uFEFF/, "");
    var rows = [];
    var row = [];
    var field = "";
    var insideQuotes = false;

    for (var index = 0; index < text.length; index += 1) {
        var character = text[index];
        var nextCharacter = text[index + 1];

        if (insideQuotes) {
            if (character === "\"" && nextCharacter === "\"") {
                field += "\"";
                index += 1;
            } else if (character === "\"") {
                insideQuotes = false;
            } else {
                field += character;
            }
        } else if (character === "\"") {
            insideQuotes = true;
        } else if (character === ",") {
            row.push(field);
            field = "";
        } else if (character === "\n") {
            row.push(field.replace(/\r$/, ""));
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    if (field || row.length) {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
    }

    if (!rows.length) {
        return [];
    }

    var headers = rows.shift().map(function (header) {
        return String(header || "").trim();
    });

    return rows
        .filter(function (currentRow) {
            return currentRow.some(function (value) {
                return String(value || "").trim();
            });
        })
        .map(function (currentRow) {
            return headers.reduce(function (record, header, headerIndex) {
                record[header] = String(currentRow[headerIndex] || "").trim();
                return record;
            }, {});
        });
}

function initializeDashboard() {
    cacheDomElements();
    populateVersion();

    loadCsvData()
        .then(function (data) {
            dashboardState.rawData = data;
            dashboardState.filteredData = data.slice();

            populateKpi();
            populateDirectory();
            populateFilters();
            populateMetadata();
        })
        .catch(function (error) {
            console.error("[Dashboard] CSV loading failed. Existing placeholders remain visible.", error);
        });
}

function populateKpi() {
    var data = dashboardState.filteredData;
    var total = data.length;
    var engaged = data.filter(function (record) {
        return isTrue(record.EverEngaged);
    }).length;
    var nonEngaged = total - engaged;
    var latestYear = getLatestNumericYear(data);
    var recentlyEngaged = data.filter(function (record) {
        return Number(record.LatestEngagementYear) === latestYear;
    }).length;
    var engagementRate = total ? ((engaged / total) * 100).toFixed(2) + "%" : "0.00%";

    if (DOM.totalInstitutions) {
        DOM.totalInstitutions.textContent = total.toLocaleString();
    }

    if (DOM.totalEngaged) {
        DOM.totalEngaged.textContent = engaged.toLocaleString();
    }

    if (DOM.engagementRate) {
        DOM.engagementRate.textContent = engagementRate;
    }

    if (DOM.nonEngaged) {
        DOM.nonEngaged.textContent = nonEngaged.toLocaleString();
    }

    if (DOM.recentlyEngaged) {
        DOM.recentlyEngaged.textContent = recentlyEngaged.toLocaleString();
    }

    console.log("[Dashboard] KPI populated");
}

function populateDirectory() {
    if (!DOM.directoryTableBody) {
        return;
    }

    var fragment = document.createDocumentFragment();

    dashboardState.filteredData.forEach(function (record) {
        fragment.appendChild(createTableRow(record));
    });

    DOM.directoryTableBody.textContent = "";
    DOM.directoryTableBody.appendChild(fragment);

    console.log("[Dashboard] Directory populated");
}

function populateFilters() {
    setFilterOptions(DOM.yearFilter, getUniqueValues(dashboardState.rawData, "LatestEngagementYear").sort(sortYearValues));
    setFilterOptions(DOM.categoryFilter, getUniqueValues(dashboardState.rawData, "Category").sort(sortTextValues));
    setFilterOptions(DOM.regionFilter, getUniqueValues(dashboardState.rawData, "Region").sort(sortTextValues));
    setFilterOptions(DOM.stateFilter, getUniqueValues(dashboardState.rawData, "State").sort(sortTextValues));

    console.log("[Dashboard] Filters initialized");
}

function createTableRow(record) {
    var row = document.createElement("tr");
    var fields = [
        "Institution",
        "Category",
        "Region",
        "State",
        "EverEngaged",
        "LatestEngagementYear"
    ];

    fields.forEach(function (field) {
        var cell = document.createElement("td");
        var value = record[field] || "";
        cell.textContent = field === "EverEngaged" ? formatBoolean(value) : value;
        row.appendChild(cell);
    });

    return row;
}

function setFilterOptions(selectElement, values) {
    if (!selectElement) {
        return;
    }

    var fragment = document.createDocumentFragment();
    fragment.appendChild(createOption(CONFIG.DEFAULT_YEAR, CONFIG.DEFAULT_YEAR));

    values.forEach(function (value) {
        fragment.appendChild(createOption(value, value));
    });

    selectElement.textContent = "";
    selectElement.appendChild(fragment);
    selectElement.value = CONFIG.DEFAULT_YEAR;
}

function createOption(value, label) {
    var option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

function sortTextValues(firstValue, secondValue) {
    return firstValue.localeCompare(secondValue, undefined, { sensitivity: "base" });
}

function sortYearValues(firstValue, secondValue) {
    var firstNumber = Number(firstValue);
    var secondNumber = Number(secondValue);
    var firstIsNumeric = Number.isFinite(firstNumber);
    var secondIsNumeric = Number.isFinite(secondNumber);

    if (firstIsNumeric && secondIsNumeric) {
        return firstNumber - secondNumber;
    }

    if (firstIsNumeric) {
        return -1;
    }

    if (secondIsNumeric) {
        return 1;
    }

    return sortTextValues(firstValue, secondValue);
}

function getLatestNumericYear(data) {
    var numericYears = data
        .map(function (record) {
            var value = String(record.LatestEngagementYear || "").trim();

            if (!value) {
                return null;
            }

            var numericYear = Number(value);

            return Number.isInteger(numericYear) ? numericYear : null;
        })
        .filter(function (year) {
            return year !== null;
        });

    if (!numericYears.length) {
        return null;
    }

    return Math.max.apply(null, numericYears);
}

function formatBoolean(value) {
    return isTrue(value) ? "Yes" : "No";
}

function populateVersion() {
    if (DOM.dashboardVersion) {
        DOM.dashboardVersion.textContent = CONFIG.VERSION;
    }
}

function populateMetadata() {
    if (DOM.lastUpdated) {
        DOM.lastUpdated.textContent = new Date().toLocaleDateString("en-MY", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    if (DOM.dataSource) {
        DOM.dataSource.textContent = CONFIG.DATA_SOURCE;
    }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
