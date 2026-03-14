/**
 * UPDATE BRANDING
 * Saves company name, tagline, logo, and background to Supabase.
 */
async function updateBranding() {
    if (!window.currentUser || window.currentUser.role !== "admin") {
        return alert("Access Denied: Admin privileges required.");
    }

    // Map these to the IDs in your index.html's Admin Tab
    const name = document.getElementById("brandCompanyName")?.value;
    const tagline = document.getElementById("brandTagline")?.value;
    const logoFile = document.getElementById("brandLogoFile")?.files[0];
    const bgFile = document.getElementById("brandBgFile")?.files[0];

    let logoUrl = window.db.branding?.logo_url || null;
    let bgUrl = window.db.branding?.background_url || null;

    try {
        // 1. Upload Logo to Storage if provided
        if (logoFile) {
            const fileName = `logo_${Date.now()}.${logoFile.name.split('.').pop()}`;
            const { error: upErr } = await supa.storage.from("branding").upload(fileName, logoFile);
            if (upErr) throw upErr;
            logoUrl = supa.storage.from("branding").getPublicUrl(fileName).data.publicUrl;
        }

        // 2. Upload Background to Storage if provided
        if (bgFile) {
            const fileName = `bg_${Date.now()}.${bgFile.name.split('.').pop()}`;
            const { error: upErr } = await supa.storage.from("branding").upload(fileName, bgFile);
            if (upErr) throw upErr;
            bgUrl = supa.storage.from("branding").getPublicUrl(fileName).data.publicUrl;
        }

        // 3. Upsert into the branding table
        const { error: dbErr } = await supa.from("branding").upsert({
            id: 1, 
            company_name: name,
            tagline: tagline,
            logo_url: logoUrl,
            background_url: bgUrl,
            updated_at: new Date()
        });

        if (dbErr) throw dbErr;

        alert("Branding updated successfully!");
        await sync(); // Refresh global data and UI
    } catch (err) {
        console.error("Branding Update Error:", err);
        alert("Failed to update branding: " + err.message);
    }
}

/**
 * RENDER BRANDING
 * Displays the branding data across the login and dashboard screens.
 */
function renderBranding() {
    const brand = Array.isArray(window.db.branding) ? window.db.branding[0] : window.db.branding;
    if (!brand) return;

    // Mapping to your index.html IDs
    const elements = {
        companyName: document.getElementById("companyName"),
        loginCompanyName: document.getElementById("loginCompanyName"),
        companyTagline: document.getElementById("companyTagline"),
        loginTagline: document.getElementById("loginTagline"),
        companyLogo: document.getElementById("companyLogo"),
        loginLogo: document.getElementById("loginLogo")
    };

    // Apply Company Name
    if (elements.companyName) elements.companyName.textContent = brand.company_name || "SmartsourcingKe ERP";
    if (elements.loginCompanyName) elements.loginCompanyName.textContent = brand.company_name || "SmartsourcingKe ERP";
    
    // Apply Tagline
    if (elements.companyTagline) elements.companyTagline.textContent = brand.tagline || "";
    if (elements.loginTagline) elements.loginTagline.textContent = brand.tagline || "";

    // Apply Logo URLs
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

    // Apply Background Image to Body
    if (brand.background_url) {
        document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.85), rgba(244, 246, 249, 0.85)), url('${brand.background_url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    }
}

/**
 * LOAD BRANDING
 */
async function loadBranding() {
    const { data, error } = await supa.from("branding").select("*").maybeSingle();
    if (error) console.error("Load Branding Error:", error);
    if (data) {
        window.db.branding = data;
        renderBranding();
    }
}