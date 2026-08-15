/**
 * Breadcrumb Container Layout Component
 * 
 * Generic breadcrumb navigation with support for routing/state management.
 * Breadcrumb items include 'id' field for future routing integration.
 * This is a LAYOUT component (positioning only).
 */

function createBreadcrumbContainer(config) {
    const {
        items = [],      // [{id, label, href}, ...]
        className = '',
        onItemClick = null  // Callback for breadcrumb item clicks
    } = config;

    const container = document.createElement('nav');
    container.className = `breadcrumb-container ${className}`.trim();
    container.setAttribute('aria-label', 'Breadcrumb');

    if (!items || items.length === 0) {
        container.classList.add('breadcrumb-container--hidden');
        return container;
    }

    const breadcrumbList = document.createElement('ol');
    breadcrumbList.className = 'breadcrumb';

    items.forEach((item, index) => {
        const {
            id = '',
            label = '',
            href = '#'
        } = item;

        const listItem = document.createElement('li');
        listItem.className = 'breadcrumb-item';
        listItem.setAttribute('data-breadcrumb-id', id);

        // Mark last item as current
        if (index === items.length - 1) {
            listItem.classList.add('active');
            listItem.setAttribute('aria-current', 'page');
        }

        let html = '';

        if (index === items.length - 1) {
            // Current page (no link)
            html = `<span>${escapeHtml(label)}</span>`;
        } else {
            // Link to other pages
            html = `<a href="${escapeHtml(href)}" data-breadcrumb-id="${escapeHtml(id)}">${escapeHtml(label)}</a>`;
        }

        listItem.innerHTML = html;

        // Add click handler if provided
        if (onItemClick && index !== items.length - 1) {
            const link = listItem.querySelector('a');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    onItemClick(item, index);
                });
            }
        }

        breadcrumbList.appendChild(listItem);

        // Add separator between items
        if (index < items.length - 1) {
            const separator = document.createElement('li');
            separator.className = 'breadcrumb-separator';
            separator.setAttribute('aria-hidden', 'true');
            separator.textContent = '/';
            breadcrumbList.appendChild(separator);
        }
    });

    container.appendChild(breadcrumbList);
    return container;
}

/**
 * Update breadcrumb items
 */
function updateBreadcrumbItems(containerElement, items) {
    if (!containerElement || !containerElement.classList.contains('breadcrumb-container')) {
        console.warn('[BreadcrumbContainer] Element is not a breadcrumb container');
        return;
    }

    // Remove existing breadcrumb
    const existingBreadcrumb = containerElement.querySelector('.breadcrumb');
    if (existingBreadcrumb) {
        existingBreadcrumb.remove();
    }

    // Create new breadcrumb
    const newBreadcrumb = document.createElement('ol');
    newBreadcrumb.className = 'breadcrumb';

    if (!items || items.length === 0) {
        containerElement.classList.add('breadcrumb-container--hidden');
        containerElement.appendChild(newBreadcrumb);
        return;
    }

    containerElement.classList.remove('breadcrumb-container--hidden');

    items.forEach((item, index) => {
        const {
            id = '',
            label = '',
            href = '#'
        } = item;

        const listItem = document.createElement('li');
        listItem.className = 'breadcrumb-item';
        listItem.setAttribute('data-breadcrumb-id', id);

        if (index === items.length - 1) {
            listItem.classList.add('active');
            listItem.setAttribute('aria-current', 'page');
            listItem.innerHTML = `<span>${escapeHtml(label)}</span>`;
        } else {
            listItem.innerHTML = `<a href="${escapeHtml(href)}" data-breadcrumb-id="${escapeHtml(id)}">${escapeHtml(label)}</a>`;
        }

        newBreadcrumb.appendChild(listItem);

        if (index < items.length - 1) {
            const separator = document.createElement('li');
            separator.className = 'breadcrumb-separator';
            separator.setAttribute('aria-hidden', 'true');
            separator.textContent = '/';
            newBreadcrumb.appendChild(separator);
        }
    });

    containerElement.appendChild(newBreadcrumb);
}

/**
 * Get breadcrumb item by ID
 */
function getBreadcrumbItemById(containerElement, id) {
    const item = containerElement.querySelector(`[data-breadcrumb-id="${id}"]`);
    return item ? item : null;
}

/**
 * Set active breadcrumb item by ID
 */
function setActiveBreadcrumb(containerElement, id) {
    containerElement.querySelectorAll('.breadcrumb-item.active').forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
    });

    const item = containerElement.querySelector(`[data-breadcrumb-id="${id}"]`);
    if (item) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
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
        createBreadcrumbContainer,
        updateBreadcrumbItems,
        getBreadcrumbItemById,
        setActiveBreadcrumb,
        escapeHtml
    };
}
