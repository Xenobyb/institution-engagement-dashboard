/**
 * Base Card Component
 * 
 * Generic card appearance component (not layout).
 * Generates card HTML with configurable variations.
 * 
 * Variations:
 * - metric: For metrics/KPIs with icon + value
 * - panel: For content panels (charts, tables, etc)
 * - compact: Smaller, densely packed cards
 */

function createBaseCard(config) {
    const {
        variant = 'panel', // 'metric', 'panel', 'compact'
        label = '',
        value = '',
        subtitle = '',
        icon = '',
        title = '',
        description = '',
        content = '',
        className = ''
    } = config;

    // Build base card classes
    const baseClasses = ['base-card'];
    baseClasses.push(`base-card--${variant}`);
    if (className) baseClasses.push(className);

    const cardHTML = document.createElement('div');
    cardHTML.className = baseClasses.join(' ');

    if (variant === 'metric') {
        return createMetricCard(cardHTML, {
            label,
            value,
            subtitle,
            icon
        });
    } else if (variant === 'panel') {
        return createPanelCard(cardHTML, {
            title,
            description,
            content
        });
    } else if (variant === 'compact') {
        return createCompactCard(cardHTML, {
            label,
            value,
            subtitle,
            icon
        });
    }

    return cardHTML;
}

/**
 * Create metric card variant
 * Layout: icon + (label / value / subtitle)
 */
function createMetricCard(cardElement, config) {
    const { label, value, subtitle, icon } = config;

    let html = '';

    // Icon
    if (icon) {
        if (icon.startsWith('<')) {
            // Inline SVG
            html += icon;
        } else {
            // Image path
            html += `<div class="base-card__icon"><img src="${icon}" alt="${label}" /></div>`;
        }
    }

    // Content column
    html += '<div class="base-card__content">';

    if (label) {
        html += `<h3 class="base-card__label">${escapeHtml(label)}</h3>`;
    }

    if (value) {
        html += `<span class="base-card__value">${escapeHtml(value)}</span>`;
    }

    if (subtitle) {
        html += `<p class="base-card__subtitle">${escapeHtml(subtitle)}</p>`;
    }

    html += '</div>';

    cardElement.innerHTML = html;
    return cardElement;
}

/**
 * Create panel card variant
 * Layout: header (title + description) + body (content)
 */
function createPanelCard(cardElement, config) {
    const { title, description, content } = config;

    let html = '';

    // Header
    if (title || description) {
        html += '<div class="base-card__header">';

        if (title) {
            html += `<h3 class="base-card__title">${escapeHtml(title)}</h3>`;
        }

        if (description) {
            html += `<p class="base-card__description">${escapeHtml(description)}</p>`;
        }

        html += '</div>';
    }

    // Body
    if (content) {
        html += '<div class="base-card__body">';
        if (typeof content === 'string' && content.startsWith('<')) {
            // Raw HTML content (charts, tables, etc)
            html += content;
        } else {
            // Text content
            html += `<p>${escapeHtml(content)}</p>`;
        }
        html += '</div>';
    }

    cardElement.innerHTML = html;
    return cardElement;
}

/**
 * Create compact card variant
 * Similar to metric but smaller
 */
function createCompactCard(cardElement, config) {
    const { label, value, subtitle, icon } = config;

    let html = '';

    if (icon) {
        if (icon.startsWith('<')) {
            html += icon;
        } else {
            html += `<div class="base-card__icon"><img src="${icon}" alt="${label}" /></div>`;
        }
    }

    html += '<div class="base-card__content">';

    if (label) {
        html += `<h3 class="base-card__label">${escapeHtml(label)}</h3>`;
    }

    if (value) {
        html += `<span class="base-card__value">${escapeHtml(value)}</span>`;
    }

    if (subtitle) {
        html += `<p class="base-card__subtitle">${escapeHtml(subtitle)}</p>`;
    }

    html += '</div>';

    cardElement.innerHTML = html;
    return cardElement;
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

/**
 * Create a placeholder container for charts/tables
 * Returns a card with a placeholder container inside
 */
function createPlaceholderCard(config) {
    const {
        title = 'Content',
        description = 'Placeholder',
        containerHeight = 280,
        className = ''
    } = config;

    const card = document.createElement('div');
    card.className = `base-card base-card--panel ${className}`.trim();

    let html = '<div class="base-card__header">';
    html += `<h3 class="base-card__title">${escapeHtml(title)}</h3>`;
    if (description) {
        html += `<p class="base-card__description">${escapeHtml(description)}</p>`;
    }
    html += '</div>';

    html += '<div class="base-card__body">';
    html += `<div class="base-card__container" style="min-height: ${containerHeight}px;">`;
    html += '<div class="base-card__placeholder">';
    html += `<p class="base-card__placeholder-title">${escapeHtml(title)}</p>`;
    html += `<p class="base-card__placeholder-text">${escapeHtml(description)}</p>`;
    html += '</div>';
    html += '</div>';
    html += '</div>';

    card.innerHTML = html;
    return card;
}

/**
 * Create a chart panel card
 * For use with Chart.js and similar libraries
 */
function createChartCard(config) {
    const {
        title = 'Chart',
        description = '',
        canvasId = '',
        className = ''
    } = config;

    const card = document.createElement('div');
    card.className = `base-card base-card--panel ${className}`.trim();

    let html = '<div class="base-card__header">';
    html += `<h3 class="base-card__title">${escapeHtml(title)}</h3>`;
    if (description) {
        html += `<p class="base-card__description">${escapeHtml(description)}</p>`;
    }
    html += '</div>';

    html += '<div class="base-card__body">';
    html += '<div class="base-card__container">';
    if (canvasId) {
        html += `<canvas id="${canvasId}"></canvas>`;
    }
    html += '</div>';
    html += '</div>';

    card.innerHTML = html;
    return card;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createBaseCard,
        createMetricCard,
        createPanelCard,
        createCompactCard,
        createPlaceholderCard,
        createChartCard,
        escapeHtml
    };
}
