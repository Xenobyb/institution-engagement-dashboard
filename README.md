# institution-engagement-dashboard
Institution Engagement Dashboard for TalentCorp COE GET. A centralized repository for monitoring institution engagement coverage across IPTA, IPTS and TVET institutions in Malaysia.

---

## Project Overview

The Institution Engagement Dashboard is designed to provide a single source of truth (SSOT) for institutional engagement activities across Malaysia.

The dashboard consolidates engagement records from five regional datasets:

- Central
- Northern
- Southern
- East Coast
- East Malaysia

The repository provides governance documentation, data architecture and dashboard assets to ensure long-term sustainability and continuity.

---

## Dashboard Objectives

The dashboard aims to:

- Monitor engagement coverage across institutions
- Track engagement trends by year
- Support regional outreach planning
- Identify engagement gaps
- Provide a sustainable institutional dataset for future teams

---

## Key Performance Indicators (KPIs)

### Total Institutions
Total institutions available within the SSOT dataset.

### Total Engaged Institutions
Institutions that have recorded engagement activities.

### Engagement Rate
Percentage of engaged institutions compared to total institutions.

### Institutions by Category
Distribution across:
- IPTA
- IPTS
- TVET

### Institutions by Region
Distribution across:
- Central
- Northern
- Southern
- East Coast
- East Malaysia

### Engagement Trend
Year-over-year engagement comparison.

---

## Data Architecture

```text
Raw Regional Files
↓
Master Region
↓
Institutions Master (SSOT)
↓
Dashboard
```

---

## Repository Structure

```text
institution-engagement-dashboard
│
├── assets
├── dashboard
├── data
├── docs
│   ├── Data_Dictionary.md
│   ├── Governance_Framework.md
│   └── Update_Guide.md
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## Governance Documents

Please refer to:

- Data_Dictionary.md
- Governance_Framework.md
- Update_Guide.md

---

## Project Status

Current Version: v1.0

Status:
- Data Foundation ✅
- Data Validation ✅
- Repository Setup ✅
- Documentation Migration ✅
- Dataset Deployment ✅
- Dashboard Development ⏳
- Dashboard Filter ⏳
- GitHub Pages Deployment ⏳
- User Acceptance Testing (UAT) ⏳
- Production Release: Release v1.0 ⏳
