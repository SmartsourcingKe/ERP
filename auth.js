async function login() {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // 1. Get the Role Stamp immediately
        const metaRole = data.user.user_metadata?.role || 'staff';

        // 2. Set the User Global Variable
        window.currentUser = { 
            ...data.user, 
            role: metaRole,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0]
        };

        // 3. UI FIRST: Show the dashboard now so the user isn't stuck
        if (typeof showScreen === 'function') {
            showScreen('dashboardPage');
        } else {
            document.getElementById("loginPage")?.classList.add("hidden");
            document.getElementById("dashboardPage")?.classList.remove("hidden");
        }

        console.log("UI Switched. Starting background sync...");

        // 4. BACKGROUND SYNC: If this fails, the user is already on the dashboard
        try {
            await sync();
            if (typeof renderAll === 'function') renderAll();
        } catch (syncErr) {
            console.warn("Sync failed in background, but login was successful.");
        }

    } catch (err) {
        alert("Login failed: " + err.message);
    }
}

async function logout() {
    await supa.auth.signOut();
    localStorage.clear();
    location.reload();
}

// Keep your original ID card functions below
async function generateIDCard() {
    const user = window.currentUser;
    if (!user) return alert("Log in first");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 86, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10).text("ERP System", 43, 9, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${user.full_name}`, 35, 25);
    doc.save(`ID_${user.full_name}.pdf`);
}

async function fetchImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise(r => {
        const reader = new FileReader();
        reader.onloadend = () => r(reader.result);
        reader.readAsDataURL(blob);
    });
}