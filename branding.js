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

    // Use current DB values as fallback
    let logoUrl = window.db.branding?.logo_url || null;
    let bgUrl = window.db.branding?.background_url || null;

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

        const payload = { 
            company_name: name, 
            tagline: tagline, 
            logo_url: logoUrl, 
            background_url: bgUrl 
        };

        // 3. Upsert Logic: Check for existing row
        const { data: existing } = await supa.from("branding").select("id").limit(1).maybeSingle();

        let dbErr;
        if (existing) {
            const { error } = await supa.from("branding").update(payload).eq("id", existing.id);
            dbErr = error;
        } else {
            const { error } = await supa.from("branding").insert([payload]);
            dbErr = error;
        }

        if (dbErr) throw dbErr;

        // Refresh global state and UI
        await loadBranding(); 
        alert("Branding updated successfully!");

    } catch (err) {
        console.error("Branding update failed:", err);
        alert("Error: " + err.message);
    }
}

/**
 * RENDER BRANDING
 * Applies the logo, company name, and background to the UI.
 * This is designed to work for both Login and Dashboard.
 */
function renderBranding() {
    const brand = window.db.branding;
    if (!brand) return;

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
        [elements.companyLogo, elements.loginLogo].forEach(img => {
            if (img) {
                img.src = brand.logo_url;
                img.classList.remove("hidden");
            }
        });
    }

    // Apply App-wide Background Image
    if (brand.background_url) {
        document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.85), rgba(244, 246, 249, 0.85)), url('${brand.background_url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    }
}

/**
 * LOAD BRANDING
 * Publicly accessible function to fetch branding regardless of login status.
 */
async function loadBranding() {
    console.log("Fetching branding from Supabase...");
    const { data, error } = await supa.from("branding").select("*").limit(1);
    
    if (error) {
        return console.warn("Branding fetch failed:", error.message);
    }
    
    if (data && data.length > 0) {
        window.db.branding = data[0]; 
        renderBranding();
    }
}