/**
 * SWITCH TO DASHBOARD VIEW
 */
function showDashboard() {
    const loginPage = document.getElementById("loginPage");
    const dashboard = document.getElementById("dashboard");

    if (loginPage) loginPage.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
    
    // Set welcome text if available
    const welcome = document.getElementById("welcome");
    if (welcome && window.currentUser) {
        welcome.innerText = `Welcome, ${window.currentUser.full_name || 'User'}`;
    }
}

/**
 * TAB NAVIGATION LOGIC
 * Replaces 'showSection' to match your HTML 'openTab' calls.
 */
function openTab(tabId, btn) {
    // 1. Hide all tab contents
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.add("hidden"));

    // 2. Show the target tab
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.remove("hidden");
    } else {
        console.error(`Tab ID "${tabId}" not found.`);
    }

    // 3. Update active button styling
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
}

/**
 * TOGGLE SIDEBAR (Optional)
 * Kept for consistency, but ensure 'sidebar' exists in HTML if used.
 */
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.classList.toggle("open");
}

/**
 * GLOBAL RENDER DISPATCHER
 * Calls all modular render functions safely.
 */
function renderAll() {
    if (!window.db) return;

    console.log("Refreshing UI components...");

    const renderFunctions = [
        { name: "Products", fn: typeof renderProducts === "function" ? renderProducts : null },
        { name: "Retailers", fn: typeof renderRetailers === "function" ? renderRetailers : null },
        { name: "Orders", fn: typeof renderOrders === "function" ? renderOrders : null },
        { name: "Schools", fn: typeof renderSchools === "function" ? renderSchools : null },
        { name: "Corporate", fn: typeof renderCorporate === "function" ? renderCorporate : null },
        { name: "Employees", fn: typeof renderEmployees === "function" ? renderEmployees : null },
        { name: "Payroll", fn: typeof renderPayroll === "function" ? renderPayroll : null },
        { name: "Branding", fn: typeof renderBranding === "function" ? renderBranding : null },
        { name: "Messages", fn: typeof renderMessages === "function" ? renderMessages : null },
        { name: "Profit", fn: typeof renderProfit === "function" ? renderProfit : null }
    ];

    renderFunctions.forEach(task => {
        if (task.fn) {
            try {
                task.fn();
            } catch (err) {
                console.error(`Error rendering ${task.name}:`, err);
            }
        }
    });
}

// Global exposure for HTML onclick events
window.openTab = openTab;
window.showDashboard = showDashboard;