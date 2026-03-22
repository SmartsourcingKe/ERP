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

    await sync(); // Only sync AFTER we have the role
    showScreen("dashboardPage");
}


async function sync() {
    if (isSyncing) return;
    isSyncing = true;
    console.log("Syncing database...");
    try {
        // Fetch ALL tables at once to fill ALL tabs
        const [prod, ret, ord, corp, sch, usr, msg, brand] = await Promise.all([
            supa.from('products').select('*'),
            supa.from('retailers').select('*'),
            supa.from('orders').select('*'),
            supa.from('corporate_orders').select('*'),
            supa.from('schools').select('*'),
            supa.from('users').select('*'),
            supa.from('messages').select('*').order('created_at', { ascending: true }), // For Messages tab
            supa.from('branding').select('*').single() // For Admin tab settings
        ]);

        // Mapping data to the global window.db object
        window.db = {
            products: prod.data || [],
            retailers: ret.data || [],
            orders: ord.data || [],
            corporate_orders: corp.data || [],
            schools: sch.data || [],
            users: usr.data || [],
            messages: msg.data || [], // Missing this was likely breaking your Chat
            branding: brand.data || {} // Missing this was likely breaking Admin settings
        };
        
        console.log("Sync complete. Data loaded:", window.db);
        
        // After data is loaded, you MUST call the renderers
        if (typeof renderAll === 'function') renderAll(); 
        
    } catch (err) {
        console.error("Sync failed:", err.message);
    }
	
window.db.users = users;
isSyncing = false;
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


supa.auth.onAuthStateChange(async (event, session) => {
    console.log("AUTH EVENT:", event);
    
    if (session && session.user) {
        window.currentUser = session.user;
        // Check if handleAuthSuccess exists before calling
        if (typeof handleAuthSuccess === "function") {
            await handleAuthSuccess(session); // Pass the whole session
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

function viewReceipt(id, type = 'retailer') {
    const modal = document.getElementById("receiptModal");
    if (!modal) return;

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