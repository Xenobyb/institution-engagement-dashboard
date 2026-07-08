const CONFIG = {
    DATA_SOURCE: "../../data/Institutions_Master_SSOT.csv",
    VERSION: "1.0.0",
    DEFAULT_FILTER_VALUE: "All",
    DEFAULT_YEAR: "All",
    PAGE_SIZE: 10,
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
        LATEST_ENGAGEMENT_YEAR: "LatestEngagementYear"
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
