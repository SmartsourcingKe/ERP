// GLOBAL DATABASE CACHE
window.db = {
    users: window.db?.users || [],
    products: window.db?.products || [],
    retailers: window.db?.retailers || [],
    orders: window.db?.orders || [],
    schools: window.db?.schools || [],
    corporate_orders: window.db?.corporate_orders || [],
    branding: window.db?.branding || null,
    messages: window.db?.messages || []
};

// CURRENT USER STATE
window.currentUser = window.currentUser || null;
window.dataLoaded = false;

/**
 * INITIALIZATION
 * Runs when the page loads to check if a user is already logged in.
 */
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Core initialized...");

    try {
        if (!window.supa) {
            console.error("Supabase client not initialized. Check supabase.js loading order.");
            return;
        }

        // Check for an existing session
        const { data, error } = await supa.auth.getSession();
        if (error) throw error;

        const session = data?.session;

        if (session) {
            // If session exists, trigger the signed-in flow in app.js
            if (typeof handleAuthSuccess === "function") {
                await handleAuthSuccess(session);
            }
        } else {
            // Show login screen if no session
            if (typeof showScreen === "function") {
                showScreen("loginPage");
            }
        }

        // Initialize Global Event Listeners after DOM is ready
        initGlobalListeners();

    } catch (err) {
        console.error("Initialization error:", err);
    }
});


/**
 * GLOBAL EVENT LISTENERS
 * Attaches clicks to buttons. This is safer than inline onclick.
 */
function initGlobalListeners() {
    // Login Button
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            if (typeof login === "function") login();
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".btn-red");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            if (window.supa) {
                await supa.auth.signOut();
            }
        });
    }
}

/**
 * SAFE SYNC WRAPPER
 * Prevents multiple sync processes from running at the same time.
 */
let isSyncing = false;
async function safeSync() {
    if (isSyncing) return;
    isSyncing = true;
    try {
        if (typeof sync === "function") {
            await sync();
        }
    } finally {
        isSyncing = false;
    }
}