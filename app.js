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

    // ONLY restore session (auth.js will handle everything else)
    if (typeof restoreSession === "function") {
        await restoreSession();
    }

    // Setup realtime messaging
    if (typeof subscribeToMessages === "function") {
        subscribeToMessages();
    }
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

if (typeof applyPermissions === "function") {
    applyPermissions();
}

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
