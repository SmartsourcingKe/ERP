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

supa.auth.onAuthStateChange(async (event, session) => {
    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');

    console.log("Auth Event Triggered:", event);

    if (session) {
        const user = session.user;

        try {
            // Fetch profile data
            const { data: profile, error } = await supa
                .from('users')
                .select('role, full_name')
                .eq('id', user.id)
                .single();

            // Set global user
            window.currentUser = {
                id: user.id,
                email: user.email,
                full_name: profile?.full_name || user.email,
                role: profile?.role || "staff"
            };

            console.log("Authenticated as:", window.currentUser.role);

            // UI Swap
            if (loginPage) loginPage.style.display = 'none';
            if (mainApp) mainApp.style.display = 'block';

            // Start Sync
            if (typeof sync === 'function') {
                console.log("Starting background sync...");
                await sync(); 
            }

        } catch (err) {
            console.error("Auth Profile Error:", err);
            window.currentUser = { id: user.id, email: user.email, role: 'staff' };
        }
    } else {
        // Handle Logout
        window.currentUser = null;
        window.db = {}; 
        if (loginPage) {
            loginPage.style.display = 'block';
            loginPage.classList.remove('hidden');
        }
        if (mainApp) {
            mainApp.style.display = 'none';
            mainApp.classList.add('hidden');
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
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch((err) => console.log('Service Worker Failed', err));
    });
}

let deferredPrompt;

// 1. Setup the button reference inside a function or check for existence
const setupInstallLogic = () => {
    const mainInstallBtn = document.getElementById('installBtn');
    const banner = document.getElementById('installBanner');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (banner) banner.classList.remove('hidden');
    });

    if (mainInstallBtn) {
        mainInstallBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                if (banner) banner.classList.add('hidden');
            }
            deferredPrompt = null;
        });
    }

    window.addEventListener('appinstalled', () => {
        if (banner) banner.classList.add('hidden');
        deferredPrompt = null;
    });
};

setupInstallLogic();
