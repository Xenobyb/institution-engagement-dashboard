/**
 * Content Grid Layout Component
 * 
 * Generic responsive grid layout.
 * Automatically stacks at breakpoints: 5→3→2→1 columns.
 * 
 * This is a LAYOUT component (positioning only, content-agnostic).
 */

function createContentGrid(config) {
    const {
        items = [],      // Array of HTML strings or elements
        columns = 5,     // 5, 4, 3, 2, or 1
        className = '',  // Additional CSS classes
        gap = 'default'  // 'tight', 'default', 'loose'
    } = config;

    const grid = document.createElement('div');

    // Build grid classes
    const gridClasses = ['grid'];
    gridClasses.push(`grid--columns-${columns}`);

    if (gap === 'tight') {
        gridClasses.push('grid--gap-sm');
    } else if (gap === 'loose') {
        gridClasses.push('grid--gap-lg');
    } else {
        gridClasses.push('grid--gap-md');
    }

    if (className) {
        gridClasses.push(className);
    }

    grid.className = gridClasses.join(' ');

    // Add items to grid
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid-item';

        if (typeof item === 'string') {
            itemDiv.innerHTML = item;
        } else if (item instanceof HTMLElement) {
            itemDiv.appendChild(item);
        }

        grid.appendChild(itemDiv);
    });

    return grid;
}

/**
 * Create an auto-fit responsive grid
 * Columns automatically fit based on minimum width
 */
function createAutoGrid(config) {
    const {
        items = [],
        minWidth = 240,
        className = ''
    } = config;

    const grid = document.createElement('div');
    const gridClasses = ['grid', 'grid--auto'];

    if (className) {
        gridClasses.push(className);
    }

    grid.className = gridClasses.join(' ');

    // Add items to grid
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid-item';

        if (typeof item === 'string') {
            itemDiv.innerHTML = item;
        } else if (item instanceof HTMLElement) {
            itemDiv.appendChild(item);
        }

        grid.appendChild(itemDiv);
    });

    return grid;
}

/**
 * Add item to existing grid
 */
function addItemToGrid(gridElement, item) {
    if (!gridElement || !gridElement.classList.contains('grid')) {
        console.warn('[ContentGrid] Element is not a grid');
        return;
    }

    const itemDiv = document.createElement('div');
    itemDiv.className = 'grid-item';

    if (typeof item === 'string') {
        itemDiv.innerHTML = item;
    } else if (item instanceof HTMLElement) {
        itemDiv.appendChild(item);
    }

    gridElement.appendChild(itemDiv);
}

/**
 * Clear all items from grid
 */
function clearGrid(gridElement) {
    if (!gridElement || !gridElement.classList.contains('grid')) {
        console.warn('[ContentGrid] Element is not a grid');
        return;
    }

    gridElement.querySelectorAll('.grid-item').forEach(item => item.remove());
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createContentGrid,
        createAutoGrid,
        addItemToGrid,
        clearGrid
    };
}
