# Governance Framework

## Purpose

To establish governance, ownership and maintenance procedures for the Institution Engagement Dashboard.

---

## Repository

institution-engagement-dashboard

Repository Location:
GitHub Repository

---

## Roles and Responsibilities

### Business Owner

TalentCorp CoE GET

Responsibilities:

- Define dashboard requirements
- Validate institution data
- Approve changes

### Repository Maintainer

Assigned Data Analyst

Responsibilities:

- Update SSOT
- Maintain documentation
- Monitor repository health
- Support dashboard continuity and handover

---

## Data Source Hierarchy

Raw Files
↓
Master Region
↓
Institutions Master (SSOT)
↓
Dashboard

---

## Single Source of Truth

/data/institutions_master.csv

All dashboard visualisations must reference the SSOT dataset.

---

## Governance Principles

- Maintain a single source of truth (SSOT)
- Minimize duplication of datasets
- Document all structural changes
- Ensure dashboard continuity across personnel changes

---

## Change Management

Any structural changes must be documented before deployment.
