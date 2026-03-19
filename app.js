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

// 1. Add this at the top of app.js (outside any functions)
let isAuthProcessing = false;

// Change the parameter name to 'session' and extract the user correctly
async function handleAuthSuccess(session) {
    if (!session || !session.user) return;

    // FIX: Define the user variable that the rest of your code is looking for
    const user = session.user; 
    window.currentUser = user; // Set this globally for the rest of the app

    try {
        console.log("Auth Success for:", user.email);
        
        // Hide Login, Show App
        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('mainApp')?.classList.remove('hidden');

        // Fetch user profile from your 'users' table
        const { data: profile, error } = await supa
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) console.warn("Profile not found in database yet.");
        if (profile) window.currentUser = { ...user, ...profile };

        await sync(); // Start data download
        renderAll(); // Draw the UI
        
    } catch (err) {
        console.error("Initialization Error:", err);
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

supa.auth.onAuthStateChange(async (event, session) => {
    console.log("AUTH EVENT:", event);
    
    if (session && session.user) {
        window.currentUser = session.user;
        // Check if handleAuthSuccess exists before calling
        if (typeof handleAuthSuccess === "function") {
            await handleAuthSuccess(session.user);
        }
    } else {
        console.log("No session found, redirecting to login.");
        // FIX: Instead of calling a missing function, just show the login UI
        const loginModal = document.getElementById("loginModal");
        if (loginModal) {
            loginModal.classList.remove("hidden");
        }
    }
});

async function checkUserSession() {
    const { data: { user } } = await supa.auth.getUser();
    
    if (user) {
        // Find the profile in our 'users' table
        const { data: profile } = await supa
            .from('users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();

        if (profile) {
            window.currentUser = profile;
            // Now the "Account Not Set Up" warning will disappear
            renderUI(); 
        } else {
            console.error("Auth exists but no profile found in users table.");
        }
    }
}

function openTab(tabId, btn) {
    // 1. Hide all tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.style.display = 'none';
    });

    // 2. Show the requested tab
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block'; // Force it to show
    }

    // 3. Update button colors
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 4. If opening messages, load them and clear the badge
    if (tabId === 'messagesTab') {
        loadInternalMessages();
        const badge = document.getElementById('msgBadge');
        if (badge) badge.classList.add('hidden');
    }
}