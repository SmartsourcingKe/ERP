// Global State
window.db = {};
window.currentUser = null;
window.cart = [];
window.corporateCart = [];

/**
 * INITIALIZE APP
 */
async function initApp() {
    console.log("Initializing SmartsourcingKe ERP...");
    
    // 1. Fetch current session from Supabase
    const { data: { session }, error } = await supa.auth.getSession();
    
    if (error) {
        console.error("Session fetch error:", error);
        return showScreen("loginPage");
    }

    if (session) {
        // Pass the whole session or just the user, but stay consistent
        await handleAuthSuccess(session);
    } else {
        console.log("No session found, redirecting to login.");
        showScreen("loginPage");
    }

    // 2. Setup Real-time Listeners (if defined in messages.js)
    if (typeof subscribeToMessages === "function") {
        subscribeToMessages();
    }
}

/**
 * HANDLE AUTH SUCCESS
 * Bridges the gap between Auth and the ERP Database.
 */
async function handleAuthSuccess(session) {
    try {
        // Safe check for ID regardless of how the session object is passed
        const userId = session?.user?.id || session?.id; 
        
        if (!userId) {
            console.error("Auth Success: No User ID found.");
            return showScreen("loginPage");
        }

        console.log("Authenticated User ID:", userId);

        // Fetch the profile from our custom 'users' table
        const { data: profile, error: profErr } = await supa
            .from("users")
            .select("*")
            .eq("auth_user_id", userId)
            .maybeSingle();

        if (profErr) throw profErr;
        
        if (!profile) {
            console.error("Access Denied: No profile found in 'public.users' table.");
            alert("Your account is not fully set up. Please contact the Admin.");
            await supa.auth.signOut();
            return showScreen("loginPage");
        }

        // Global User Setup
        window.currentUser = profile;
        
        // Load all data
        await sync();
        
        // UI Switch
        showScreen("dashboard");
        console.log("Login successful for:", profile.full_name);

    } catch (err) {
        console.error("Auth Success Error:", err);
        showScreen("loginPage");
    }
}

/**
 * GLOBAL SYNC
 * Parallel loading for speed + UI refresh.
 */
async function sync() {
    console.log("app.js:63 Syncing database...");
    window.db = window.db || {};

    const tables = [
        "branding", "products", "retailers", "orders", 
        "order_items", "schools", "corporate_orders", 
        "corporate_order_items", "users", "payroll", "messages"
    ];

    try {
        const syncPromises = tables.map(table => 
            supa.from(table).select("*").then(({ data, error }) => {
                if (error) {
                    console.warn(`Sync warning [${table}]:`, error.message);
                    return { table, data: [] };
                }
                return { table, data };
            })
        );

        const results = await Promise.all(syncPromises);
        results.forEach(res => { window.db[res.table] = res.data; });

        // Refresh UI components
        if (typeof renderBranding === "function") renderBranding();
        if (typeof renderAll === "function") renderAll();
        
        // Form-specific dropdowns
        if (typeof renderRetailerDropdown === "function") renderRetailerDropdown();
        if (typeof renderSchoolDropdown === "function") renderSchoolDropdown(); // Fixed name
        if (typeof renderProductDropdowns === "function") renderProductDropdowns();

    } catch (err) {
        console.error("Critical Sync Error:", err);
    }
}

/**
 * UI NAVIGATION
 */
function showScreen(sectionId) {
    // Hide all sections
    document.querySelectorAll(".app-section").forEach(s => s.classList.add("hidden"));
    
    // Special handling for dashboard/login wrappers
    if (sectionId === "loginPage") {
        document.getElementById("dashboard").classList.add("hidden");
    } else {
        document.getElementById("loginPage").classList.add("hidden");
    }

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove("hidden");
    }
}

window.onload = initApp;