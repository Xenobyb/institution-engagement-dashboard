var dashboardState = {
    rawData: [],
    filteredData: [],
    searchedData: [],
    visibleData: [],
    filters: {
        year: CONFIG.DEFAULT_FILTER_VALUE,
        category: CONFIG.DEFAULT_FILTER_VALUE,
        region: CONFIG.DEFAULT_FILTER_VALUE,
        state: CONFIG.DEFAULT_FILTER_VALUE
    },
    searchQuery: "",
    pagination: {
        currentPage: 1,
        pageSize: CONFIG.PAGE_SIZE,
        totalPages: 1
    },
    metadata: {
        lastUpdated: null,
        dataSource: CONFIG.DATA_SOURCE,
        version: CONFIG.VERSION
    }
};

var DOM = {};
var searchEventsAttached = false;
var resetEventsAttached = false;

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
        institutionSearch: document.getElementById("institution-search"),
        lastUpdated: document.getElementById("last-updated"),
        dataSource: document.getElementById("data-source"),
        dashboardVersion: document.getElementById("dashboard-version"),
        resetButton: document.getElementById("reset-filters")
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
    attachFilterEvents();
    attachSearchEvents();
    attachResetEvents();

    loadCsvData()
        .then(function (data) {
            var validatedData = validateData(data);
            initializeState(validatedData);
            renderDashboard();
        })
        .catch(function (error) {
            console.error("[Dashboard] CSV loading failed. Existing placeholders remain visible.", error);
        });
}

function validateData(data) {
    var records = Array.isArray(data) ? data : [];
    var requiredColumns = CONFIG.REQUIRED_COLUMNS || [];
    var fieldNames = CONFIG.FIELD_NAMES || {};
    var missingColumns = [];
    var firstRecord = records[0] || {};

    requiredColumns.forEach(function (columnName) {
        if (!Object.prototype.hasOwnProperty.call(firstRecord, columnName)) {
            missingColumns.push(columnName);
        }
    });

    if (missingColumns.length) {
        console.warn("[Dashboard] Missing required CSV columns:", missingColumns.join(", "));
    }

    records.forEach(function (record, recordIndex) {
        var rowNumber = recordIndex + 2;

        requiredColumns.forEach(function (columnName) {
            if (!Object.prototype.hasOwnProperty.call(record, columnName)) {
                return;
            }

            if (!String(record[columnName] || "").trim()) {
                console.warn("[Dashboard] Missing required field value in row " + rowNumber + ": " + columnName);
            }
        });

        warnIfEmptyField(record, rowNumber, fieldNames.INSTITUTION, "Empty Institution name");
        warnIfEmptyField(record, rowNumber, fieldNames.CATEGORY, "Empty Category");
        warnIfEmptyField(record, rowNumber, fieldNames.REGION, "Empty Region");
        warnIfEmptyField(record, rowNumber, fieldNames.STATE, "Empty State");
        warnIfEmptyField(record, rowNumber, fieldNames.LATEST_ENGAGEMENT_YEAR, "Missing Latest Engagement Year");
        validateEverEngagedValue(record, rowNumber, fieldNames.EVER_ENGAGED);
        validateLatestEngagementYear(record, rowNumber, fieldNames.LATEST_ENGAGEMENT_YEAR);
    });

    return data;
}

function warnIfEmptyField(record, rowNumber, fieldName, message) {
    if (!fieldName || !Object.prototype.hasOwnProperty.call(record, fieldName)) {
        return;
    }

    if (!String(record[fieldName] || "").trim()) {
        console.warn("[Dashboard] " + message + " in row " + rowNumber);
    }
}

function validateEverEngagedValue(record, rowNumber, fieldName) {
    if (!fieldName || !Object.prototype.hasOwnProperty.call(record, fieldName)) {
        return;
    }

    var value = String(record[fieldName] || "").trim();

    if (!value) {
        return;
    }

    if (CONFIG.VALID_BOOLEAN_VALUES.indexOf(value) === -1) {
        console.warn("[Dashboard] Unexpected EverEngaged value in row " + rowNumber + ": " + value);
    }
}

function validateLatestEngagementYear(record, rowNumber, fieldName) {
    if (!fieldName || !Object.prototype.hasOwnProperty.call(record, fieldName)) {
        return;
    }

    var value = String(record[fieldName] || "").trim();
    var numericYear = Number(value);

    if (!value) {
        return;
    }

    if (value === CONFIG.NO_ENGAGEMENT_YEAR_VALUE) {
        return;
    }

    if (!Number.isInteger(numericYear) || numericYear < 0) {
        console.warn("[Dashboard] Invalid or unexpected engagement year value in row " + rowNumber + ": " + value);
    }
}

function initializeState(data) {
    dashboardState.rawData = data;
    dashboardState.metadata.lastUpdated = new Date();
    resetDashboardState();
}

function resetDashboardState() {
    dashboardState.filters = {
        year: CONFIG.DEFAULT_FILTER_VALUE,
        category: CONFIG.DEFAULT_FILTER_VALUE,
        region: CONFIG.DEFAULT_FILTER_VALUE,
        state: CONFIG.DEFAULT_FILTER_VALUE
    };
    dashboardState.searchQuery = "";
    dashboardState.pagination.currentPage = 1;

    applyFilters();
    applySearch();
    applyPagination();
    updateVisibleData();
}

function calculateTotalPages(recordCount, pageSize) {
    if (!recordCount) {
        return 1;
    }

    return Math.ceil(recordCount / pageSize);
}

function renderDashboard() {
    populateKpi();
    populateDirectory();
    populateFilters();
    populateMetadata();

    // Future Sprint
    // renderCharts();
    // renderHeatmap();
}

function attachFilterEvents() {
    var filterControls = [
        { element: DOM.yearFilter, name: "year" },
        { element: DOM.categoryFilter, name: "category" },
        { element: DOM.regionFilter, name: "region" },
        { element: DOM.stateFilter, name: "state" }
    ];

    filterControls.forEach(function (filterControl) {
        if (!filterControl.element) {
            return;
        }

        filterControl.element.addEventListener("change", function (event) {
            updateFilterState(filterControl.name, event.target.value);
            runDashboardPipeline();
            renderDashboard();
        });
    });
}

function attachSearchEvents() {
    if (!DOM.institutionSearch || searchEventsAttached) {
        return;
    }

    DOM.institutionSearch.addEventListener("input", function (event) {
        updateSearchState(event.target.value);
        runDashboardPipeline();
        renderDashboard();
    });

    searchEventsAttached = true;
}

function attachResetEvents() {
    if (!DOM.resetButton || resetEventsAttached) {
        return;
    }

    DOM.resetButton.addEventListener("click", function (event) {
        event.preventDefault();
        handleReset();
    });

    resetEventsAttached = true;
}

function handleReset() {
    resetDashboardState();
    clearSearchInput();
    renderDashboard();
}

function clearSearchInput() {
    if (!DOM.institutionSearch) {
        return;
    }

    DOM.institutionSearch.value = "";
}

function runDashboardPipeline() {
    applyFilters();
    applySearch();
    applyPagination();
    updateVisibleData();
}

function updateFilterState(filterName, value) {
    dashboardState.filters[filterName] = value;
    console.log("[Dashboard] Filter updated");
}

function updateSearchState(query) {
    dashboardState.searchQuery = String(query || "");
}

function applyFilters() {
    var filters = dashboardState.filters;
    var filterFields = {
        year: "LatestEngagementYear",
        category: "Category",
        region: "Region",
        state: "State"
    };

    console.log("[Dashboard] Applying filters");

    dashboardState.filteredData = dashboardState.rawData.filter(function (record) {
        return Object.keys(filterFields).every(function (filterName) {
            var filterValue = filters[filterName];

            if (filterValue === CONFIG.DEFAULT_FILTER_VALUE) {
                return true;
            }

            return String(record[filterFields[filterName]] || "").trim() === filterValue;
        });
    });

    console.log("[Dashboard] Filtered records: " + dashboardState.filteredData.length);
}

function updateVisibleData() {
    dashboardState.visibleData = dashboardState.searchedData;
}

function applySearch() {
    var query = String(dashboardState.searchQuery || "").trim().toLowerCase();
    var searchFields = [
        "Institution",
        "Category",
        "Region",
        "State"
    ];

    if (!query) {
        dashboardState.searchedData = dashboardState.filteredData.slice();
        return;
    }

    dashboardState.searchedData = dashboardState.filteredData.filter(function (record) {
        return searchFields.some(function (field) {
            return String(record[field] || "").toLowerCase().indexOf(query) !== -1;
        });
    });
}

function applyPagination() {
    var recordCount = Array.isArray(dashboardState.searchedData) ? dashboardState.searchedData.length : 0;
    var pageSize = dashboardState.pagination.pageSize || CONFIG.PAGE_SIZE;
    var totalPages = calculateTotalPages(recordCount, pageSize);
    var currentPage = dashboardState.pagination.currentPage || 1;

    if (currentPage < 1) {
        currentPage = 1;
    }

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    dashboardState.pagination.currentPage = currentPage;
    dashboardState.pagination.pageSize = pageSize;
    dashboardState.pagination.totalPages = totalPages;
}

function renderCharts() {}

function renderHeatmap() {}

function populateKpi() {
    var data = dashboardState.searchedData;
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

    dashboardState.visibleData.forEach(function (record) {
        fragment.appendChild(createTableRow(record));
    });

    DOM.directoryTableBody.textContent = "";
    DOM.directoryTableBody.appendChild(fragment);

    console.log("[Dashboard] Directory populated");
}

function populateFilters() {
    setFilterOptions(DOM.yearFilter, getUniqueValues(dashboardState.rawData, "LatestEngagementYear").sort(sortYearValues), dashboardState.filters.year);
    setFilterOptions(DOM.categoryFilter, getUniqueValues(dashboardState.rawData, "Category").sort(sortTextValues), dashboardState.filters.category);
    setFilterOptions(DOM.regionFilter, getUniqueValues(dashboardState.rawData, "Region").sort(sortTextValues), dashboardState.filters.region);
    setFilterOptions(DOM.stateFilter, getUniqueValues(dashboardState.rawData, "State").sort(sortTextValues), dashboardState.filters.state);

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

function setFilterOptions(selectElement, values, selectedValue) {
    if (!selectElement) {
        return;
    }

    var fragment = document.createDocumentFragment();
    fragment.appendChild(createOption(CONFIG.DEFAULT_FILTER_VALUE, CONFIG.DEFAULT_FILTER_VALUE));

    values.forEach(function (value) {
        fragment.appendChild(createOption(value, value));
    });

    selectElement.textContent = "";
    selectElement.appendChild(fragment);
    selectElement.value = values.indexOf(selectedValue) === -1 ? CONFIG.DEFAULT_FILTER_VALUE : selectedValue;
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
        DOM.dashboardVersion.textContent = dashboardState.metadata.version;
    }
}

function getDisplayFilename(path) {
    return String(path)
        .split("/")
        .pop()
        .trim();
}

function populateMetadata() {
    if (DOM.lastUpdated) {
        var lastUpdated = dashboardState.metadata.lastUpdated || new Date();

        DOM.lastUpdated.textContent = lastUpdated.toLocaleDateString("en-MY", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    if (DOM.dataSource) {
        DOM.dataSource.textContent = getDisplayFilename(dashboardState.metadata.dataSource);
    }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
