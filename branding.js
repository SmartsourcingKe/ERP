/**
 * UPDATE BRANDING
 * Saves company name, tagline, logo, and background to Supabase.
 */
async function updateBranding() {
  if (!window.currentUser || window.currentUser.role !== "admin") {
    return alert("Access Denied: Admin only");
  }

  const name = document.getElementById("brandingName")?.value;
  const tagline = document.getElementById("brandingTagline")?.value;

  let logo_url = null;
  let background_url = null;

  const logoFile = document.getElementById("brandingLogo")?.files[0];
  const bgFile = document.getElementById("brandingBackground")?.files[0];

  // ✅ Upload logo
  if (logoFile) {
    const path = `branding/logo_${Date.now()}_${logoFile.name}`;
    await supa.storage.from("assets").upload(path, logoFile);

    const { data } = supa.storage.from("assets").getPublicUrl(path);
    logo_url = data.publicUrl;
  }

  // ✅ Upload background
  if (bgFile) {
    const path = `branding/bg_${Date.now()}_${bgFile.name}`;
    await supa.storage.from("assets").upload(path, bgFile);

    const { data } = supa.storage.from("assets").getPublicUrl(path);
    background_url = data.publicUrl;
  }

  // ✅ SAVE (NO ID!)
  const { error } = await supa.from("branding").upsert({
    company_name: name,
    tagline,
    logo_url,
    background_url
  });

  if (error) {
    console.error(error);
    return alert("Failed to update branding: " + error.message);
  }

  alert("Branding updated successfully");

  await sync();         // ✅ reload data
  applyBranding();      // ✅ reapply UI
}

function renderBranding() {
    // Handle both array and single object from Supabase
    const brand = Array.isArray(window.db?.branding) ? window.db.branding[0] : window.db?.branding;
    if (!brand || Object.keys(brand).length === 0) {
        console.warn("No branding data available yet");
        return;
    }

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
    logoElements.forEach(id => {
        const el = document.getElementById(id);
        if (el && brand.logo_url) {
            el.src = brand.logo_url;
            el.classList.remove("hidden");
            el.style.display = "block"; // Ensure visible
        }
    });

    // Apply to watermark images
    const watermarkElements = ["watermarkImg", "idWatermark"];
    watermarkElements.forEach(id => {
        const el = document.getElementById(id);
        if (el && brand.logo_url) el.src = brand.logo_url;
    });

    // 3. Background / Page Styling
    if (brand.background_url) {
        // Light overlay to keep text readable
        document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.9), rgba(244, 246, 249, 0.9)), url('${brand.background_url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
    } else {
        // Reset if no background defined
        document.body.style.backgroundImage = "";
    }
}

/**
 * LOAD BRANDING
 */
async function loadBranding() {
    try {
        const { data, error } = await supa.from("branding").select("*").maybeSingle();
        if (error) {
            console.error("Load Branding Error:", error);
            return;
        }

        if (!data) {
            console.warn("No branding data found");
            return;
        }

        window.db.branding = data;

        // Apply UI branding
        renderBranding();          // For logos, receipts, backgrounds
        applyBranding(window.db.branding); // For page title, login background, CSS watermark
    } catch (err) {
        console.error("Unexpected error loading branding:", err);
    }
}

function applyBranding(brand) {
    if (!brand) return;

    // Page title
    document.title = brand.company_name || "ERP System";

    // Institution names (all elements with this class)
    document.querySelectorAll(".institution-name").forEach(el => {
        el.textContent = brand.company_name || "ERP System";
    });

    // Login page background
    const loginPage = document.getElementById("loginPage");
    if (loginPage && brand.background_url) {
        loginPage.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${brand.background_url}')`;
        loginPage.style.backgroundSize = "cover";
        loginPage.style.backgroundPosition = "center";
    }

    // App watermark
    const bgEl = document.getElementById("appBgWatermark");
    if (bgEl && brand.bg_url) {
        bgEl.style.backgroundImage = `url('${brand.bg_url}')`;
        bgEl.style.backgroundSize = "contain";
        bgEl.style.backgroundRepeat = "no-repeat";
        bgEl.style.backgroundPosition = "center";
    }

    // Watermark for receipts via CSS variable
    if (brand.logo_url) {
        document.documentElement.style.setProperty('--brand-logo', `url(${brand.logo_url})`);
    }
}

function applyReceiptBranding() {
    const branding = window.db?.branding || {};

    // Safely update company name and tagline
    const companyEl = document.getElementById("receiptCompanyName");
    if (companyEl) companyEl.innerText = branding.company_name || "SmartsourcingKe";

    const taglineEl = document.getElementById("receiptTagline");
    if (taglineEl) taglineEl.innerText = branding.tagline || "";

    // Safely update logo and watermark
    const logo = document.getElementById("receiptLogo");
    const watermark = document.getElementById("watermarkImg");

    if (branding.logo_url) {
        if (logo) logo.src = branding.logo_url;
        if (watermark) watermark.src = branding.logo_url;
    } else {
        // Optional: clear images if logo_url not defined
        if (logo) logo.src = "";
        if (watermark) watermark.src = "";
    }
}

window.updateBranding = updateBranding;