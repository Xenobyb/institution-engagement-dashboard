// Active state detection for sidebar navigation
function initializeActiveNavigation() {
    var navLinks = document.querySelectorAll('[data-module]');
    
    // Extract current module from pathname
    var pathname = window.location.pathname;
    var pathParts = pathname.split('/');
    
    // Extract module folder name (e.g., "module-03-governance-framework")
    var moduleFolder = null;
    for (var i = 0; i < pathParts.length; i++) {
        var part = pathParts[i];
        if (part.startsWith('module-')) {
            moduleFolder = part;
            break;
        }
    }
    
    if (!moduleFolder) {
        console.warn("[Navigation] Could not determine current module from pathname");
        return;
    }
    
    // Extract module number (e.g., "module-03" from "module-03-governance-framework")
    var match = moduleFolder.match(/^(module-\d+)/);
    var currentModule = match ? match[1] : null;
    
    if (!currentModule) {
        console.warn("[Navigation] Could not extract module number from:", moduleFolder);
        return;
    }
    
    console.log("[Navigation] Current module detected:", currentModule, "from folder:", moduleFolder);
    
    // Update nav links
    navLinks.forEach(function(link) {
        var moduleAttr = link.getAttribute('data-module');
        
        if (moduleAttr === currentModule) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
            console.log("[Navigation] Set active state on:", moduleAttr);
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeActiveNavigation();
});

// Also try to initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeActiveNavigation);
} else {
    initializeActiveNavigation();
}
