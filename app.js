// Global State
window.db = window.db || {};
window.currentUser = window.currentUser || null;
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

async function handleSignedIn(user) {
    const { data, error } = await supa
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();

    if (error) {
        console.error("User fetch error:", error);
        return;
    }

    window.currentUser = data; // ✅ ONLY SET ONCE
    console.log("FINAL USER:", window.currentUser);

    await sync();
    renderAll();
}

// Change the parameter name to 'session' and extract the user correctly
async function handleAuthSuccess(session) {
    if (!session || !session.user) return;
    
    // Set global user
    window.currentUser = session.user;

    // Fetch the role from the 'users' table specifically
    const { data: profile, error } = await supa
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) {
        console.error("Profile fetch error:", error);
        // If profile doesn't exist, we can't be admin
        window.currentUser.role = 'staff'; 
    } else {
        window.currentUser.role = profile.role;
        console.log("Logged in as:", profile.role);
    }

if (window._authHandled) return;
window._authHandled = true;

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


let authHandled = false;

supa.auth.onAuthStateChanged(async (event, session) => {
    if (session) {
        window.currentUser = session.user;
        // 1. IMMEDIATELY show the dashboard
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // 2. Load data in the background
        showLoadingSpinner(true); 
        await sync();
        showLoadingSpinner(false);
    } else {
        // Show login if no session
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
});

// Step 2: Set current user from DB
window.currentUser = {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.email,
    role: profile?.role || "staff"
};

console.log("Logged in as:", window.currentUser.role);

        console.log("Logged in as:", window.currentUser.role);

        // Show dashboard
        showDashboard();
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

function viewReceipt(id, type = 'retailer') {
    const modal = document.getElementById("receiptModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.style.display = 'block';

    // ✅ ADD THIS LINE HERE:
    if (typeof applyReceiptBranding === 'function') applyReceiptBranding();

    modal.classList.remove("hidden");
    modal.style.display = 'block';

    if (type === 'corporate') {
        // Logic from your corporateOrders.js
        renderCorporateReceipt(id); 
    } else if (type === 'payroll') {
        // Logic from your payroll.js
        viewPayrollReceipt(id);
    } else {
        // Standard Retail Receipt from retailerOrders.js
        renderReceipt(id);
    }
}

function closeReceiptModal() {
    const modal = document.getElementById("receiptModal");
    modal.classList.add("hidden");
    modal.style.display = 'none';
}
