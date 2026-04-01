/**
 * AUTH.JS - FULL REWRITE
 * Handles Authentication, Role Security, and ID Card Utilities.
 */

// 1. LOGIN: The Gatekeeper
async function login() {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    if (!email || !password) return alert("Please enter email and password");

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Get the 'Stamp' from Auth Metadata (Our safety net against 500 errors)
        const metaRole = data.user.user_metadata?.role || 'staff';

        // Attempt to fetch profile
        const { data: profile, error: profileError } = await supa
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn("DB Recursion detected. Using Metadata Role fallback.");
            window.currentUser = { 
                ...data.user, 
                role: metaRole, 
                full_name: data.user.user_metadata?.full_name || email.split('@')[0]
            };
        } else {
            window.currentUser = { ...data.user, ...profile };
        }

        console.log("Logged in as:", window.currentUser.role);
        
        await sync();
        
        // Navigation (Ensure these match your index.html IDs)
        showScreen('dashboardPage'); 

    } catch (err) {
        console.error("Login Error:", err);
        alert("Login Failed: " + err.message);
    }
}

// 2. LOGOUT: Clears everything
async function logout() {
    await supa.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    location.reload(); 
}

// 3. UTILITY: Generate ID Card PDF
async function generateIDCard() {
    const user = window.currentUser;
    if (!user) return alert("Please log in first");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [86, 54] // Standard ID card size
    });

    // Header Branding
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 86, 15, 'F');
    
    if (window.db?.branding?.logo_url) {
        try {
            const logoImg = await fetchImageAsBase64(window.db.branding.logo_url);
            doc.addImage(logoImg, 'PNG', 5, 2, 11, 11);
        } catch (e) { console.warn("Logo skipped"); }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text(window.db?.branding?.company_name || "SmartsourcingKe", 43, 9, { align: "center" });

    // Profile Photo
    if (user.pic) {
        try {
            const photoImg = await fetchImageAsBase64(user.pic);
            doc.addImage(photoImg, 'JPEG', 5, 20, 25, 25);
        } catch (e) { console.warn("Photo skipped"); }
    }

    // Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8).setFont(undefined, 'bold');
    doc.text("STAFF NAME:", 35, 25);
    doc.setFont(undefined, 'normal').text(user.full_name || "N/A", 35, 29);

    doc.setFont(undefined, 'bold').text("ROLE:", 35, 36);
    doc.setFont(undefined, 'normal').text(user.role || "Staff", 35, 40);

    doc.setFont(undefined, 'bold').text("STAFF ID:", 35, 47);
    doc.setFont(undefined, 'normal').text(String(user.id).slice(0, 8), 35, 51);

    doc.save(`ID_${user.full_name || 'Staff'}.pdf`);
}

// 4. UTILITY: Image to Base64 Helper
async function fetchImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error("Image Fetch Error:", err);
        throw err;
    }
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
// Global Exports
window.login = login;
window.logout = logout;
