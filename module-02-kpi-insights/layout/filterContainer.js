/**
 * Filter Container Layout Component
 * 
 * Generic filter form layout (only structure, no filtering logic).
 * Renders filter fields and reset button.
 * This is a LAYOUT component (positioning only).
 */

function createFilterContainer(config) {
    const {
        filters = [],    // [{name, label, options: []}, ...]
        className = '',
        onReset = null   // Callback for reset button
    } = config;

    const form = document.createElement('form');
    form.className = `filter-form ${className}`.trim();
    form.setAttribute('aria-label', 'Filter form');

    // Filter container (grid layout)
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';

    // Create filter fields
    filters.forEach(filter => {
        const {
            name = '',
            label = '',
            options = [],
            type = 'select',  // 'select', 'text', 'date'
            value = ''
        } = filter;

        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'filter-field';
        fieldDiv.setAttribute('data-filter-name', name);

        let html = '';

        // Label
        if (label) {
            html += `<label for="${name}" class="filter-label">${escapeHtml(label)}</label>`;
        }

        // Input field
        if (type === 'select') {
            html += `<select id="${name}" name="${name}" class="filter-select">`;
            html += '<option value="">All</option>';

            options.forEach(option => {
                const {value: optionValue = '', label: optionLabel = ''} = option;
                html += `<option value="${escapeHtml(optionValue)}">${escapeHtml(optionLabel)}</option>`;
            });

            html += '</select>';
        } else if (type === 'text') {
            html += `<input type="text" id="${name}" name="${name}" class="filter-input" placeholder="Search...">`;
        } else if (type === 'date') {
            html += `<input type="date" id="${name}" name="${name}" class="filter-input">`;
        }

        fieldDiv.innerHTML = html;
        filterContainer.appendChild(fieldDiv);
    });

    // Reset button
    const resetDiv = document.createElement('div');
    resetDiv.className = 'filter-field filter-action';

    let resetHtml = '<label for="reset-filters" class="filter-label">Reset</label>';
    resetHtml += '<button id="reset-filters" type="reset" class="filter-button filter-button--icon" aria-label="Reset all filters"></button>';

    resetDiv.innerHTML = resetHtml;
    filterContainer.appendChild(resetDiv);

    // Add click handler for reset button if provided
    if (onReset) {
        const resetButton = resetDiv.querySelector('#reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', (e) => {
                e.preventDefault();
                form.reset();
                onReset();
            });
        }
    }

    form.appendChild(filterContainer);
    return form;
}

/**
 * Get filter values from form
 */
function getFilterValues(formElement) {
    const values = {};
    const formData = new FormData(formElement);

    for (let [name, value] of formData.entries()) {
        values[name] = value;
    }

    return values;
}

/**
 * Set filter values
 */
function setFilterValues(formElement, values) {
    Object.entries(values).forEach(([name, value]) => {
        const field = formElement.querySelector(`[name="${name}"]`);
        if (field) {
            field.value = value;
        }
    });
}

/**
 * Reset all filter values
 */
function resetFilterForm(formElement) {
    if (formElement && typeof formElement.reset === 'function') {
        formElement.reset();
    }
}

/**
 * Disable/enable filter fields
 */
function setFiltersDisabled(formElement, disabled = true) {
    const fields = formElement.querySelectorAll('select, input:not([type="reset"])');
    fields.forEach(field => {
        field.disabled = disabled;
    });
}

/**
 * Add change event listener to filters
 */
function onFilterChange(formElement, callback) {
    if (!callback) return;

    const fields = formElement.querySelectorAll('select, input');
    fields.forEach(field => {
        field.addEventListener('change', () => {
            const values = getFilterValues(formElement);
            callback(values);
        });
    });
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
        createFilterContainer,
        getFilterValues,
        setFilterValues,
        resetFilterForm,
        setFiltersDisabled,
        onFilterChange,
        escapeHtml
    };
}
