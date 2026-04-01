/**
 * AUTH.JS - COMPLETE REWRITE
 */

// 1. THE MAIN LOGIN FUNCTION
async function login() {
    const emailEl = document.getElementById("loginEmail");
    const passEl = document.getElementById("loginPassword");
    
    if (!emailEl || !passEl) return;
    const email = emailEl.value.trim();
    const password = passEl.value;

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Immediately identify role from Metadata to prevent 500-error lockouts
        const metaRole = data.user.user_metadata?.role || 'staff';

        const { data: profile, error: profileError } = await supa
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn("Database sync lagging. Using Auth Metadata.");
            window.currentUser = { 
                ...data.user, 
                role: metaRole, 
                full_name: data.user.user_metadata?.full_name || email.split('@')[0]
            };
        } else {
            window.currentUser = { ...data.user, ...profile };
        }

        console.log("Login Success. Role:", window.currentUser.role);
        
        // Move to Dashboard IMMEDIATELY before potentially heavy sync
        if (typeof showScreen === 'function') {
            showScreen('dashboardPage');
        } else {
            document.getElementById("loginPage")?.classList.add("hidden");
            document.getElementById("dashboardPage")?.classList.remove("hidden");
        }

        // Run data sync in the background
        await sync();
        if (typeof renderAll === 'function') renderAll();

    } catch (err) {
        console.error("Login Error:", err);
        alert("Login failed: " + err.message);
    }
}

// 2. LOGOUT
async function logout() {
    await supa.auth.signOut();
    localStorage.clear();
    location.reload(); 
}

// 3. UTILITY: ID CARD GENERATION (Full Original Logic)
async function generateIDCard() {
    const user = window.currentUser;
    if (!user) return alert("Please log in first");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });

    // Branding Header
    doc.setFillColor(40, 40, 40);
    doc.rect(0, 0, 86, 15, 'F');
    
    const b = window.db?.branding || {};
    if (b.logo_url) {
        try {
            const logo = await fetchImageAsBase64(b.logo_url);
            doc.addImage(logo, 'PNG', 5, 3, 10, 10);
        } catch (e) {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10).text(b.company_name || "ERP System", 43, 9, { align: "center" });

    // Photo
    if (user.pic) {
        try {
            const photo = await fetchImageAsBase64(user.pic);
            doc.addImage(photo, 'JPEG', 5, 20, 25, 25);
        } catch (e) { console.warn("Staff photo failed"); }
    }

    // Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8).setFont(undefined, 'bold').text("STAFF NAME:", 35, 25);
    doc.setFont(undefined, 'normal').text(user.full_name || "N/A", 35, 29);
    doc.setFont(undefined, 'bold').text("ROLE:", 35, 36);
    doc.setFont(undefined, 'normal').text(user.role || "Staff", 35, 40);
    doc.setFont(undefined, 'bold').text("ID:", 35, 47);
    doc.setFont(undefined, 'normal').text(String(user.id).slice(0, 8), 35, 51);

    doc.save(`ID_Card_${user.full_name || 'Staff'}.pdf`);
}

// 4. UTILITY: IMAGE HELPER
async function fetchImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}