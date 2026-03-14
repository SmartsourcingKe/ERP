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
        await handleAuthSuccess(session);
    } else {
        console.log("No session found, redirecting to login.");
        showScreen("loginPage");
    }
}

/**
 * HANDLE AUTH SUCCESS
 */
async function handleAuthSuccess(session) {
    try {
        const userId = session?.user?.id; 
        
        if (!userId) {
            return showScreen("loginPage");
        }

        // Fetch profile using auth_user_id
        const { data: profile, error: profErr } = await supa
            .from("users")
            .select("*")
            .eq("auth_user_id", userId)
            .maybeSingle();

        if (profErr) throw profErr;
        
        if (!profile) {
            alert("Account profile not found. Please contact Admin.");
            await supa.auth.signOut();
            return showScreen("loginPage");
        }

        window.currentUser = profile;
        document.getElementById("welcome").innerText = "Welcome, " + profile.full_name;
        
        // Show/Hide Admin Buttons
        if(profile.role === 'admin') {
            document.querySelectorAll('.tab-btn.hidden').forEach(btn => btn.classList.remove('hidden'));
        }

        await sync();
        showScreen("dashboard");

    } catch (err) {
        console.error("Auth Success Error:", err);
        showScreen("loginPage");
    }
}

/**
 * GLOBAL SYNC
 */
async function sync() {
    console.log("Syncing database...");
    const tables = [
        "branding", "products", "retailers", "orders", 
        "order_items", "schools", "corporate_orders", 
        "users", "payroll", "messages"
    ];

    try {
        const results = await Promise.all(
            tables.map(table => supa.from(table).select("*"))
        );

        tables.forEach((table, index) => {
            window.db[table] = results[index].data || [];
        });

        // RE-FILL ALL DROPDOWNS
        renderRetailerDropdown();
        renderProductDropdowns();
        renderSchoolDropdown();

        // CALL MASTER RENDER
        if (typeof renderAll === "function") renderAll();
        
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

/**
 * DROPDOWN RENDERERS
 * These ensure your "Select Retailer" and "Select Product" lists aren't empty.
 */
function renderRetailerDropdown() {
    const sel = document.getElementById("retailerSelect");
    if (!sel) return;
    const list = window.db.retailers || [];
    sel.innerHTML = '<option value="">Select Retailer...</option>' + 
        list.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
}

function renderProductDropdowns() {
    const sel = document.getElementById("productSelect");
    if (!sel) return;
    const list = window.db.products || [];
    sel.innerHTML = '<option value="">Select Product...</option>' + 
        list.map(p => `<option value="${p.id}">${p.product_name} (Stock: ${p.stock})</option>`).join("");
}

function renderSchoolDropdown() {
    const sel = document.getElementById("corpSchoolSelect");
    if (!sel) return;
    const list = window.db.schools || [];
    sel.innerHTML = '<option value="">Select School...</option>' + 
        list.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}

/**
 * UI NAVIGATION
 */
function showScreen(sectionId) {
    if (sectionId === "loginPage") {
        document.getElementById("loginPage").classList.remove("hidden");
        document.getElementById("dashboard").classList.add("hidden");
    } else {
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
    }
}

// Map the global window load to initApp
window.onload = initApp;