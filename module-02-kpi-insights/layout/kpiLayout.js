/**
 * KPI Layout Orchestrator
 * 
 * Main entry point for assembling complete page layouts.
 * Uses type-driven section architecture for scalability.
 * 
 * Supported section types:
 * - 'grid': Responsive card grid
 * - 'panel': Content panel (charts, tables, etc)
 * - 'custom': Raw HTML content
 * 
 * Config-driven API allows new section types without modifying orchestrator.
 */

function createKpiLayout(config) {
    const {
        title = '',
        subtitle = '',
        breadcrumbs = null,
        filters = null,
        sections = []
    } = config;

    const container = document.createElement('main');
    container.id = 'dashboard-content';
    container.className = 'page-container';

    // Create page header
    const header = createPageHeader({
        title,
        subtitle,
        showBreadcrumb: breadcrumbs && breadcrumbs.length > 0,
        showFilters: filters && filters.length > 0
    });
    container.appendChild(header);

    // Add breadcrumbs if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
        const breadcrumbContainer = createBreadcrumbContainer({
            items: breadcrumbs
        });
        container.appendChild(breadcrumbContainer);
    }

    // Add filters if provided
    if (filters && filters.length > 0) {
        const filterArea = document.createElement('div');
        filterArea.className = 'filter-area';
        
        const filterForm = createFilterContainer({
            filters: filters
        });
        filterArea.appendChild(filterForm);
        container.appendChild(filterArea);
    }

    // Content area wrapper
    const contentArea = document.createElement('div');
    contentArea.className = 'content-area';

    // Process sections (type-driven architecture)
    sections.forEach(section => {
        const sectionElement = renderSection(section);
        if (sectionElement) {
            contentArea.appendChild(sectionElement);
        }
    });

    container.appendChild(contentArea);

    return container;
}

/**
 * Render a section based on its type
 * Type-driven architecture for scalability
 */
function renderSection(sectionConfig) {
    const { type = 'custom' } = sectionConfig;

    switch (type) {
        case 'grid':
            return renderGridSection(sectionConfig);

        case 'panel':
            return renderPanelSection(sectionConfig);

        case 'custom':
            return renderCustomSection(sectionConfig);

        default:
            console.warn(`[KpiLayout] Unknown section type: ${type}`);
            return null;
    }
}

/**
 * Render grid section
 * Grid: responsive card layout
 */
function renderGridSection(config) {
    const {
        columns = 5,
        items = [],
        title = '',
        subtitle = '',
        gap = 'default',
        className = ''
    } = config;

    const section = document.createElement('div');
    section.className = 'section';

    // Add header if provided
    if (title || subtitle) {
        const header = document.createElement('div');
        header.className = 'section-header';

        if (title) {
            header.innerHTML += `<h2 class="section-title">${escapeHtml(title)}</h2>`;
        }

        if (subtitle) {
            header.innerHTML += `<p class="section-subtitle">${escapeHtml(subtitle)}</p>`;
        }

        section.appendChild(header);
    }

    // Add grid
    const gridItems = items.map(item => {
        if (typeof item === 'string' && !item.startsWith('<')) {
            // Assume it's HTML content
            return item;
        }
        return item;
    });

    const grid = createContentGrid({
        items: gridItems,
        columns: columns,
        gap: gap,
        className: className
    });

    section.appendChild(grid);
    return section;
}

/**
 * Render panel section
 * Panel: content container for charts, tables, etc
 */
function renderPanelSection(config) {
    const {
        title = '',
        subtitle = '',
        content = '',
        className = ''
    } = config;

    const section = createSectionContainer({
        title: title,
        subtitle: subtitle,
        content: content,
        className: className,
        variant: 'default'
    });

    return section;
}

/**
 * Render custom section
 * Custom: raw HTML content
 */
function renderCustomSection(config) {
    const {
        content = '',
        className = ''
    } = config;

    const section = document.createElement('div');
    section.className = `section section--minimal ${className}`.trim();

    if (typeof content === 'string') {
        section.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        section.appendChild(content);
    }

    return section;
}

/**
 * Add section to existing layout
 */
function addSectionToLayout(layoutElement, sectionConfig) {
    const contentArea = layoutElement.querySelector('.content-area');
    if (!contentArea) {
        console.warn('[KpiLayout] No content area found in layout');
        return;
    }

    const section = renderSection(sectionConfig);
    if (section) {
        contentArea.appendChild(section);
    }
}

/**
 * Remove section from layout by index
 */
function removeSectionFromLayout(layoutElement, index) {
    const contentArea = layoutElement.querySelector('.content-area');
    if (!contentArea) return;

    const sections = contentArea.querySelectorAll('.section, [class*="grid"]');
    if (sections[index]) {
        sections[index].remove();
    }
}

/**
 * Clear all sections from layout
 */
function clearSections(layoutElement) {
    const contentArea = layoutElement.querySelector('.content-area');
    if (contentArea) {
        contentArea.innerHTML = '';
    }
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createKpiLayout,
        renderSection,
        renderGridSection,
        renderPanelSection,
        renderCustomSection,
        addSectionToLayout,
        removeSectionFromLayout,
        clearSections,
        escapeHtml
    };
}
