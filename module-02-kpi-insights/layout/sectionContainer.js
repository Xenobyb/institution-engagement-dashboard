/**
 * Section Container Layout Component
 * 
 * Generic section wrapper with optional header (title + subtitle).
 * This is a LAYOUT component (positioning only, content-agnostic).
 */

function createSectionContainer(config) {
    const {
        title = '',
        subtitle = '',
        content = '',
        className = '',
        variant = 'default' // 'default', 'compact', 'minimal'
    } = config;

    const section = document.createElement('section');

    // Build section classes
    const sectionClasses = ['section'];
    sectionClasses.push(`section--${variant}`);
    if (className) {
        sectionClasses.push(className);
    }

    section.className = sectionClasses.join(' ');

    let html = '';

    // Section header
    if (title || subtitle) {
        html += '<div class="section-header">';

        if (title) {
            html += `<h2 class="section-title">${escapeHtml(title)}</h2>`;
        }

        if (subtitle) {
            html += `<p class="section-subtitle">${escapeHtml(subtitle)}</p>`;
        }

        html += '</div>';
    }

    // Section content
    if (content) {
        html += '<div class="section-content">';
        if (typeof content === 'string' && content.startsWith('<')) {
            // Raw HTML
            html += content;
        } else if (typeof content === 'string') {
            // Text content
            html += `<p>${escapeHtml(content)}</p>`;
        } else {
            html += content;
        }
        html += '</div>';
    }

    section.innerHTML = html;
    return section;
}

/**
 * Append content to section's content area
 */
function appendToSection(sectionElement, content) {
    if (!sectionElement || !sectionElement.classList.contains('section')) {
        console.warn('[SectionContainer] Element is not a section');
        return;
    }

    let contentArea = sectionElement.querySelector('.section-content');

    // Create content area if it doesn't exist
    if (!contentArea) {
        contentArea = document.createElement('div');
        contentArea.className = 'section-content';
        sectionElement.appendChild(contentArea);
    }

    if (typeof content === 'string') {
        contentArea.innerHTML += content;
    } else if (content instanceof HTMLElement) {
        contentArea.appendChild(content);
    }
}

/**
 * Clear section content
 */
function clearSectionContent(sectionElement) {
    const contentArea = sectionElement.querySelector('.section-content');
    if (contentArea) {
        contentArea.innerHTML = '';
    }
}

/**
 * Update section header
 */
function updateSectionHeader(sectionElement, title, subtitle) {
    let header = sectionElement.querySelector('.section-header');

    if (!header) {
        header = document.createElement('div');
        header.className = 'section-header';
        sectionElement.insertBefore(header, sectionElement.firstChild);
    }

    let html = '';

    if (title) {
        html += `<h2 class="section-title">${escapeHtml(title)}</h2>`;
    }

    if (subtitle) {
        html += `<p class="section-subtitle">${escapeHtml(subtitle)}</p>`;
    }

    header.innerHTML = html;
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
        createSectionContainer,
        appendToSection,
        clearSectionContent,
        updateSectionHeader,
        escapeHtml
    };
}
