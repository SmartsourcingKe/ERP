
async function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password });
        
        if (error) {
            // Check if it's a network error specifically
            if (error.message.includes("fetch")) {
                throw new Error("Network connection lost. Please check your internet or switch to a different network.");
            }
            throw error;
        }
		
        const { data: profile, error: profileError } = await supa
            .from('users')
            .select('role, full_name, pic')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("Profile sync error:", profileError);
            // Fallback: If profile fetch fails, default to staff to prevent lockout
            window.currentUser = { 
                ...data.user, 
                role: 'staff', 
                full_name: data.user.email.split('@')[0] 
            };
        } else {
            // Success: Merge auth data with database profile
            window.currentUser = { ...data.user, ...profile };
        }

        console.log("Logged in as:", window.currentUser.role);

        // 3. Initialize the Dashboard
        await sync();           // Pull all latest data (orders, products, etc.)
        showDashboard();        // Toggle UI visibility
        renderAll();            // Draw all tables and charts
        renderPermissions();    // Hide/Show tabs based on the 'role'

    } catch (err) {
        console.error("Login Error:", err);
        alert(err.message);
    }
}

async function logout() {
    await supa.auth.signOut();
    // CRITICAL: Wipe the local database so the next user starts fresh
    window.db = {}; 
    window.cart = [];
    window.corporateCart = [];
    
    // Force a clean reload to clear memory
    window.location.reload(); 
}

function handleSignedOut() {
    document.getElementById("dashboard")?.classList.add("hidden");
    document.getElementById("loginPage")?.classList.remove("hidden");
    window.currentUser = null;
}

async function restoreSession() {
    const { data } = await supa.auth.getSession();
    if (!data?.session) return;

    await handleSignedIn(data.session);
    await loadBranding();
}

/* ---- Permissions & UI Tools ---- */

function applyPermissions() {
    const user = window.currentUser;
    if (!user) return;

    const role = (user.role || "").toLowerCase();
    
    // Elements to toggle
    const adminBtn = document.getElementById("adminBtn");
    const payrollBtn = document.getElementById("payrollBtn");
    const performanceBtn = document.getElementById("performanceBtn");
    const profitBtn = document.getElementById("profitBtn");

    // Default: Hide all restricted tabs
    [adminBtn, payrollBtn, performanceBtn, profitBtn].forEach(btn => btn?.classList.add("hidden"));

    if (role === "admin") {
        [adminBtn, payrollBtn, performanceBtn, profitBtn].forEach(btn => btn?.classList.remove("hidden"));
    } else if (role === "staff") {
        performanceBtn?.classList.remove("hidden");
    }
}

// FIXED function name
function showScreen(screen) {
    document.getElementById("loginPage")?.classList.add("hidden");
    document.getElementById("dashboard")?.classList.remove("hidden");
    
    const welcome = document.getElementById("welcome");
    if (welcome && window.currentUser) {
        welcome.innerText = `Welcome, ${window.currentUser.full_name || 'User'}`;
    }
}

/* ---- Staff ID Generation (Consolidated) ---- */

async function generateUserID(userId) {
    if (!window.db?.users) return;
    const user = db.users.find(u => String(u.id) === String(userId));
    if (!user) return alert("User not found");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [86, 54] });

    // Background & Design
    doc.setFillColor(230, 236, 245);
    doc.rect(0, 0, 86, 54, "F");
    doc.setDrawColor(100);
    doc.rect(1, 1, 84, 52);

    // Header Branding
    if (db.branding?.logo_url) {
        try {
            const logoImg = await fetchImageAsBase64(db.branding.logo_url);
            doc.addImage(logoImg, 'PNG', 5, 4, 18, 10);
        } catch (e) { console.warn("Logo failed to load for ID"); }
    }

    doc.setFontSize(8).setFont(undefined, "bold");
    doc.text(db.branding?.company_name || "Company", 43, 10, { align: "center" });

    // User Photo & Details
    if (user.pic) {
        try {
            const photoImg = await fetchImageAsBase64(user.pic);
            doc.addImage(photoImg, 'JPEG', 5, 22, 20, 25);
        } catch (e) { console.warn("Staff photo failed to load for ID"); }
    }

    doc.setFontSize(7).text("Name:", 35, 22);
    doc.setFont(undefined, "normal").text(user.full_name || user.email || "User", 35, 26);
    
    doc.setFont(undefined, "bold").text("Role:", 35, 34);
    doc.setFont(undefined, "normal").text(user.role || "Staff", 35, 38);
    
    doc.setFont(undefined, "bold").text("Staff ID:", 35, 44);
    doc.setFont(undefined, "normal").text(String(user.id).slice(0, 8), 35, 48);

    doc.save(`ID_${user.full_name}.pdf`);
}

// Global Exports
window.login = login;
window.logout = logout;

async function checkUserRole() {
    const { data: { user } } = await supa.auth.getUser();
    if (user) {
        const { data: profile } = await supa.from('users').select('role').eq('id', user.id).single();
        // Update the global user object with the correct role
        window.currentUser = { ...user, role: profile?.role || 'staff' };
        console.log("Current User Role:", window.currentUser.role);
    }
}