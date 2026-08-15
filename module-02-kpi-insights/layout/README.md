# Layout Foundation for KPI Insights Module

## Overview

This document describes the **Layout Foundation** for Module 02 (KPI Insights). The layout system is a reusable, content-agnostic architecture that enables rapid page development by separating concerns into distinct layers:

- **Layout Layer** — Structure and positioning (content-agnostic)
- **Component Layer** — Appearance and styling (presentation)
- **Page Layer** — Composition and business logic

---

## Architecture Principles

### Dependency Hierarchy

```
Design Tokens (CSS variables from Module 01)
            ↓
      Layout Layer
            ↓
   Shared Components
            ↓
      Pages (your page implementation)
```

### Design Principles

1. **Layout is content-agnostic** – The layout layer has no awareness of KPI, Region, Institution, Charts, or Tables
2. **Single responsibility** – Each component answers one question:
   - Layout: "Where should content be placed?"
   - Components: "What does this look like?"
   - Pages: "How do these work together?"
3. **Configuration-driven** – Pages assemble layouts via config objects, not by duplicating HTML
4. **Responsive by default** – All layouts stack automatically at breakpoints (1200px → 900px → 768px → 640px)
5. **Module 01 consistency** – All design tokens (colors, spacing, typography) inherit from Module 01

---

## File Structure

```
module-02-kpi-insights/
├── layout/                          ← LAYOUT LAYER (structure)
│   ├── layout.css                  ← Entry CSS file (imports all)
│   ├── grid.css                    ← Grid primitives
│   ├── section.css                 ← Section containers
│   ├── breadcrumb.css              ← Breadcrumb styling
│   ├── filters.css                 ← Filter form styling
│   ├── pageHeader.js               ← Page header layout component
│   ├── contentGrid.js              ← Content grid layout component
│   ├── sectionContainer.js         ← Section container layout component
│   ├── breadcrumbContainer.js      ← Breadcrumb layout component
│   ├── filterContainer.js          ← Filter form layout component
│   └── kpiLayout.js                ← Orchestrator (main entry point)
├── components/                      ← COMPONENT LAYER (appearance)
│   ├── baseCard.css                ← Card styling (metric, panel, compact)
│   └── baseCard.js                 ← Base card component
├── index.html                       ← Demo page
├── config.js                        ← Module configuration
└── README.md                        ← This file
```

---

## Quick Start

### Basic Page Layout

```javascript
const layoutConfig = {
    title: "Page Title",
    subtitle: "Page subtitle",
    breadcrumbs: [
        {id: 'home', label: 'Home', href: '#/'},
        {id: 'current', label: 'Current', href: '#/current'}
    ],
    filters: [
        {name: 'year', label: 'Year', options: [
            {value: '2024', label: '2024'},
            {value: '2025', label: '2025'}
        ]},
        // ... more filters
    ],
    sections: [
        {type: 'grid', columns: 5, items: [...cards...]},
        {type: 'panel', title: 'Chart', content: '<canvas id="chart"></canvas>'},
        {type: 'custom', content: '<div>Custom content</div>'}
    ]
};

const layout = createKpiLayout(layoutConfig);
document.getElementById('app').appendChild(layout);
```

### CSS Import

```html
<link rel="stylesheet" href="layout/layout.css">
<link rel="stylesheet" href="components/baseCard.css">
```

### Script Imports

```html
<script src="layout/pageHeader.js"></script>
<script src="layout/contentGrid.js"></script>
<script src="layout/sectionContainer.js"></script>
<script src="layout/breadcrumbContainer.js"></script>
<script src="layout/filterContainer.js"></script>
<script src="layout/kpiLayout.js"></script>
<script src="components/baseCard.js"></script>
```

---

## Component API Reference

### `createKpiLayout(config)`

**Main orchestrator component. Main entry point for creating a complete page layout.**

**Parameters:**
```javascript
{
    title: string,              // Page title
    subtitle: string,           // Page subtitle
    breadcrumbs: Array,         // [{id, label, href}, ...]
    filters: Array,             // [{name, label, options}, ...]
    sections: Array             // [{ type, ... }, ...]
}
```

**Returns:** `HTMLElement` – Complete `<main>` element ready to mount

**Example:**
```javascript
const layout = createKpiLayout({
    title: 'Overview',
    subtitle: 'Key metrics',
    sections: [
        {type: 'grid', columns: 5, items: [card1, card2]}
    ]
});
document.body.appendChild(layout);
```

---

### Layout Primitives

#### `createPageHeader(config)`
Generic page title/subtitle header.

**Config:**
```javascript
{
    title: string,
    subtitle: string,
    showBreadcrumb: boolean,
    showFilters: boolean
}
```

#### `createContentGrid(config)`
Responsive card grid (auto-stacks at breakpoints).

**Config:**
```javascript
{
    items: Array,           // [HTML strings or elements]
    columns: 5|4|3|2|1,     // Column count
    className: string,
    gap: 'tight'|'default'|'loose'
}
```

#### `createSectionContainer(config)`
Generic section with optional header.

**Config:**
```javascript
{
    title: string,
    subtitle: string,
    content: string|HTMLElement,
    className: string,
    variant: 'default'|'compact'|'minimal'
}
```

#### `createBreadcrumbContainer(config)`
Breadcrumb navigation with routing support.

**Config:**
```javascript
{
    items: [{id, label, href}, ...],  // 'id' for future routing
    className: string,
    onItemClick: function(item, index)
}
```

#### `createFilterContainer(config)`
Filter form layout (no filtering logic).

**Config:**
```javascript
{
    filters: [{name, label, type, options}, ...],
    className: string,
    onReset: function
}
```

---

### Component Layer

#### `createBaseCard(config)`
Reusable card component with variants.

**Config:**
```javascript
{
    variant: 'metric'|'panel'|'compact',
    label: string,          // For metric variant
    value: string,          // For metric variant
    subtitle: string,       // For metric variant
    icon: string,           // Image path or SVG
    title: string,          // For panel variant
    description: string,    // For panel variant
    content: string,        // For panel variant
    className: string
}
```

**Variants:**

- **metric** – Icon + label + value + subtitle (for KPIs)
  ```javascript
  createBaseCard({
      variant: 'metric',
      icon: 'icon.svg',
      label: 'Total Institutions',
      value: '539',
      subtitle: '100% of total'
  })
  ```

- **panel** – Title + description + content (for charts, tables)
  ```javascript
  createBaseCard({
      variant: 'panel',
      title: 'Engagement Chart',
      description: 'Regional breakdown',
      content: '<canvas id="chart"></canvas>'
  })
  ```

- **compact** – Smaller metric card
  ```javascript
  createBaseCard({
      variant: 'compact',
      icon: 'icon.svg',
      label: 'Value',
      value: '42',
      subtitle: 'Subtitle'
  })
  ```

---

## Section Types (Type-Driven Architecture)

The `sections` array in `createKpiLayout()` supports multiple section types:

### Grid Section
```javascript
{
    type: 'grid',
    title: 'KPI Summary',           // Optional
    subtitle: 'Overview',           // Optional
    columns: 5,                     // 5, 4, 3, 2, 1
    gap: 'default',                 // 'tight', 'default', 'loose'
    items: [card1, card2, ...]      // HTML or elements
}
```

### Panel Section
```javascript
{
    type: 'panel',
    title: 'Chart Title',
    subtitle: 'Chart description',
    content: '<canvas id="my-chart"></canvas>'
}
```

### Custom Section
```javascript
{
    type: 'custom',
    content: '<div>Raw HTML or component</div>'
}
```

---

## Responsive Behavior

All layouts automatically stack at breakpoints:

| Breakpoint | Grid Cols | Filter Cols | Padding |
|-----------|-----------|------------|---------|
| 1200px+   | 5-4-3     | 5          | 32px    |
| 900px     | 3         | 2          | 24px    |
| 768px     | 2         | 2          | 20px    |
| 640px     | 1         | 1          | 16px    |

All responsive behavior is **automatic** via CSS media queries. No JavaScript modifications needed.

---

## CSS Classes Reference

### Grid Classes
```css
.grid               /* Grid container */
.grid--columns-5    /* 5-column layout */
.grid--columns-3    /* 3-column layout */
.grid--columns-2    /* 2-column layout */
.grid--columns-1    /* 1-column layout */
.grid--auto         /* Auto-fit layout */
.grid-item          /* Individual grid item */
```

### Section Classes
```css
.section            /* Section container */
.section--compact   /* Compact variant */
.section--minimal   /* Minimal variant (no styling) */
.section-header     /* Section header */
.section-title      /* Title element */
.section-subtitle   /* Subtitle element */
.section-content    /* Content wrapper */
```

### Breadcrumb Classes
```css
.breadcrumb-container   /* Breadcrumb wrapper */
.breadcrumb             /* Breadcrumb list */
.breadcrumb-item        /* Breadcrumb item */
.breadcrumb-item.active /* Current page indicator */
.breadcrumb-separator   /* Item separator */
```

### Filter Classes
```css
.filter-form        /* Form wrapper */
.filter-container   /* Responsive filter grid */
.filter-field       /* Individual filter field */
.filter-label       /* Field label */
.filter-select      /* Select dropdown */
.filter-input       /* Text/date input */
.filter-button      /* Reset/action button */
.filter-action      /* Action button container */
```

### Card Classes
```css
.base-card          /* Card container */
.base-card--metric  /* Metric card variant */
.base-card--panel   /* Panel card variant */
.base-card--compact /* Compact card variant */
.base-card__icon    /* Icon element */
.base-card__content /* Content wrapper */
.base-card__value   /* Value text */
```

---

## Utility Classes

```css
.hidden             /* display: none */
.text-center        /* text-align: center */
.text-muted         /* Muted color */
.text-subtle        /* Subtle color */

.mt-sm, .mt-md, .mt-lg      /* Margin-top utilities */
.mb-sm, .mb-md, .mb-lg      /* Margin-bottom utilities */
.gap-sm, .gap-md, .gap-lg   /* Gap utilities */

.truncate           /* Single-line text truncation */
.line-clamp-2       /* Multi-line text truncation */
```

---

## Design Tokens (Inherited from Module 01)

All styling uses CSS variables from Module 01. Do not hardcode colors or spacing.

```css
/* Colors */
--color-background: #0b1120
--color-surface: #111827
--color-surface-elevated: #172033
--color-text: #f8fafc
--color-text-muted: #94a3b8
--color-accent: #2563eb

/* Spacing (8px scale) */
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px

/* Radius */
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px

/* Shadows */
--shadow-card: 0 18px 45px rgba(0, 0, 0, 0.28)
--shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.2)

/* Z-Index */
--z-base: 1
--z-dropdown: 100
--z-sticky: 500
--z-modal: 1000
```

---

## Examples

### Example 1: KPI Overview Page

```javascript
const config = {
    title: 'KPI Overview',
    subtitle: 'Real-time performance metrics',
    breadcrumbs: [
        {id: 'home', label: 'Home', href: '#/'},
        {id: 'overview', label: 'Overview', href: '#/overview'}
    ],
    filters: [
        {name: 'year', label: 'Year', options: [
            {value: '2024', label: '2024'},
            {value: '2025', label: '2025'}
        ]},
        {name: 'region', label: 'Region', options: [
            {value: 'north', label: 'Northern'},
            {value: 'south', label: 'Southern'}
        ]}
    ],
    sections: [
        {
            type: 'grid',
            title: 'Key Metrics',
            columns: 5,
            items: [
                createBaseCard({variant: 'metric', label: 'Total', value: '539'}),
                createBaseCard({variant: 'metric', label: 'Engaged', value: '350'})
            ].map(el => el.outerHTML)
        },
        {
            type: 'panel',
            title: 'Regional Distribution',
            content: '<canvas id="chart"></canvas>'
        },
        {
            type: 'panel',
            title: 'Institution Directory',
            content: '<table id="directory-table"></table>'
        }
    ]
};

const layout = createKpiLayout(config);
document.getElementById('app-mount').appendChild(layout);
```

### Example 2: Adding Sections Dynamically

```javascript
const layout = createKpiLayout(initialConfig);
document.body.appendChild(layout);

// Add new section after initial render
addSectionToLayout(layout, {
    type: 'panel',
    title: 'New Section',
    content: 'Dynamic content'
});

// Remove section at index 2
removeSectionFromLayout(layout, 2);

// Clear all sections
clearSections(layout);
```

---

## Best Practices

1. **Use config-driven approach** – Always pass configuration objects to layout components
2. **Keep layout and components separate** – Don't mix layout concerns with appearance
3. **Reuse base components** – Extend `createBaseCard()` for new card types, don't create duplicates
4. **Maintain design token consistency** – Reference CSS variables, never hardcode colors
5. **Plan for responsiveness** – Test layouts at 1200px, 900px, 768px, 640px breakpoints
6. **Document custom sections** – If adding new section types, update this README
7. **Test with placeholder content** – Verify layout before adding real data/business logic

---

## Future Enhancements

The layout foundation supports future expansion:

1. **New section types** – Add entries in `renderSection()` switch statement
2. **Custom card variants** – Extend `baseCard.js` with new variants
3. **Advanced filtering** – Add filter logic without modifying layout components
4. **Data binding** – Bind data to cards/grids without changing layout structure
5. **State management** – Integrate Redux/Vuex while keeping layout layer pure
6. **Routing** – Breadcrumb `id` field supports router integration (e.g., React Router)

---

## Troubleshooting

### Layout not centering
- Check that `page-container` class is applied
- Verify `--content-max-width: 1800px` is available

### Responsive stacking not working
- Ensure `layout.css` is imported before custom CSS
- Check browser DevTools for CSS conflicts
- Verify media queries in grid.css

### Cards overflowing
- Add `min-width: 0` to grid items (included in `.grid-item`)
- Check card content doesn't exceed container

### Filter form not appearing
- Set `filters: [...]` in layout config
- Ensure `createFilterContainer()` is accessible

---

## Questions & Support

For questions about the layout foundation:

1. Review this README
2. Check the [demo page](index.html) for working examples
3. Inspect CSS in `layout/` directory for detailed styles
4. Review function signatures in component files

---

**Sprint 2.1.1 Deliverables:** ✅ Layout Foundation Complete

This layout system provides a solid foundation for all KPI Insights pages. Future pages can be built by simply providing configuration objects to `createKpiLayout()`, ensuring consistency across the entire module.
