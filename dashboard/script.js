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
var paginationEventsAttached = false;

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
        directoryCount: document.getElementById("directory-count"),
        prevPageButton: document.querySelector('#directory-pagination .pagination-button[aria-label="Previous page"]') || document.querySelectorAll('#directory-pagination .pagination-button')[0],
        nextPageButton: document.querySelector('#directory-pagination .pagination-button[aria-label="Next page"]') || document.querySelectorAll('#directory-pagination .pagination-button')[1],
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
    // Initialize Chart placeholders and manager (Sprint 3.8)
    if (typeof initializeCharts === "function") {
        try {
            initializeCharts();
        } catch (err) {
            console.warn("[Dashboard] initializeCharts failed:", err);
        }
    }

    loadCsvData()
        .then(function (data) {
            var validatedData = validateData(data);
            initializeState(validatedData);
            attachPaginationEvents();
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

    // Chart rendering hook (placeholder charts for Sprint 3.8)
    if (typeof renderCharts === "function") {
        try {
            renderCharts();
        } catch (err) {
            console.warn("[Dashboard] renderCharts failed:", err);
        }
    }
    // Heatmap is future work and intentionally not implemented in this sprint
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
    // Ensure pagination starts from the first page after a filter/search change
    dashboardState.pagination.currentPage = 1;
    applyPagination();
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
    // Centralized pagination logic: compute totals, clamp page, slice searchedData, and update visibleData
    var totalRecords = Array.isArray(dashboardState.searchedData) ? dashboardState.searchedData.length : 0;
    var pageSize = dashboardState.pagination.pageSize || CONFIG.PAGE_SIZE;
    var totalPages = calculateTotalPages(totalRecords, pageSize);
    var currentPage = Number(dashboardState.pagination.currentPage) || 1;

    // Boundary protection
    if (currentPage < 1) {
        currentPage = 1;
    }

    if (totalPages < 1) {
        totalPages = 1;
    }

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    // Calculate slice indices (0-based)
    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = startIndex + pageSize;

    // Update dashboard state
    dashboardState.pagination.currentPage = currentPage;
    dashboardState.pagination.pageSize = pageSize;
    dashboardState.pagination.totalPages = totalPages;
    dashboardState.pagination.totalRecords = totalRecords;

    // Slice searchedData to visibleData (this ensures KPIs/charts keep using searchedData)
    dashboardState.visibleData = (Array.isArray(dashboardState.searchedData) ? dashboardState.searchedData : []).slice(startIndex, endIndex);

    // Update footer and controls
    updatePaginationFooter(startIndex, endIndex, totalRecords);
}

function updatePaginationFooter(startIndex, endIndex, totalRecords) {
    if (!DOM.directoryCount) {
        return;
    }

    var total = Number(totalRecords) || 0;

    if (total === 0) {
        DOM.directoryCount.textContent = "0 of 0";
    } else {
        var start = Number(startIndex) + 1;
        var end = Math.min(total, Number(endIndex));
        DOM.directoryCount.textContent = start + "\u2013" + end + " of " + total;
    }

    // Update button disabled states
    if (DOM.prevPageButton) {
        DOM.prevPageButton.disabled = dashboardState.pagination.currentPage <= 1;
    }

    if (DOM.nextPageButton) {
        DOM.nextPageButton.disabled = dashboardState.pagination.currentPage >= dashboardState.pagination.totalPages;
    }
}

function goToNextPage() {
    setTimeout(function () {
        var next = (dashboardState.pagination.currentPage || 1) + 1;
        goToPage(next);
    }, 0);
}

function goToPreviousPage() {
    setTimeout(function () {
        var prev = (dashboardState.pagination.currentPage || 1) - 1;
        goToPage(prev);
    }, 0);
}

function goToPage(page) {
    var total = dashboardState.pagination.totalPages || 1;
    var target = Number(page) || 1;

    if (target < 1) {
        target = 1;
    }

    if (target > total) {
        target = total;
    }

    dashboardState.pagination.currentPage = target;
    applyPagination();
    // Only re-render the directory to avoid unnecessary work
    populateDirectory();
}

function attachPaginationEvents() {
    if (paginationEventsAttached) {
        return;
    }

    if (DOM.prevPageButton) {
        DOM.prevPageButton.addEventListener('click', function () {
            goToPreviousPage();
        });
    }

    if (DOM.nextPageButton) {
        DOM.nextPageButton.addEventListener('click', function () {
            goToNextPage();
        });
    }

    paginationEventsAttached = true;
}

/* =======================================================
   CHART MANAGER
   Centralized manager for Chart.js instances and lifecycle
   ======================================================= */

var CHART_IDS = {
    Region: "chart-region",
    Category: "chart-category",
    Trend: "chart-trend",
    Coverage: "chart-coverage",
    State: "chart-state"
};

var ChartManager = (function () {
    var registry = {};

    function has(key) {
        return Object.prototype.hasOwnProperty.call(registry, key);
    }

    function registerChart(key, canvasId, config) {
        if (!key || !canvasId) {
            console.warn("[ChartManager] registerChart missing key or canvasId");
            return null;
        }

        if (has(key)) {
            return registry[key].chart;
        }

        var canvas = document.getElementById(canvasId);

        if (!canvas) {
            console.warn("[ChartManager] Canvas not found:", canvasId);
            return null;
        }

        var ctx = canvas.getContext("2d");

        var chartInstance = null;

        try {
            chartInstance = new Chart(ctx, config || { type: "bar", data: { labels: ["Loading..."], datasets: [{ label: "Value", data: [0] }] }, options: CONFIG.CHART.OPTIONS });
        } catch (err) {
            console.error("[ChartManager] Failed to create chart:", err);
            return null;
        }

        registry[key] = {
            chart: chartInstance,
            canvasId: canvasId
        };

        return chartInstance;
    }

    function getChart(key) {
        return has(key) ? registry[key].chart : null;
    }

    function updateChart(key, config) {
        if (!has(key)) {
            // Create if it does not exist
            return registerChart(key, CHART_IDS[key], config);
        }

        var entry = registry[key];
        var chart = entry.chart;

        if (!chart) {
            return registerChart(key, entry.canvasId, config);
        }

        // Replace data and options in-place and update
        if (config && config.data) {
            chart.data = config.data;
        }

        if (config && config.options) {
            chart.options = config.options;
        }

        try {
            chart.update();
        } catch (err) {
            console.warn("[ChartManager] updateChart failed for", key, err);
        }

        return chart;
    }

    function destroyChart(key) {
        if (!has(key)) {
            return;
        }

        try {
            var chart = registry[key].chart;

            if (chart && typeof chart.destroy === "function") {
                chart.destroy();
            }
        } catch (err) {
            console.warn("[ChartManager] destroyChart failed for", key, err);
        }

        delete registry[key];
    }

    function destroyAllCharts() {
        Object.keys(registry).forEach(function (key) {
            destroyChart(key);
        });
    }

    return {
        registerChart: registerChart,
        getChart: getChart,
        updateChart: updateChart,
        destroyChart: destroyChart,
        destroyAllCharts: destroyAllCharts
    };
})();


/* =======================================================
   CHART INITIALIZATION / LIFECYCLE HOOKS
   ======================================================= */

function buildPlaceholderDataset() {
    var palette = (CONFIG.CHART && CONFIG.CHART.PALETTE) || ["#2563eb"];

    return {
        labels: ["Loading..."],
        datasets: [
            {
                label: "Value",
                data: [0],
                backgroundColor: palette[0]
            }
        ]
    };
}

function initializeCharts() {
    // Idempotent initialization: registering placeholders only
    Object.keys(CHART_IDS).forEach(function (key) {
        var canvasId = CHART_IDS[key];

        // default chart type selection (placeholder only)
        var defaultType = key === "Trend" ? "line" : key === "Coverage" ? "doughnut" : "bar";

        var config = {
            type: defaultType,
            data: buildPlaceholderDataset(),
            options: CONFIG.CHART ? CONFIG.CHART.OPTIONS : { responsive: true }
        };

        ChartManager.registerChart(key, canvasId, config);
    });

    console.log("[Dashboard] Charts initialized (placeholders)");
}


/* =======================================================
   FUTURE AGGREGATION PLACEHOLDERS (SIGNATURES ONLY)
   ======================================================= */

var Aggregation = (function () {
    function normalizeRecords(data) {
        return Array.isArray(data) ? data : [];
    }

    function normalizeLabel(value) {
        var label = String(value || "").trim();
        return label || "Unknown";
    }

    function createSingleDataset(labels, label, values) {
        return {
            labels: labels,
            datasets: [
                {
                    label: label,
                    data: values
                }
            ]
        };
    }

    function countByField(data, fieldName) {
        var counts = {};
        var labels = [];

        normalizeRecords(data).forEach(function (record) {
            var currentRecord = record || {};
            var label = normalizeLabel(currentRecord[fieldName]);

            if (!Object.prototype.hasOwnProperty.call(counts, label)) {
                counts[label] = 0;
                labels.push(label);
            }

            counts[label] += 1;
        });

        return {
            labels: labels,
            data: labels.map(function (label) {
                return counts[label];
            })
        };
    }

    /**
     * Aggregation.region()
     * Input: searchedData
     * Output: { labels: [], datasets: [] }
     */
    function region(data) {
        var summary = countByField(data, "Region");
        return createSingleDataset(summary.labels, "Institutions by Region", summary.data);
    }

    /**
     * Aggregation.category()
     * Input: searchedData
     * Output: { labels: [], datasets: [] }
     */
    function category(data) {
        var summary = countByField(data, "Category");
        return createSingleDataset(summary.labels, "Institutions by Category", summary.data);
    }

    /**
     * Aggregation.trend()
     * Input: searchedData
     * Output: { labels: [], datasets: [] }
     */
    function trend(data) {
        var records = normalizeRecords(data);
        var years = [
            { label: "2024", field: "Engaged2024" },
            { label: "2025", field: "Engaged2025" },
            { label: "2026", field: "Engaged2026" }
        ];

        if (!records.length) {
            return createSingleDataset([], "Engaged Institutions", []);
        }

        return createSingleDataset(
            years.map(function (year) {
                return year.label;
            }),
            "Engaged Institutions",
            years.map(function (year) {
                return records.filter(function (record) {
                    var currentRecord = record || {};
                    return isTrue(currentRecord[year.field]);
                }).length;
            })
        );
    }

    /**
     * Aggregation.coverage()
     * Input: searchedData
     * Output: { labels: [], datasets: [] }
     */
    function coverage(data) {
        var counts = {};
        var labels = [];

        normalizeRecords(data).forEach(function (record) {
            var currentRecord = record || {};
            var label = normalizeLabel(currentRecord.Region);

            if (!Object.prototype.hasOwnProperty.call(counts, label)) {
                counts[label] = {
                    engaged: 0,
                    nonEngaged: 0
                };
                labels.push(label);
            }

            if (isTrue(currentRecord.EverEngaged)) {
                counts[label].engaged += 1;
            } else {
                counts[label].nonEngaged += 1;
            }
        });

        return {
            labels: labels,
            datasets: [
                {
                    label: "Engaged",
                    data: labels.map(function (label) {
                        return counts[label].engaged;
                    })
                },
                {
                    label: "Non Engaged",
                    data: labels.map(function (label) {
                        return counts[label].nonEngaged;
                    })
                }
            ]
        };
    }

    /**
     * Aggregation.topStates()
     * Input: searchedData
     * Output: { labels: [], datasets: [] }
     */
    function topStates(data) {
        var summary = countByField(data, "State");
        var rankedStates = summary.labels.map(function (label, index) {
            return {
                label: label,
                count: summary.data[index]
            };
        }).sort(function (firstState, secondState) {
            if (secondState.count !== firstState.count) {
                return secondState.count - firstState.count;
            }

            return sortTextValues(firstState.label, secondState.label);
        }).slice(0, 10);

        return createSingleDataset(
            rankedStates.map(function (state) {
                return state.label;
            }),
            "Top States by Institution Count",
            rankedStates.map(function (state) {
                return state.count;
            })
        );
    }

    /**
     * Aggregation.buildDashboardData()
     * Input: searchedData
     * Output: analytics snapshot containing all aggregation datasets
     */
    function buildDashboardData(data) {
        return {
            region: region(data),
            category: category(data),
            trend: trend(data),
            coverage: coverage(data),
            topStates: topStates(data)
        };
    }

    return {
        region: region,
        category: category,
        trend: trend,
        coverage: coverage,
        topStates: topStates,
        buildDashboardData: buildDashboardData
    };
})();

function getRegionSummary(searchedData) {
    // TODO: implement aggregation in future sprint
    return buildPlaceholderDataset();
}

function getCategorySummary(searchedData) {
    // TODO: implement aggregation in future sprint
    return buildPlaceholderDataset();
}

function getEngagementTrend(searchedData) {
    // TODO: implement aggregation in future sprint
    return buildPlaceholderDataset();
}

function getCoverageByRegion(searchedData) {
    // TODO: implement aggregation in future sprint
    return buildPlaceholderDataset();
}

function getTopStates(searchedData) {
    // TODO: implement aggregation in future sprint
    return buildPlaceholderDataset();
}


/* =======================================================
   FUTURE CHART RENDERERS / HOOKS
   ======================================================= */

function renderCharts() {
    // For this sprint we render placeholder datasets only.
    // In future sprints, call aggregation functions (e.g. getRegionSummary)
    // to obtain datasets derived from `dashboardState.searchedData`.

    try {
        // Example mapping from keys to aggregation stubs (placeholder)
        var mappings = {
            Region: getRegionSummary,
            Category: getCategorySummary,
            Trend: getEngagementTrend,
            Coverage: getCoverageByRegion,
            State: getTopStates
        };

        Object.keys(CHART_IDS).forEach(function (key) {
            var aggregator = mappings[key];
            var dataset = null;

            if (typeof aggregator === "function") {
                dataset = aggregator(dashboardState.searchedData || []);
            }

            // Fallback to placeholder if aggregator returns falsy
            if (!dataset) {
                dataset = buildPlaceholderDataset();
            }

            var defaultType = key === "Trend" ? "line" : key === "Coverage" ? "doughnut" : "bar";

            var config = {
                type: defaultType,
                data: dataset,
                options: CONFIG.CHART ? CONFIG.CHART.OPTIONS : { responsive: true }
            };

            ChartManager.updateChart(key, config);
        });
    } catch (err) {
        console.warn("[Dashboard] renderCharts encountered an error:", err);
    }
}

function updateCharts() {
    // Alias for renderCharts - kept for future semantic separation
    renderCharts();
}

function destroyCharts() {
    ChartManager.destroyAllCharts();
}


function renderHeatmap() {
    // Intentionally left unimplemented for Sprint 3.8
}

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
