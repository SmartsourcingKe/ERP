/**
 * UPDATE BRANDING
 * Saves company name, tagline, logo, and background to Supabase.
 */
async function updateBranding() {
    if (!window.currentUser || window.currentUser.role !== "admin") {
        return alert("Access Denied: Admin privileges required.");
    }

    const name = document.getElementById("brandCompanyName").value;
    const tagline = document.getElementById("brandTagline").value;
    const logoFile = document.getElementById("brandLogoFile").files[0];
    const bgFile = document.getElementById("brandBgFile").files[0];

    let logoUrl = db.branding?.logo_url || null;
    let bgUrl = db.branding?.background_url || null;

    try {
        // 1. Upload Logo if provided
        if (logoFile) {
            const fileName = `logo_${Date.now()}.${logoFile.name.split('.').pop()}`;
            const { error: upErr } = await supa.storage.from("branding").upload(fileName, logoFile);
            if (upErr) throw upErr;
            logoUrl = supa.storage.from("branding").getPublicUrl(fileName).data.publicUrl;
        }

        // 2. Upload Background if provided
        if (bgFile) {
            const fileName = `bg_${Date.now()}.${bgFile.name.split('.').pop()}`;
            const { error: upErr } = await supa.storage.from("branding").upload(fileName, bgFile);
            if (upErr) throw upErr;
            bgUrl = supa.storage.from("branding").getPublicUrl(fileName).data.publicUrl;
        }

        // 3. Prepare Data
        const payload = { 
            company_name: name, 
            tagline: tagline, 
            logo_url: logoUrl, 
            background_url: bgUrl 
        };

        // --- START REPLACEMENT SECTION ---
        // We check Supabase directly for any existing branding row
        const { data: existing } = await supa.from("branding").select("id").maybeSingle();

        let dbErr;
        if (existing) {
            // If a row exists, we update it using its actual ID from the DB
            const { error } = await supa.from("branding").update(payload).eq("id", existing.id);
            dbErr = error;
        } else {
            // If no row exists, we insert the first one
            const { error } = await supa.from("branding").insert([payload]);
            dbErr = error;
        }
        // --- END REPLACEMENT SECTION ---

        if (dbErr) throw dbErr;

        await sync(); 
        alert("Branding updated successfully!");

    } catch (err) {
        console.error("Branding update failed:", err);
        alert("Error: " + err.message);
    }
}

/**
 * RENDER BRANDING
 * Applies the logo, company name, and background to the UI.
 */
function renderBranding() {
    const brand = db.branding;
    if (!brand) return;

    // Update Dashboard Header
    const elements = {
        companyLogo: document.getElementById("companyLogo"),
        companyName: document.getElementById("companyName"),
        companyTagline: document.getElementById("companyTagline"),
        loginLogo: document.getElementById("loginLogo"),
        loginCompanyName: document.getElementById("loginCompanyName"),
        loginTagline: document.getElementById("loginTagline")
    };

    // Apply Text Branding
    if (elements.companyName) elements.companyName.textContent = brand.company_name || "";
    if (elements.loginCompanyName) elements.loginCompanyName.textContent = brand.company_name || "SmartsourcingKe ERP";
    if (elements.companyTagline) elements.companyTagline.textContent = brand.tagline || "";
    if (elements.loginTagline) elements.loginTagline.textContent = brand.tagline || "";

    // Apply Logo Branding
    if (brand.logo_url) {
        if (elements.companyLogo) {
            elements.companyLogo.src = brand.logo_url;
            elements.companyLogo.classList.remove("hidden");
        }
        if (elements.loginLogo) {
            elements.loginLogo.src = brand.logo_url;
            elements.loginLogo.classList.remove("hidden");
        }
    }

    // Apply App-wide Background Image
    if (brand.background_url) {
        document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.85), rgba(244, 246, 249, 0.85)), url('${brand.background_url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    } else {
        document.body.style.backgroundImage = "none";
    }
}

/**
 * FETCH IMAGE AS BASE64
 * Helper for generating PDFs (Staff IDs, Invoices).
 */
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
    } catch (e) {
        console.error("Base64 fetch failed", e);
        return null;
    }
}

/**
 * INITIAL LOAD
 * Called during app startup.
 */
async function loadBranding() {
    // We use .limit(1) instead of maybeSingle to avoid errors if multiple rows exist
    const { data, error } = await supa.from("branding").select("*").limit(1);
    
    if (error) {
        return console.warn("Could not load branding settings:", error.message);
    }
    
    if (data && data.length > 0) {
        db.branding = data[0]; // Take the first row found
        renderBranding();
        console.log("Branding loaded successfully:", db.branding.company_name);
    } else {
        console.warn("Branding table is empty. Please save settings in the Admin tab.");
    }
}