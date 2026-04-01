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

function viewReceipt(orderId) {
    const order = window.db.orders.find(o => String(o.id) === String(orderId));
    const items = (window.db.order_items || []).filter(oi => String(oi.order_id) === String(orderId));
    const branding = window.db.branding || {};

    if (!order) return alert("Order not found!");

    // 1. Fill Branding
    document.getElementById('receiptCompanyName').innerText = branding.company_name || "SmartsourcingKe";
    document.getElementById('receiptTagline').innerText = branding.tagline || "";
    document.getElementById('receiptLogo').src = branding.logo_url || "";
    document.getElementById('watermarkImg').src = branding.logo_url || "";

    // 2. Fill Meta (Order # and Date)
    document.getElementById('receiptMeta').innerHTML = `
        <p><strong>Order No:</strong> #${order.id.slice(0, 8)}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
    `;

    // 3. Fill Table Body (The 5 Columns)
    const tbody = document.getElementById('receiptItemsBody');
    tbody.innerHTML = items.map(item => {
        const qty = Number(item.quantity ?? 0);
        const price = Number(item.price_at_sale ?? 0);
        const fee = Number(item.fee ?? 0);
        const total = Number(item.total_price ?? (qty * price) + fee);

        return `
            <tr>
                <td style="padding: 5px 0;">${item.product_name || 'Item'}</td>
                <td style="text-align:center;">${qty}</td>
                <td style="text-align:center;">${price.toLocaleString()}</td>
                <td style="text-align:center;">${fee.toLocaleString()}</td>
                <td style="text-align:right; font-weight:bold;">${total.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    // 4. Fill Grand Total
    document.getElementById('receiptGrandTotal').innerText = `TOTAL: KES ${Number(order.total_amount ?? 0).toLocaleString()}`;

    // 5. Show Modal
    document.getElementById('receiptModal').classList.remove('hidden');
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

setupInstallLogic();
