/**
 * Page Header Layout Component
 * 
 * Generic page header with title, subtitle, and optional breadcrumb/filters.
 * This is a LAYOUT component (structure only, no appearance).
 * Appearance is handled by CSS classes from layout.css
 */

function createPageHeader(config) {
    const {
        title = '',
        subtitle = '',
        showBreadcrumb = false,
        showFilters = false
    } = config;

    const header = document.createElement('header');
    header.className = 'page-header';
    if (showFilters) {
        header.classList.add('page-header--with-filters');
    }

    let html = '';

    // Title group
    html += '<div class="page-header__title-group">';
    html += '<div class="page-header__content">';

    if (title) {
        html += `<h1 class="page-header__title">${escapeHtml(title)}</h1>`;
    }

    if (subtitle) {
        html += `<p class="page-header__subtitle">${escapeHtml(subtitle)}</p>`;
    }

    html += '</div>';
    html += '</div>';

    // Filters will be added separately via appendChild or separate slot
    if (showFilters) {
        html += '<div class="page-header__filters"></div>';
    }

    header.innerHTML = html;
    return header;
}

/**
 * Add filters to page header
 * Used with showFilters: true configuration
 */
function addFiltersToPageHeader(headerElement, filterElement) {
    if (!headerElement || !filterElement) return;

    const filtersSlot = headerElement.querySelector('.page-header__filters');
    if (filtersSlot) {
        filtersSlot.appendChild(filterElement);
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
        createPageHeader,
        addFiltersToPageHeader,
        escapeHtml
    };
}
