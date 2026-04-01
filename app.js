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
	
supa.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth Event Triggered:", event);

    if (event === "SIGNED_IN") {
        const user = session.user;

        try {
            const { data: profile, error } = await supa
                .from('users')
                .select('role, full_name')
                .eq('id', user.id)
                .single();

            window.currentUser = {
                id: user.id,
                email: user.email,
                full_name: profile?.full_name || user.email,
                role: profile?.role || "staff"
            };

            console.log("Authenticated as:", window.currentUser.role);

            if (typeof sync === "function") {
                console.log("Starting background sync...");
                await sync(); 
            }

            if (typeof renderAll === "function") {
                renderAll();
            }

            showDashboard();

        } catch (err) {
            console.error("Auth Profile Error:", err);
        }
    }

    if (event === "SIGNED_OUT") {
        window.currentUser = null;
        location.reload();
    }
});

    window.addEventListener('appinstalled', () => {
        if (banner) banner.classList.add('hidden');
        deferredPrompt = null;
    });
};

function triggerPrint(orderId) {
    const content = document.getElementById("receiptModalContent");
    
    // 1. Generate the HTML using the function we fixed
    const receiptHTML = generateReceiptHTML(orderId);
    
    // 2. Inject it into the modal
    if (content) {
        content.innerHTML = receiptHTML;
        
        // 3. Small delay to ensure the browser has rendered the text
        setTimeout(() => {
            window.print();
        }, 250); 
    } else {
        console.error("Could not find receiptModalContent element");
    }
}

function printReceiptNow() {
    // Ensure the modal is not hidden before printing
    const modal = document.getElementById('receiptModal');
    if (modal.classList.contains('hidden')) {
        console.error("Cannot print a hidden receipt.");
        return;
    }

    // Trigger the print
    window.print();
}
setupInstallLogic();
