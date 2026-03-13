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
async function handleAuthSuccess(session) {
    try {
        const { data: profile, error: profErr } = await supa
            .from("users")
            .select("*")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (profErr || !profile) {
            console.error("Profile fetch error:", profErr);
            // If JWT is expired or profile is missing, clear session
            if (profErr?.message.includes("JWT expired")) {
                await logout(); 
                return;
            }
            throw profErr || new Error("Profile not found");
        }

        window.currentUser = profile;
        await sync();
        showScreen("dashboard"); // Or whatever your dashboard ID is
    } catch (err) {
        console.error("Auth Success Error:", err);
        // Do not call sync() here if there is an error
    }
}

/**
 * GLOBAL SYNC
 * The most important function. It pulls fresh data from all tables
 * and triggers the 'renderAll' function to update the UI.
 */
/**
 * GLOBAL SYNC
 * Pulls fresh data and triggers UI updates.
 */
async function sync() {
    console.log("app.js:63 Syncing database...");
    
    // 1. Ensure the global DB object exists
    window.db = window.db || {};

    const tables = [
        "branding", "products", "retailers", "orders", 
        "order_items", "schools", "corporate_orders", 
        "corporate_order_items", "users", "payroll", "messages"
    ];

    try {
        // 2. Fetch all tables in parallel for better performance
        const syncPromises = tables.map(table => 
            supa.from(table).select("*").then(({ data, error }) => {
                if (error) {
                    console.warn(`Failed to sync table: ${table}`, error);
                    return { table, data: [] };
                }
                return { table, data };
            })
        );

        const results = await Promise.all(syncPromises);

        // 3. Assign results to window.db
        results.forEach(res => {
            window.db[res.table] = res.data;
        });

        console.log("Database sync complete. Data mapping:", Object.keys(window.db));

        // 4. Update Branding (Updates logo/names across the app)
        if (typeof renderBranding === "function") {
            renderBranding();
        }

        // 5. Trigger Master Render
        if (typeof renderAll === "function") {
            renderAll();
        }

        // 6. Update specific UI components safely
        if (typeof renderRetailerDropdown === "function") renderRetailerDropdown();
        if (typeof renderSchools === "function") renderSchools();
        if (typeof renderProductDropdowns === "function") renderProductDropdowns();

    } catch (err) {
        console.error("Critical Sync Error:", err);
    }
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