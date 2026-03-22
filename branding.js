/**
 * UPDATE BRANDING
 * Saves company name, tagline, logo, and background to Supabase.
 */
async function updateBranding() {
    if (!window.currentUser || window.currentUser.role !== "admin") {
        return alert("Access Denied: Admin privileges required.");
    }

    // Map these to the IDs in your index.html's Admin Tab
    const name = document.getElementById("brandingName")?.value;
    const tagline = document.getElementById("brandingTagline")?.value;
    const logoFile = document.getElementById("brandingLogo")?.files[0];
    const bgFile = document.getElementById("brandingBg")?.files[0];

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
/**
 * RENDER BRANDING
 * Synchronizes all branding elements (Login, Dashboard, Receipts, IDs).
 */
function renderBranding() {
    // Ensure we handle both array and single object data from Supabase
    const brand = Array.isArray(window.db.branding) ? window.db.branding[0] : window.db.branding;
    if (!brand) return;

    // 1. Text Branding (Names & Taglines)
    const nameElements = ["companyName", "loginCompanyName", "receiptCompanyName", "idHeaderName"];
    const taglineElements = ["companyTagline", "loginTagline", "receiptTagline"];

    nameElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = brand.company_name || "SmartsourcingKe ERP";
    });

    taglineElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = brand.tagline || "";
    });

    // 2. Logo Branding
    const logoElements = ["companyLogo", "loginLogo", "receiptLogo", "idLogo"];
    if (brand.logo_url) {
        logoElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.src = brand.logo_url;
                el.classList.remove("hidden");
                el.style.display = "block"; // Force display if hidden by CSS
            }
        });

        // Apply to Receipt Watermark & ID Watermark
        const watermarkImg = document.getElementById("watermarkImg");
        const idWatermark = document.getElementById("idWatermark");
        if (watermarkImg) watermarkImg.src = brand.logo_url;
        if (idWatermark) idWatermark.src = brand.logo_url;
    }

    // 3. Background / Page Styling
    if (brand.background_url) {
        // Apply a light overlay so text stays readable on the dashboard
        document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.9), rgba(244, 246, 249, 0.9)), url('${brand.background_url}')`;
        document.body.style.backgroundSize = "cover";
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

function applyBranding(brand) {
    if (!brand) return;

    // Institution Name & Tagline
    document.title = brand.company_name || "ERP System";
    const nameEls = document.querySelectorAll(".institution-name"); // Use a class for all name placeholders
    nameEls.forEach(el => el.textContent = brand.company_name);

    // Background Image logic
    if (brand.background_url) {
        const loginPage = document.getElementById("loginPage");
        if (loginPage) {
            loginPage.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${brand.background_url}')`;
            loginPage.style.backgroundSize = "cover";
        }
    }
    
    // Watermark for Receipts (Update the global CSS variable)
    if (brand.logo_url) {
        document.documentElement.style.setProperty('--brand-logo', `url(${brand.logo_url})`);
    }
}