// Shared sidebar component: persistent state, fragment loading, and navigation.
(function() {
    var STORAGE_KEY = "sidebarState";
    var COLLAPSED_CLASS = "sidebar-collapsed";
    var savedState = "collapsed";

    try {
        savedState = localStorage.getItem(STORAGE_KEY) || "collapsed";
        if (savedState !== "expanded" && savedState !== "collapsed") {
            savedState = "collapsed";
        }
        localStorage.setItem(STORAGE_KEY, savedState);
    } catch (error) {
        // Use the collapsed default when storage is unavailable.
    }

    document.documentElement.classList.toggle(COLLAPSED_CLASS, savedState === "collapsed");

    function setActiveNavigation(sidebar) {
        var moduleFolder = window.location.pathname.split("/").find(function(part) {
            return part.indexOf("module-") === 0;
        });
        var match = moduleFolder && moduleFolder.match(/^(module-\d+)/);
        var currentModule = match ? match[1] : null;

        sidebar.querySelectorAll("[data-module]").forEach(function(link) {
            var isCurrentPage = link.getAttribute("data-module") === currentModule;
            link.classList.toggle("active", isCurrentPage);

            if (isCurrentPage) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function attachClickToggle(sidebar) {
        var header = sidebar.querySelector(".sidebar-brand");
        
        if (!header) {
            return;
        }
        
        header.style.cursor = "pointer";
        header.setAttribute("role", "button");
        header.setAttribute("aria-label", "Toggle sidebar");
        
        function toggleSidebar() {
            var isCollapsed = document.documentElement.classList.contains(COLLAPSED_CLASS);
            var newState = isCollapsed ? "expanded" : "collapsed";
            
            document.documentElement.classList.toggle(COLLAPSED_CLASS);
            
            try {
                localStorage.setItem(STORAGE_KEY, newState);
            } catch (error) {
                // Storage unavailable; state will reset on page reload
            }
        }
        
        header.addEventListener("click", toggleSidebar);
        header.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleSidebar();
            }
        });
    }

    function loadSidebar() {
        var sidebar = document.getElementById("sidebar");

        if (!sidebar) {
            return;
        }

        fetch("../components/sidebar.html")
            .then(function(response) {
                if (!response.ok) {
                    throw new Error("Sidebar component request failed");
                }
                return response.text();
            })
            .then(function(markup) {
                sidebar.innerHTML = markup;
                setActiveNavigation(sidebar);
                attachClickToggle(sidebar);
                document.dispatchEvent(new CustomEvent("sidebar:ready"));
            })
            .catch(function(error) {
                console.error("[Sidebar] Could not load shared sidebar:", error);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadSidebar, { once: true });
    } else {
        loadSidebar();
    }
}());
