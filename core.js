// GLOBAL DATABASE CACHE
window.db = window.db || {
    users: [], products: [], retailers: [], orders: [],
    schools: [], corporate_orders: [], branding: null, messages: []
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
            if (typeof handleSignedIn === "function") {
                await handleSignedIn(session);
            }
        } else {
            if (typeof handleSignedOut === "function") {
                handleSignedOut();
            }
        }

        // Initialize Global Event Listeners after DOM is ready
        initGlobalListeners();

    } catch (err) {
        console.error("Initialization error:", err);
    }
});

/**
 * AUTH STATE LISTENER
 * Reacts to Sign In / Sign Out events globally.
 */
if (window.supa) {
    supa.auth.onAuthStateChange((event, session) => {
        console.log("AUTH EVENT:", event);

        if (event === "SIGNED_IN" && session) {
            if (typeof handleSignedIn === "function") {
                handleSignedIn(session);
            }
        }

        if (event === "SIGNED_OUT") {
            if (typeof handleSignedOut === "function") {
                handleSignedOut();
            }
        }
		
		let isSyncing = false;

async function safeSync() {
    if (isSyncing) return; // If already syncing, don't start another one
    isSyncing = true;
    
    await sync(); // Your existing sync function
    
    isSyncing = false;
}
		
    });
}

/**
 * GLOBAL EVENT LISTENERS
 * Attaches clicks to buttons. This is safer than inline onclick in some environments.
 */
function initGlobalListeners() {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            if (typeof login === "function") login();
        });
    }

    // Note: In your HTML, the logout button might not have an ID 'logoutBtn'. 
    // We target the class 'btn-red' or add an ID to the HTML logout button.
    const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".btn-red");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (typeof logout === "function") logout();
        });
    }
}