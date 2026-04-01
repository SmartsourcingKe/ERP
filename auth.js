 

async function login() {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    if (!email || !password) return alert("Please enter email and password");

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // 1. Get the 'Stamp' from Auth Metadata (Bypasses DB loops)
        const metaRole = data.user.user_metadata?.role || 'staff';

        // 2. Attempt to fetch full profile
        const { data: profile, error: profileError } = await supa
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn("DB Recursion detected. Using Metadata Fallback.");
            // If the DB crashes, we trust the 'admin' stamp from SQL Step #3
            window.currentUser = { 
                ...data.user, 
                role: metaRole, 
                full_name: data.user.user_metadata?.full_name || email.split('@')[0]
            };
        } else {
            window.currentUser = { ...data.user, ...profile };
        }

        console.log("Logged in successfully as:", window.currentUser.role);
        
        await sync();
        showScreen('dashboardPage'); 

    } catch (err) {
        console.error("Login Error:", err);
        alert("Login Failed: " + err.message);
    }
}

async function logout() {
    await supa.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    location.reload(); 
}

// --- UTILITY FUNCTIONS (Kept from original) ---

async function generateIDCard() {
    const user = window.currentUser;
    if (!user) return alert("No session found");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });

    // Branding Header
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 86, 15, 'F');
    
    const brand = window.db?.branding || {};
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10).text(brand.company_name || "SmartsourcingKe", 43, 9, { align: "center" });

    // Photo
    if (user.pic) {
        try {
            const photoBase64 = await fetchImageAsBase64(user.pic);
            doc.addImage(photoBase64, 'JPEG', 5, 20, 25, 25);
        } catch (e) { console.warn("Staff photo failed"); }
    }

    // Staff Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8).setFont(undefined, 'bold').text("NAME:", 35, 25);
    doc.setFont(undefined, 'normal').text(user.full_name || "User", 35, 29);
    
    doc.setFont(undefined, 'bold').text("ROLE:", 35, 36);
    doc.setFont(undefined, 'normal').text(user.role || "Staff", 35, 40);

    doc.setFont(undefined, 'bold').text("ID:", 35, 47);
    doc.setFont(undefined, 'normal').text(String(user.id).slice(0, 8), 35, 51);

    doc.save(`ID_${user.full_name}.pdf`);
}

async function fetchImageAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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
