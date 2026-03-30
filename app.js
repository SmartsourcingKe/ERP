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
    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');

    if (session) {
        // 1. Get basic user info immediately
        const user = session.user;

        try {
            // 2. Fetch the extra profile data (Role/Full Name) from your 'profiles' table
            const { data: profile } = await supa
                .from('profiles')
                .select('role, full_name')
                .eq('id', user.id)
                .single();

            // 3. Set the global user object ONCE
            window.currentUser = {
                id: user.id,
                email: user.email,
                full_name: profile?.full_name || user.email,
                role: profile?.role || "staff"
            };

            console.log("Authenticated as:", window.currentUser.role);

            // 4. UI SWAP: Show the app immediately so it doesn't feel "stuck"
            if (loginPage) loginPage.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');

            // 5. Background Sync: Load products, orders, etc.
            // We do this AFTER the UI swap so the user sees the dashboard layout first
            if (typeof showLoadingSpinner === 'function') showLoadingSpinner(true);
            
            await sync(); // This fills window.db with your 34 orders, etc.
            
            if (typeof showLoadingSpinner === 'function') showLoadingSpinner(false);

        } catch (err) {
            console.error("Auth Profile Error:", err);
            // Fallback if profile fetch fails
            window.currentUser = { id: user.id, email: user.email, role: 'staff' };
        }
    } else {
        // 6. LOGOUT: Wipe data and show login
        window.currentUser = null;
        window.db = {}; 
        if (loginPage) loginPage.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch((err) => console.log('Service Worker Failed', err));
    });
}

// At the very bottom of app.js
let deferredPrompt;

// 1. Detect iOS to show specific instructions
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS) {
    const iosText = document.getElementById('iosInstructions');
    const installBtn = document.getElementById('installBtn');
    if (iosText) iosText.style.display = 'block';
    if (installBtn) installBtn.style.display = 'none'; // iOS button doesn't work, instructions are needed
}

// 2. Android/Chrome logic
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('hidden'); // Show button only if browser is ready
});

const mainInstallBtn = document.getElementById('installBtn');
if (mainInstallBtn) {
    mainInstallBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert("To install, tap the 3 dots (top right) in Chrome and select 'Install App'.");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('installBanner').classList.add('hidden');
        }
        deferredPrompt = null;
    });
}