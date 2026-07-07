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
    HeatmapTooltip.initialize();
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

    if (typeof renderHeatmap === "function") {
        try {
            renderHeatmap();
        } catch (err) {
            console.warn("[Dashboard] renderHeatmap failed:", err);
        }
    }
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

var CHART_COLORS = {
    blue: "#3B82F6",
    green: "#22C55E",
    yellow: "#FACC15",
    red: "#EF4444",
    purple: "#8B5CF6",
    primary: "#3B82F6",
    primaryDark: "#2563EB",
    primaryLight: "#60A5FA",
    success: "#22C55E",
    warning: "#FACC15",
    danger: "#EF4444",
    text: "#AEB8C9",
    muted: "#7C879C",
    grid: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.08)",
    palette: (CONFIG.CHART && CONFIG.CHART.PALETTE) || [
        "#3B82F6",
        "#22C55E",
        "#8B5CF6",
        "#FACC15",
        "#EF4444"
    ],
    heatmap: {
        empty: "#111827",
        low: "#3B82F6",
        medium: "#22C55E",
        high: "#FACC15",
        full: "#EF4444"
    }
};

function getFontFamily() {
    return "SF Pro Display, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

function formatPercentage(value) {
    var numericValue = Number(value || 0);

    if (!Number.isFinite(numericValue)) {
        return "0%";
    }

    var normalizedValue = numericValue > 1 ? numericValue / 100 : numericValue;
    return Math.round(normalizedValue * 100) + "%";
}

var ChartTheme = {
    colors: {
        primary: CHART_COLORS.blue,
        success: CHART_COLORS.green,
        warning: CHART_COLORS.yellow,
        danger: CHART_COLORS.red,
        purple: CHART_COLORS.purple,
        text: CHART_COLORS.text,
        muted: CHART_COLORS.muted,
        grid: CHART_COLORS.grid,
        border: CHART_COLORS.border
    },
    grid: {
        color: CHART_COLORS.grid,
        lineWidth: 1,
        drawBorder: false
    },
    axes: {
        ticks: {
            color: CHART_COLORS.muted,
            font: {
                family: getFontFamily(),
                size: 12,
                weight: 500
            }
        },
        title: {
            color: CHART_COLORS.text,
            font: {
                family: getFontFamily(),
                size: 12,
                weight: 600
            }
        },
        border: {
            display: false
        }
    },
    legend: {
        labels: {
            color: CHART_COLORS.text,
            padding: 16,
            boxWidth: 12,
            boxHeight: 12,
            font: {
                family: getFontFamily(),
                size: 12,
                weight: 500
            }
        }
    },
    tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.96)",
        titleColor: "#F8FAFC",
        bodyColor: "#F8FAFC",
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true
    }
};

var ChartOptions = {
    base: function (overrides) {
        var options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: "easeOutQuart"
            },
            interaction: {
                intersect: false,
                mode: "index"
            },
            layout: {
                padding: {
                    top: 14,
                    right: 8,
                    bottom: 8,
                    left: 8
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: ChartTheme.legend.labels
                },
                tooltip: ChartTheme.tooltip
            }
        };

        return Object.assign(options, overrides || {});
    },
    bar: function (overrides) {
        var options = ChartOptions.base({
            indexAxis: "x",
            plugins: {
                legend: {
                    display: false,
                    labels: ChartTheme.legend.labels
                },
                tooltip: ChartTheme.tooltip
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font,
                        precision: 0
                    },
                    grid: ChartTheme.grid,
                    border: ChartTheme.axes.border
                },
                y: {
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                }
            }
        });

        return Object.assign(options, overrides || {});
    },
    line: function (overrides) {
        var options = ChartOptions.base({
            plugins: {
                legend: {
                    display: false,
                    labels: ChartTheme.legend.labels
                },
                tooltip: ChartTheme.tooltip
            },
            scales: {
                x: {
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font,
                        precision: 0
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                }
            }
        });

        return Object.assign(options, overrides || {});
    },
    horizontal: function (overrides) {
        var options = ChartOptions.base({
            indexAxis: "y",
            interaction: {
                mode: "nearest",
                axis: "y",
                intersect: true
            },
            plugins: {
                legend: {
                    display: false,
                    labels: ChartTheme.legend.labels
                },
                tooltip: ChartTheme.tooltip
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font,
                        precision: 0
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                },
                y: {
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                }
            }
        });

        return Object.assign(options, overrides || {});
    },
    horizontalStacked: function (overrides) {
        var options = ChartOptions.horizontal({
            interaction: {
                mode: "index",
                axis: "y",
                intersect: true
            },
            scales: {
                x: {
                    stacked: true,
                    max: 1,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font,
                        callback: function (value) {
                            return (Number(value) * 100).toFixed(0) + "%";
                        }
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: ChartTheme.legend.labels
                },
                tooltip: Object.assign({}, ChartTheme.tooltip, {
                    callbacks: {
                        title: function (items) {
                            var item = items && items[0] ? items[0] : null;
                            var label = item && item.label ? item.label : "";
                            var chartLabel = item && item.chart && item.chart.data && item.chart.data.labels && item.dataIndex !== undefined
                                ? item.chart.data.labels[item.dataIndex]
                                : label;
                            return chartLabel || label;
                        },
                        label: function (context) {
                            return context.dataset.label + ": " + formatPercentage(context.parsed.x);
                        }
                    }
                })
            }
        });

        return Object.assign(options, overrides || {});
    },
    doughnut: function (overrides) {
        var options = ChartOptions.base({
            cutout: "62%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: ChartTheme.legend.labels
                },
                tooltip: ChartTheme.tooltip
            }
        });

        return Object.assign(options, overrides || {});
    },
    stacked: function (overrides) {
        var options = ChartOptions.bar({
            indexAxis: "y",
            scales: {
                x: {
                    stacked: true,
                    max: 1,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font,
                        callback: function (value) {
                            return (Number(value) * 100).toFixed(0) + "%";
                        }
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: CHART_COLORS.muted,
                        font: ChartTheme.axes.ticks.font
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        drawBorder: false
                    },
                    border: ChartTheme.axes.border
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: ChartTheme.legend.labels
                },
                tooltip: Object.assign({}, ChartTheme.tooltip, {
                    callbacks: {
                        label: function (context) {
                            var percent = Number(context.parsed.x || 0) * 100;
                            return context.dataset.label + ": " + percent.toFixed(0) + "%";
                        }
                    }
                })
            }
        });

        return Object.assign(options, overrides || {});
    }
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

        handleChartRenderSuccess(canvasId);

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

        if (config && config.type && chart.config) {
            chart.config.type = config.type;
        }

        try {
            chart.update("none");
            handleChartRenderSuccess(entry.canvasId);
        } catch (err) {
            console.warn("[ChartManager] updateChart failed for", key, err);
            toggleChartPlaceholder(entry.canvasId, true);
        }

        return chart;
    }

    function updateAll(analytics) {
        var snapshot = analytics || {};
        var updates = {
            Region: function () {
                return buildChartConfig("Region", snapshot.region);
            },
            Category: function () {
                return buildChartConfig("Category", snapshot.category);
            },
            Trend: function () {
                return buildChartConfig("Trend", snapshot.trend);
            },
            Coverage: function () {
                return buildChartConfig("Coverage", snapshot.coverage);
            },
            State: function () {
                return buildChartConfig("State", snapshot.topStates);
            }
        };

        Object.keys(updates).forEach(function (key) {
            try {
                var config = updates[key]();

                updateChart(key, config);
            } catch (err) {
                console.warn("[ChartManager] updateAll skipped " + key + " chart:", err);
            }
        });
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
        updateAll: updateAll,
        destroyChart: destroyChart,
        destroyAllCharts: destroyAllCharts
    };
})();


/* =======================================================
   CHART INITIALIZATION / LIFECYCLE HOOKS
   ======================================================= */

function buildPlaceholderDataset() {
    return {
        labels: ["Loading..."],
        datasets: [
            {
                label: "Value",
                data: [0],
                backgroundColor: CHART_COLORS.primary
            }
        ]
    };
}

function getChartType(key) {
    if (key === "Category") {
        return "doughnut";
    }

    if (key === "Trend") {
        return "line";
    }

    return "bar";
}

function getPaletteColor(index) {
    var palette = CHART_COLORS.palette;
    return palette[index % palette.length];
}

function cloneChartData(data) {
    var source = data || {};
    var labels = Array.isArray(source.labels) ? source.labels.slice() : [];
    var datasets = Array.isArray(source.datasets) ? source.datasets.map(function (dataset) {
        var copy = {};

        Object.keys(dataset || {}).forEach(function (key) {
            copy[key] = Array.isArray(dataset[key]) ? dataset[key].slice() : dataset[key];
        });

        copy.data = Array.isArray(copy.data) ? copy.data.slice() : [];
        return copy;
    }) : [];

    return {
        labels: labels,
        datasets: datasets
    };
}

function hasUsableChartData(data) {
    return Boolean(
        data &&
        Array.isArray(data.labels) &&
        data.labels.length &&
        Array.isArray(data.datasets) &&
        data.datasets.some(function (dataset) {
            return Array.isArray(dataset.data) && dataset.data.length;
        })
    );
}

function buildEmptyChartData(label) {
    return {
        labels: [],
        datasets: [
            {
                label: label,
                data: []
            }
        ]
    };
}

function styleSingleBarData(data, color, labelPosition) {
    var chartData = cloneChartData(data);

    chartData.datasets.forEach(function (dataset) {
        dataset.backgroundColor = chartData.labels.map(function (label, index) {
            return getPaletteColor(index);
        });
        dataset.borderColor = color || CHART_COLORS.primary;
        dataset.borderWidth = 1;
        dataset.borderRadius = 8;
        dataset.borderSkipped = false;
        dataset.barPercentage = 0.8;
        dataset.categoryPercentage = 0.8;
        dataset.valueLabelPosition = labelPosition || "top";
    });

    return chartData;
}

function styleDoughnutData(data) {
    var chartData = cloneChartData(data);

    chartData.datasets.forEach(function (dataset) {
        dataset.backgroundColor = chartData.labels.map(function (label, index) {
            return getPaletteColor(index);
        });
        dataset.borderColor = "rgba(15, 23, 42, 0.94)";
        dataset.borderWidth = 3;
        dataset.hoverOffset = 4;
    });

    return chartData;
}

function styleLineData(data) {
    var chartData = cloneChartData(data);

    chartData.datasets.forEach(function (dataset) {
        dataset.borderColor = CHART_COLORS.blue;
        dataset.backgroundColor = "rgba(59, 130, 246, 0)";
        dataset.borderWidth = 2.5;
        dataset.fill = false;
        dataset.tension = 0.35;
        dataset.pointBackgroundColor = CHART_COLORS.blue;
        dataset.pointBorderColor = "#F8FAFC";
        dataset.pointBorderWidth = 2;
        dataset.pointRadius = 4;
        dataset.pointHoverRadius = 6;
    });

    return chartData;
}

function styleCoverageData(data) {
    var chartData = cloneChartData(data);
    var coverageColors = [CHART_COLORS.green, CHART_COLORS.red];

    chartData.datasets.forEach(function (dataset, index) {
        dataset.backgroundColor = coverageColors[index] || getPaletteColor(index);
        dataset.borderColor = "rgba(255, 255, 255, 0.06)";
        dataset.borderWidth = 1;
    });

    return chartData;
}

function normalizePercentageData(data) {
    var chartData = cloneChartData(data);

    if (!chartData.labels.length || !chartData.datasets.length) {
        return chartData;
    }

    chartData.labels = chartData.labels.slice();
    chartData.datasets = chartData.datasets.map(function (dataset) {
        var normalizedDataset = Object.assign({}, dataset);
        normalizedDataset.data = Array.isArray(dataset.data) ? dataset.data.slice() : [];
        return normalizedDataset;
    });

    var totals = chartData.labels.map(function (label, index) {
        return chartData.datasets.reduce(function (sum, dataset) {
            return sum + (Number(dataset.data[index]) || 0);
        }, 0);
    });

    chartData.datasets.forEach(function (dataset) {
        var normalizedValues = chartData.labels.map(function (label, index) {
            var total = totals[index] || 0;
            return total > 0 ? (Number(dataset.data[index]) || 0) / total : 0;
        });

        dataset.data = normalizedValues;
    });

    return chartData;
}

function getBaseChartOptions(showLegend) {
    return ChartOptions.base({
        plugins: {
            legend: Object.assign({}, ChartTheme.legend, {
                display: Boolean(showLegend)
            }),
            tooltip: ChartTheme.tooltip
        }
    });
}

function getAxisOptions(stacked) {
    return {
        x: {
            beginAtZero: true,
            stacked: Boolean(stacked),
            ticks: {
                color: CHART_COLORS.muted,
                font: ChartTheme.axes.ticks.font,
                precision: 0
            },
            grid: ChartTheme.grid,
            border: ChartTheme.axes.border
        },
        y: {
            stacked: Boolean(stacked),
            ticks: {
                color: CHART_COLORS.muted,
                font: ChartTheme.axes.ticks.font
            },
            grid: {
                color: "rgba(255, 255, 255, 0.03)",
                drawBorder: false
            },
            border: ChartTheme.axes.border
        }
    };
}

function getChartOptions(key) {
    if (key === "Region") {
        return ChartOptions.bar({
            plugins: {
                legend: {
                    display: false,
                    labels: ChartTheme.legend.labels
                },
                tooltip: ChartTheme.tooltip
            },
            scales: getAxisOptions(false),
            datasets: {
                bar: {
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                }
            }
        });
    }

    if (key === "State") {
        return ChartOptions.horizontal({
            scales: getAxisOptions(false),
            plugins: {
                legend: {
                    display: false,
                    labels: ChartTheme.legend.labels
                },
                tooltip: Object.assign({}, ChartTheme.tooltip, {
                    callbacks: {
                        title: function (items) {
                            var item = items && items[0] ? items[0] : null;
                            var label = item && item.label ? item.label : "";
                            var chartLabel = item && item.chart && item.chart.data && item.chart.data.labels && item.dataIndex !== undefined
                                ? item.chart.data.labels[item.dataIndex]
                                : label;
                            return chartLabel || label;
                        },
                        label: function (context) {
                            return context.dataset.label + ": " + context.parsed.x;
                        }
                    }
                })
            },
            datasets: {
                bar: {
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.72,
                    categoryPercentage: 0.75
                }
            }
        });
    }

    if (key === "Coverage") {
        return ChartOptions.horizontalStacked({
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: ChartTheme.legend.labels
                },
                tooltip: Object.assign({}, ChartTheme.tooltip, {
                    callbacks: {
                        title: function (items) {
                            var item = items && items[0] ? items[0] : null;
                            var label = item && item.label ? item.label : "";
                            var chartLabel = item && item.chart && item.chart.data && item.chart.data.labels && item.dataIndex !== undefined
                                ? item.chart.data.labels[item.dataIndex]
                                : label;
                            return chartLabel || label;
                        },
                        label: function (context) {
                            return context.dataset.label + ": " + formatPercentage(context.parsed.x);
                        }
                    }
                })
            }
        });
    }

    if (key === "Trend") {
        return ChartOptions.line({
            scales: getAxisOptions(false),
            plugins: {
                legend: {
                    display: false,
                    labels: ChartTheme.legend.labels
                },
                tooltip: Object.assign({}, ChartTheme.tooltip, {
                    callbacks: {
                        title: function (items) {
                            return items[0] && items[0].label ? items[0].label : "";
                        },
                        label: function (context) {
                            return "Engaged Institutions: " + context.parsed.y;
                        }
                    }
                })
            }
        });
    }

    return ChartOptions.doughnut({
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                labels: Object.assign({}, ChartTheme.legend.labels, {
                    padding: 18
                })
            },
            tooltip: Object.assign({}, ChartTheme.tooltip, {
                callbacks: {
                    label: function (context) {
                        var value = Number(context.parsed) || 0;
                        var total = context.chart.data.datasets[0].data.reduce(function (sum, item) {
                            return sum + (Number(item) || 0);
                        }, 0);
                        var percent = total ? ((value / total) * 100).toFixed(0) : 0;
                        return context.label + ": " + value + " (" + percent + "%)";
                    }
                }
            })
        }
    });
}

function getChartDataForKey(key, data) {
    if (!hasUsableChartData(data)) {
        console.warn("[ChartManager] " + key + " analytics dataset unavailable or empty");
        return buildEmptyChartData(key);
    }

    if (key === "Category") {
        return styleDoughnutData(data);
    }

    if (key === "Trend") {
        return styleLineData(data);
    }

    if (key === "Coverage") {
        return normalizePercentageData(styleCoverageData(data));
    }

    return styleSingleBarData(data, null, key === "State" ? "end" : "top");
}

function buildChartConfig(key, data) {
    return {
        type: getChartType(key),
        data: getChartDataForKey(key, data),
        options: getChartOptions(key)
    };
}

function toggleChartPlaceholder(canvasId, visible) {
    var canvas = document.getElementById(canvasId);
    var placeholder = canvas && canvas.parentElement ? canvas.parentElement.querySelector(".chart-placeholder-copy") : null;

    if (!placeholder) {
        return;
    }

    placeholder.hidden = !visible;
    placeholder.setAttribute("aria-hidden", String(!visible));
    placeholder.style.display = visible ? "" : "none";
    placeholder.style.visibility = visible ? "visible" : "hidden";
    placeholder.style.opacity = visible ? "1" : "0";
}

function handleChartRenderSuccess(canvasId) {
    if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(function () {
            toggleChartPlaceholder(canvasId, false);
        });
        return;
    }

    toggleChartPlaceholder(canvasId, false);
}

function initializeCharts() {
    // Idempotent initialization: registering placeholders only
    Object.keys(CHART_IDS).forEach(function (key) {
        var canvasId = CHART_IDS[key];

        var config = {
            type: getChartType(key),
            data: buildPlaceholderDataset(),
            options: getChartOptions(key)
        };

        ChartManager.registerChart(key, canvasId, config);
    });

    console.log("[Dashboard] Charts initialized (placeholders)");
}


/* =======================================================
   FUTURE AGGREGATION PLACEHOLDERS (SIGNATURES ONLY)
   ======================================================= */

var HEATMAP_SCORE_MODEL = {
    2026: 100,
    2025: 70,
    2024: 40
};

function calculateHeatmapScore(year) {
    var numericYear = Number(String(year || "").trim());

    if (!Number.isInteger(numericYear)) {
        return 0;
    }

    if (!Object.prototype.hasOwnProperty.call(HEATMAP_SCORE_MODEL, numericYear)) {
        return 0;
    }

    return HEATMAP_SCORE_MODEL[numericYear];
}

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
     * Aggregation.heatmap()
     * Input: searchedData
     * Output: state-keyed heatmap analytics object
     */
    function heatmap(data) {
        var summary = {};

        normalizeRecords(data).forEach(function (record) {
            var currentRecord = record || {};
            var state = normalizeLabel(currentRecord.State);
            var latestYearValue = String(currentRecord.LatestEngagementYear || "").trim();
            var numericYear = Number(latestYearValue);

            if (!Object.prototype.hasOwnProperty.call(summary, state)) {
                summary[state] = {
                    totalScore: 0,
                    institutions: 0,
                    latestYear: null,
                    engaged: 0
                };
            }

            summary[state].institutions += 1;
            summary[state].totalScore += calculateHeatmapScore(latestYearValue);

            if (isTrue(currentRecord.EverEngaged)) {
                summary[state].engaged += 1;
            }

            if (
                Number.isInteger(numericYear) &&
                (summary[state].latestYear === null || numericYear > summary[state].latestYear)
            ) {
                summary[state].latestYear = numericYear;
            }
        });

        Object.keys(summary).forEach(function (state) {
            var stateSummary = summary[state];
            var engagementScore = stateSummary.institutions
                ? Math.round(stateSummary.totalScore / stateSummary.institutions)
                : 0;

            summary[state] = {
                engagementScore: engagementScore,
                score: engagementScore,
                institutions: stateSummary.institutions,
                latestYear: stateSummary.latestYear,
                engaged: stateSummary.engaged,
                nonEngaged: stateSummary.institutions - stateSummary.engaged,
                rank: null,
                color: null
            };
        });

        return summary;
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
            topStates: topStates(data),
            heatmap: heatmap(data)
        };
    }

    return {
        region: region,
        category: category,
        trend: trend,
        coverage: coverage,
        topStates: topStates,
        heatmap: heatmap,
        buildDashboardData: buildDashboardData
    };
})();

/* =======================================================
   FUTURE CHART RENDERERS / HOOKS
   ======================================================= */

function renderCharts() {
    try {
        var analytics = Aggregation.buildDashboardData(dashboardState.searchedData || []);
        ChartManager.updateAll(analytics);
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

var HEATMAP_CONTAINER_ID = "malaysia-heatmap";
var HEATMAP_SVG_SOURCE = "../assets/icons/malaysia.svg";
var HEATMAP_STATE_REGISTRY = {
    Johor: "Johor",
    Kedah: "Kedah",
    Kelantan: "Kelantan",
    Melaka: "Melaka",
    "Negeri Sembilan": "Negeri-Sembilan",
    Pahang: "Pahang",
    Perak: "Perak",
    Perlis: "Perlis",
    "Pulau Pinang": "Pulau-Pinang",
    Sabah: "Sabah",
    Sarawak: "Sarawak",
    Selangor: "Selangor",
    Terengganu: "Terengganu",
    "W.P. Kuala Lumpur": "Kuala-Lumpur",
    "W.P. Labuan": "Labuan",
    "W.P. Putrajaya": "Putrajaya"
};

var HeatmapTooltip = (function () {
    var tooltipEl = null;
    var TOOLTIP_OFFSET_X = 14;
    var TOOLTIP_OFFSET_Y = 14;
    var VIEWPORT_MARGIN = 12;
    var HEATMAP_COLOR_SCALE = [
        { score: 0, color: "#ef4444" },
        { score: 25, color: "#f97316" },
        { score: 50, color: "#facc15" },
        { score: 75, color: "#84cc16" },
        { score: 100, color: "#22c55e" }
    ];

    function clampScore(score) {
        var numericScore = Number(score);

        if (!Number.isFinite(numericScore)) {
            return 0;
        }

        if (numericScore < 0) {
            return 0;
        }

        if (numericScore > 100) {
            return 100;
        }

        return numericScore;
    }

    function hexToRgb(color) {
        var hex = String(color || "").replace("#", "");
        var value = parseInt(hex, 16);

        return {
            red: (value >> 16) & 255,
            green: (value >> 8) & 255,
            blue: value & 255
        };
    }

    function componentToHex(value) {
        var hex = Math.round(value).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToHex(color) {
        return "#" +
            componentToHex(color.red) +
            componentToHex(color.green) +
            componentToHex(color.blue);
    }

    function interpolateColor(startColor, endColor, ratio) {
        var start = hexToRgb(startColor);
        var end = hexToRgb(endColor);

        return rgbToHex({
            red: start.red + ((end.red - start.red) * ratio),
            green: start.green + ((end.green - start.green) * ratio),
            blue: start.blue + ((end.blue - start.blue) * ratio)
        });
    }

    function getHeatmapColor(score) {
        var normalizedScore = clampScore(score);
        var stopIndex;

        if (normalizedScore <= HEATMAP_COLOR_SCALE[0].score) {
            return HEATMAP_COLOR_SCALE[0].color;
        }

        for (stopIndex = 1; stopIndex < HEATMAP_COLOR_SCALE.length; stopIndex += 1) {
            var startStop = HEATMAP_COLOR_SCALE[stopIndex - 1];
            var endStop = HEATMAP_COLOR_SCALE[stopIndex];

            if (normalizedScore <= endStop.score) {
                return interpolateColor(
                    startStop.color,
                    endStop.color,
                    (normalizedScore - startStop.score) / (endStop.score - startStop.score)
                );
            }
        }

        return HEATMAP_COLOR_SCALE[HEATMAP_COLOR_SCALE.length - 1].color;
    }

    function createElement() {
        if (tooltipEl) {
            return;
        }

        tooltipEl = document.createElement("div");
        tooltipEl.id = "heatmap-tooltip";

        var title = document.createElement("div");
        title.className = "hm-tooltip__title";

        var indicator = document.createElement("span");
        indicator.className = "hm-tooltip__indicator";
        title.appendChild(indicator);

        var heading = document.createElement("div");
        heading.className = "hm-tooltip__name";
        title.appendChild(heading);
        tooltipEl.appendChild(title);

        var body = document.createElement("div");
        body.className = "hm-tooltip__body";

        var metrics = [
            { label: "Engagement Score", valueClass: "hm-tooltip__score" },
            { label: "Total Institutions", valueClass: "hm-tooltip__total" },
            { label: "Engaged", valueClass: "hm-tooltip__engaged" },
            { label: "Non-Engaged", valueClass: "hm-tooltip__non-engaged" },
            { label: "Latest Year", valueClass: "hm-tooltip__year" }
        ];

        metrics.forEach(function (metric) {
            var row = document.createElement("div");
            row.className = "hm-tooltip__row";

            var label = document.createElement("span");
            label.className = "hm-tooltip__label";
            label.textContent = metric.label;

            var value = document.createElement("span");
            value.className = metric.valueClass;

            row.appendChild(label);
            row.appendChild(value);
            body.appendChild(row);
        });

        tooltipEl.appendChild(body);
        document.body.appendChild(tooltipEl);
    }

    function renderContent(stateName, data) {
        if (!tooltipEl) {
            return;
        }

        var currentData = data || {};
        var latestYear = currentData.latestYear;
        var engagementScore = Number(currentData.engagementScore) || 0;

        tooltipEl.querySelector(".hm-tooltip__name").textContent = stateName || "";
        tooltipEl.style.setProperty("--hm-tooltip-accent", getHeatmapColor(engagementScore));
        tooltipEl.querySelector(".hm-tooltip__score").textContent = engagementScore + "%";
        tooltipEl.querySelector(".hm-tooltip__total").textContent = Number(currentData.institutions) || 0;
        tooltipEl.querySelector(".hm-tooltip__engaged").textContent = Number(currentData.engaged) || 0;
        tooltipEl.querySelector(".hm-tooltip__non-engaged").textContent = Number(currentData.nonEngaged) || 0;
        tooltipEl.querySelector(".hm-tooltip__year").textContent = (latestYear !== null && latestYear !== undefined)
            ? latestYear
            : "\u2014";
    }

    function initialize() {
        createElement();
    }

    function show(stateName, data) {
        if (!tooltipEl) {
            return;
        }

        renderContent(stateName, data);
        tooltipEl.classList.add("visible");
    }

    function hide() {
        if (!tooltipEl) {
            return;
        }

        tooltipEl.classList.remove("visible");
    }

    function move(clientX, clientY) {
        if (!tooltipEl) {
            return;
        }

        var rect = tooltipEl.getBoundingClientRect();
        var left = clientX + TOOLTIP_OFFSET_X;
        var top = clientY + TOOLTIP_OFFSET_Y;

        if (left + rect.width + VIEWPORT_MARGIN > window.innerWidth) {
            left = clientX - rect.width - TOOLTIP_OFFSET_X;
        }

        if (top + rect.height + VIEWPORT_MARGIN > window.innerHeight) {
            top = clientY - rect.height - TOOLTIP_OFFSET_Y;
        }

        if (left < VIEWPORT_MARGIN) {
            left = VIEWPORT_MARGIN;
        }

        if (top < VIEWPORT_MARGIN) {
            top = VIEWPORT_MARGIN;
        }

        tooltipEl.style.left = left + "px";
        tooltipEl.style.top = top + "px";
    }

    function update(stateName, data) {
        if (!tooltipEl) {
            return;
        }

        renderContent(stateName, data);
    }

    return {
        initialize: initialize,
        show: show,
        hide: hide,
        move: move,
        update: update
    };
})();

var HEATMAP_DEFAULT_FILL = CHART_COLORS.heatmap.empty || "#111827";
var HEATMAP_COLOR_SCALE = [
    { score: 0, color: "#ef4444" },
    { score: 25, color: "#f97316" },
    { score: 50, color: "#facc15" },
    { score: 75, color: "#84cc16" },
    { score: 100, color: "#22c55e" }
];

var HeatmapManager = (function () {
    var container = null;
    var svg = null;
    var loadingPromise = null;
    var statesById = {};
    var statesByKey = {};
    var validationReport = createValidationReport(false);
    var currentTooltipData = {};
    var tooltipEventsAttached = false;

    function createValidationReport(ready) {
        return {
            ready: Boolean(ready),
            registeredStates: 0,
            missingStates: [],
            duplicateIds: [],
            unexpectedIds: []
        };
    }

    function cloneValidationReport(report) {
        var currentReport = report || createValidationReport(false);

        return {
            ready: Boolean(currentReport.ready),
            registeredStates: Number(currentReport.registeredStates) || 0,
            missingStates: currentReport.missingStates.slice(),
            duplicateIds: currentReport.duplicateIds.slice(),
            unexpectedIds: currentReport.unexpectedIds.slice()
        };
    }

    function warnValidationIssues(report) {
        if (!report.ready) {
            console.warn("[HeatmapManager] Malaysia heatmap SVG is not ready");
        }

        if (report.missingStates.length) {
            console.warn("[HeatmapManager] Missing SVG state IDs:", report.missingStates);
        }

        if (report.duplicateIds.length) {
            console.warn("[HeatmapManager] Duplicate SVG state IDs:", report.duplicateIds);
        }

        if (report.unexpectedIds.length) {
            console.warn("[HeatmapManager] Unexpected SVG state IDs:", report.unexpectedIds);
        }
    }

    function loadSvg() {
        container = document.getElementById(HEATMAP_CONTAINER_ID);

        if (!container) {
            return Promise.reject(new Error("Heatmap container not found: #" + HEATMAP_CONTAINER_ID));
        }

        if (svg) {
            return Promise.resolve(svg);
        }

        if (typeof fetch !== "function") {
            return Promise.reject(new Error("fetch() is unavailable for heatmap SVG loading"));
        }

        return fetch(HEATMAP_SVG_SOURCE)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Malaysia SVG request failed with status " + response.status);
                }

                return response.text();
            })
            .then(function (svgText) {
                var parser = new DOMParser();
                var parsedDocument = parser.parseFromString(svgText, "image/svg+xml");
                var parsedSvg = parsedDocument.querySelector("svg");

                if (!parsedSvg || parsedDocument.querySelector("parsererror")) {
                    throw new Error("Malaysia SVG could not be parsed");
                }

                container.textContent = "";
                container.appendChild(document.importNode(parsedSvg, true));
                svg = container.querySelector("svg");

                return svg;
            });
    }

    function registerStates() {
        statesById = {};
        statesByKey = {};

        if (!svg) {
            return;
        }

        var stateElements = svg.querySelectorAll("#features path[id]");

        Array.prototype.forEach.call(stateElements, function (stateElement) {
            statesById[stateElement.id] = stateElement;
        });

        Object.keys(HEATMAP_STATE_REGISTRY).forEach(function (stateKey) {
            var svgId = HEATMAP_STATE_REGISTRY[stateKey];

            if (statesById[svgId]) {
                statesByKey[stateKey] = statesById[svgId];
            }
        });
    }

    function getDuplicateIds() {
        var counts = {};
        var duplicates = [];

        if (!svg) {
            return duplicates;
        }

        Array.prototype.forEach.call(svg.querySelectorAll("[id]"), function (element) {
            counts[element.id] = (counts[element.id] || 0) + 1;
        });

        Object.keys(counts).forEach(function (id) {
            if (counts[id] > 1) {
                duplicates.push(id);
            }
        });

        return duplicates;
    }

    function validate() {
        var expectedIds = Object.keys(HEATMAP_STATE_REGISTRY).map(function (stateKey) {
            return HEATMAP_STATE_REGISTRY[stateKey];
        });
        var actualIds = Object.keys(statesById);
        var report = createValidationReport(Boolean(svg));

        report.registeredStates = Object.keys(statesByKey).length;
        report.duplicateIds = getDuplicateIds();
        report.missingStates = expectedIds.filter(function (svgId) {
            return !Object.prototype.hasOwnProperty.call(statesById, svgId);
        });
        report.unexpectedIds = actualIds.filter(function (svgId) {
            return expectedIds.indexOf(svgId) === -1;
        });
        report.ready = Boolean(svg) && !report.missingStates.length && !report.duplicateIds.length;

        validationReport = report;
        warnValidationIssues(validationReport);

        return getValidationReport();
    }

    function initialize() {
        if (svg) {
            registerStates();
            return Promise.resolve(validate());
        }

        if (loadingPromise) {
            return loadingPromise;
        }

        loadingPromise = loadSvg()
            .then(function () {
                registerStates();
                return validate();
            })
            .catch(function (err) {
                validationReport = createValidationReport(false);
                loadingPromise = null;
                console.warn("[HeatmapManager] Failed to initialize Malaysia heatmap:", err);
                return getValidationReport();
            });

        return loadingPromise;
    }

    function getState(id) {
        return statesById[id] || null;
    }

    function getStateByKey(key) {
        return statesByKey[key] || null;
    }

    function getAllStates() {
        return Object.keys(statesById).map(function (id) {
            return statesById[id];
        });
    }

    function isReady() {
        return validationReport.ready;
    }

    function getValidationReport() {
        return cloneValidationReport(validationReport);
    }

    function clampScore(score) {
        var numericScore = Number(score);

        if (!Number.isFinite(numericScore)) {
            return 0;
        }

        if (numericScore < 0) {
            return 0;
        }

        if (numericScore > 100) {
            return 100;
        }

        return numericScore;
    }

    function hexToRgb(color) {
        var hex = String(color || "").replace("#", "");
        var value = parseInt(hex, 16);

        return {
            red: (value >> 16) & 255,
            green: (value >> 8) & 255,
            blue: value & 255
        };
    }

    function componentToHex(value) {
        var hex = Math.round(value).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToHex(color) {
        return "#" +
            componentToHex(color.red) +
            componentToHex(color.green) +
            componentToHex(color.blue);
    }

    function interpolateColor(startColor, endColor, ratio) {
        var start = hexToRgb(startColor);
        var end = hexToRgb(endColor);

        return rgbToHex({
            red: start.red + ((end.red - start.red) * ratio),
            green: start.green + ((end.green - start.green) * ratio),
            blue: start.blue + ((end.blue - start.blue) * ratio)
        });
    }

    function interpolateHeatmapColor(score) {
        var normalizedScore = clampScore(score);
        var lastStop = HEATMAP_COLOR_SCALE[HEATMAP_COLOR_SCALE.length - 1];
        var stopIndex;

        if (normalizedScore <= HEATMAP_COLOR_SCALE[0].score) {
            return HEATMAP_COLOR_SCALE[0].color;
        }

        for (stopIndex = 1; stopIndex < HEATMAP_COLOR_SCALE.length; stopIndex += 1) {
            var startStop = HEATMAP_COLOR_SCALE[stopIndex - 1];
            var endStop = HEATMAP_COLOR_SCALE[stopIndex];

            if (normalizedScore <= endStop.score) {
                return interpolateColor(
                    startStop.color,
                    endStop.color,
                    (normalizedScore - startStop.score) / (endStop.score - startStop.score)
                );
            }
        }

        return lastStop.color;
    }

    function getHeatmapColor(score) {
        return interpolateHeatmapColor(score);
    }

    function paintState(stateName, color) {
        var stateElement = getStateByKey(stateName) || getState(HEATMAP_STATE_REGISTRY[stateName]);

        if (!stateElement) {
            return false;
        }

        stateElement.setAttribute("fill", color);
        stateElement.style.fill = color;

        return true;
    }

    function resetStateColors() {
        Object.keys(HEATMAP_STATE_REGISTRY).forEach(function (stateName) {
            paintState(stateName, HEATMAP_DEFAULT_FILL);
        });
    }

    function getStateScore(stateAnalytics) {
        var analytics = stateAnalytics || {};

        if (Object.prototype.hasOwnProperty.call(analytics, "score")) {
            return analytics.score;
        }

        return analytics.engagementScore;
    }

    function paintAllStates(analytics) {
        var heatmapAnalytics = analytics || {};

        resetStateColors();

        Object.keys(HEATMAP_STATE_REGISTRY).forEach(function (stateName) {
            var stateAnalytics = heatmapAnalytics[stateName];

            if (!stateAnalytics) {
                return;
            }

            paintState(stateName, getHeatmapColor(getStateScore(stateAnalytics)));
        });
    }

    function buildReverseRegistry() {
        var reverseMap = {};

        Object.keys(HEATMAP_STATE_REGISTRY).forEach(function (stateKey) {
            reverseMap[HEATMAP_STATE_REGISTRY[stateKey]] = stateKey;
        });

        return reverseMap;
    }

    function resolveStateFromTarget(target, reverseMap) {
        var el = target;

        while (el && el !== svg) {
            if (el.id && Object.prototype.hasOwnProperty.call(reverseMap, el.id)) {
                return reverseMap[el.id];
            }

            el = el.parentElement;
        }

        return null;
    }

    function registerTooltipEvents(analytics) {
        currentTooltipData = analytics || {};

        if (!svg || tooltipEventsAttached) {
            return;
        }

        var features = svg.querySelector("#features");

        if (!features) {
            return;
        }

        var reverseMap = buildReverseRegistry();

        features.addEventListener("mousemove", function (event) {
            var stateKey = resolveStateFromTarget(event.target, reverseMap);

            if (stateKey && currentTooltipData[stateKey]) {
                HeatmapTooltip.show(stateKey, currentTooltipData[stateKey]);
                HeatmapTooltip.move(event.clientX, event.clientY);
            } else {
                HeatmapTooltip.hide();
            }
        });

        features.addEventListener("mouseleave", function () {
            HeatmapTooltip.hide();
        });

        tooltipEventsAttached = true;
    }

    return {
        initialize: initialize,
        validate: validate,
        getState: getState,
        getStateByKey: getStateByKey,
        getAllStates: getAllStates,
        isReady: isReady,
        getValidationReport: getValidationReport,
        paintState: paintState,
        paintAllStates: paintAllStates,
        getHeatmapColor: getHeatmapColor,
        resetStateColors: resetStateColors,
        registerTooltipEvents: registerTooltipEvents
    };
})();

var renderHeatmapRequestId = 0;

function renderHeatmap() {
    var requestId = renderHeatmapRequestId + 1;
    var analytics = Aggregation.buildDashboardData(dashboardState.searchedData || []);

    renderHeatmapRequestId = requestId;

    HeatmapManager.initialize().then(function () {
        if (requestId !== renderHeatmapRequestId) {
            return;
        }

        HeatmapManager.paintAllStates(analytics.heatmap);
        HeatmapManager.registerTooltipEvents(analytics.heatmap);
    });
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
