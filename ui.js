function applyBranding() {
    const b = window.db?.branding;
    if (!b || Object.keys(b).length === 0) {
        console.warn("Branding data not available yet");
        return;
    }

    console.log("Applying branding:", b); // debug log

    // Apply background if available
    if (b.background_url) {
        document.body.style.backgroundImage = `url(${b.background_url})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
    } else {
        // Reset to default if no background
        document.body.style.backgroundImage = "";
    }

    // Update system/company name
    const nameEl = document.getElementById("systemName");
    if (nameEl) {
        nameEl.textContent = b.company_name || "ERP System";
    }
}

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
 
// Global exposure for HTML onclick events
window.openTab = openTab;
window.showDashboard = showDashboard;