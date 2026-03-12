// Global State
window.db = {};
window.currentUser = null;
window.cart = [];
window.corporateCart = [];

/**
 * INITIALIZE APP
 * Run this when the window loads.
 */
async function initApp() {
    console.log("Initializing SmartsourcingKe ERP...");
    
    // 1. Check Auth Session
    const { data: { session } } = await supa.auth.getSession();
    
    if (session) {
        await handleAuthSuccess(session.user);
    } else {
        showScreen("loginPage");
    }

    // 2. Setup Real-time Listeners
    subscribeToMessages();
}

/**
 * HANDLE AUTH SUCCESS
 * Switches from login to dashboard and loads all data.
 */
async function handleAuthSuccess(authUser) {
    try {
        // Fetch the profile from our custom 'users' table
        const { data: profile, error } = await supa
            .from("users")
            .select("*")
            .eq("auth_user_id", authUser.id)
            .single();

        if (error || !profile) {
            console.error("Profile fetch error:", error);
            // If user exists in Auth but not in Users table, they might be a new admin
            window.currentUser = { id: authUser.id, role: 'admin', email: authUser.email };
        } else {
            window.currentUser = profile;
        }

        await sync(); // Load all database tables
        showScreen("dashboardSection");
        
    } catch (err) {
        console.error("Auth Success Error:", err);
        showScreen("loginPage");
    }
}

/**
 * GLOBAL SYNC
 * The most important function. It pulls fresh data from all tables
 * and triggers the 'renderAll' function to update the UI.
 */
async function sync() {
    console.log("Syncing database...");
    
    // Inside app.js sync()
const tables = [
    "branding", "products", "retailers", "orders", 
    "order_items", "schools", "corporate_orders", // Make sure 'schools' is here!
    "corporate_order_items", "users", "payroll", "messages"
];

    for (const table of tables) {
        const { data, error } = await supa.from(table).select("*");
        if (!error) {
            db[table] = data;
        } else {
            console.warn(`Failed to sync table: ${table}`, error);
        }
    }

    // Update UI
    renderAll();
    
    // Specific dropdown updates
    if (typeof renderRetailerDropdown === "function") renderRetailerDropdown();
    if (typeof renderSchools === "function") renderSchools();
    if (typeof renderProductDropdowns === "function") renderProductDropdowns();
}

/**
 * UI NAVIGATION
 * Simple function to swap between sections.
 */
function showScreen(sectionId) {
    const sections = document.querySelectorAll(".app-section");
    sections.forEach(s => s.classList.add("hidden"));
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove("hidden");
    }
}

// Start the engine
window.onload = initApp;