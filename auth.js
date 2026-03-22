/* ---- Authentication Logic ---- */

async function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // FETCH ROLE: This ensures the system knows you are an admin
        const { data: profile } = await supa.from('users').select('role, full_name').eq('id', data.user.id).single();
        window.currentUser = { ...data.user, ...profile };

        await sync();
        showDashboard();
        renderAll();
        renderPermissions(); // Explicitly call this to show admin tabs
    } catch (err) {
        alert("Login failed: " + err.message);
    }
}

async function logout() {
    try {
        if (typeof cleanupMessaging === "function") cleanupMessaging();
        
        const { error } = await supa.auth.signOut();
        if (error) throw error;

        handleSignedOut();
        console.log("Logged out successfully");
    } catch (err) {
        console.error("Logout failed:", err.message);
    }
}

/* ---- Session Handlers ---- */

async function handleSignedIn(session) {
    if (!session) return;
    const user = await handleAuthSuccess(session)

    // Force pull the role immediately from Supabase
    const { data: profile } = await supa
        .from('users')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

    // Set the global user with the correct role
    window.currentUser = profile ? { ...user, ...profile } : { ...user, role: 'employee' };
    
    console.log("Current User Role:", window.currentUser.role);

    await sync(); 
    showDashboard(); 
    renderAll();
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

function showScreen('dashboard') {
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