const CONFIG = {
    DATA_SOURCE: "../data/Institutions_Master_SSOT.csv",
    ENGAGEMENT_DATA_SOURCE: "../data/Engagement_Records_SSOT.csv",
    VERSION: "1.0.0",
    DEFAULT_FILTER_VALUE: "All",
    DEFAULT_YEAR: "All",
    PAGE_SIZE: 10,
    // Master file columns (static reference data)
    REQUIRED_COLUMNS_MASTER: [
        "Institution",
        "Category",
        "Region",
        "State"
    ],
    // Engagement file columns (transactional data)
    REQUIRED_COLUMNS_ENGAGEMENT: [
        "Institution",
        "Engaged2024",
        "Engaged2025",
        "Engaged2026",
        "EverEngaged",
        "LatestEngagementYear"
    ],
    // Legacy: all columns combined (used for backward compatibility)
    REQUIRED_COLUMNS: [
        "Institution",
        "Category",
        "Region",
        "State",
        "Engaged2024",
        "Engaged2025",
        "Engaged2026",
        "EverEngaged",
        "LatestEngagementYear"
    ],
    FIELD_NAMES: {
        INSTITUTION: "Institution",
        CATEGORY: "Category",
        REGION: "Region",
        STATE: "State",
        EVER_ENGAGED: "EverEngaged",
        LATEST_ENGAGEMENT_YEAR: "LatestEngagementYear",
        ENGAGED_2024: "Engaged2024",
        ENGAGED_2025: "Engaged2025",
        ENGAGED_2026: "Engaged2026"
    },
    VALID_BOOLEAN_VALUES: [
        "TRUE",
        "True",
        "true",
        "FALSE",
        "False",
        "false"
    ],
    NO_ENGAGEMENT_YEAR_VALUE: "Never",
    AVAILABLE_YEARS: [2024, 2025, 2026],
    CHART: {
        PALETTE: [
            "#2563eb",
            "#1d4ed8",
            "#60a5fa",
            "#34d399",
            "#f59e0b"
        ],
        OPTIONS: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { enabled: true }
            }
        }
    }
};
