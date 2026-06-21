# Data Dictionary

## Overview

This document defines the fields used in the Institution Engagement Dashboard Single Source of Truth (SSOT).

---

## Dataset

/data/institutions_master.csv

---

| Field | Data Type | Description |
|---------|---------|---------|
| Institution | Text | Institution name |
| Category | Text | IPTA, IPTS or TVET |
| Region | Text | Central, Northern, Southern, East Coast, East Malaysia |
| State | Text | Institution state |
| Engaged2024 | Boolean | Engagement status for 2024 |
| Engaged2025 | Boolean | Engagement status for 2025 |
| Engaged2026 | Boolean | Engagement status for 2026 |
| EverEngaged | Boolean | TRUE if if institution was engaged in any year |
| LatestEngagementYear | Number/Text | Most recent engagement year (2024, 2025, 2026) |

---

## Data Source Hierarchy

Raw Regional Files
↓
Master Region
↓
Institutions Master (SSOT)
↓
Dashboard

---

## Category Definitions

### IPTA
Public Higher Education Institutions.

### IPTS
Private Higher Education Institutions.

### TVET
Technical and Vocational Education and Training Institutions including Polytechnics, Community Colleges and ADTEC institutions.

---

## Data Owner

TalentCorp COE GET

---

## Metadata

| Item | Value |
|--------|--------|
| Document Name | Data Dictionary |
| Repository | institution-engagement-dashboard |
| Dataset | institutions_master.csv |
| Version | 1.0 |
| Last Updated | June 2026 |

---
