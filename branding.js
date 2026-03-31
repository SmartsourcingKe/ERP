/**
 * UPDATE BRANDING
 * Saves company name, tagline, logo, and background to Supabase.
 */
async function updateBranding() {
  if (!window.currentUser || window.currentUser.role !== "admin") {
    return alert("Access Denied: Admin only");
  }

  // Matches IDs in index.html line 435-436
  const name = document.getElementById("brandCompanyName")?.value;
  const tagline = document.getElementById("brandTagline")?.value;

  let logo_url = window.db?.branding?.logo_url || null;
  let background_url = window.db?.branding?.background_url || null;

  // Matches IDs in index.html line 439 & 443
  const logoFile = document.getElementById("brandLogoFile")?.files[0];
  const bgFile = document.getElementById("brandBgFile")?.files[0];

  if (logoFile) {
    const path = `branding/logo_${Date.now()}`;
    const { data: upData, error: upErr } = await supa.storage.from("assets").upload(path, logoFile);
    if (!upErr) {
        const { data } = supa.storage.from("assets").getPublicUrl(path);
        logo_url = data.publicUrl;
    }
  }

  if (bgFile) {
    const path = `branding/bg_${Date.now()}`;
    const { data: upData, error: upErr } = await supa.storage.from("assets").upload(path, bgFile);
    if (!upErr) {
        const { data } = supa.storage.from("assets").getPublicUrl(path);
        background_url = data.publicUrl;
    }
  }

  // ✅ Use id: 1 to ensure only one row exists
  const { error } = await supa.from("branding").upsert({
    id: 1, 
    company_name: name,
    tagline: tagline,
    logo_url: logo_url,
    background_url: background_url
  });

  if (error) {
      console.error(error);
      return alert("Save Failed: " + error.message);
  }

  alert("Branding updated successfully!");
  location.reload(); // Refresh to apply all changes
}

function renderBranding() {
    const brand = window.db?.branding;
    if (!brand) return;

    // 1. Update all Text Elements (Added loginTitle)
    const nameElements = ["companyName", "loginCompanyName", "receiptCompanyName", "idHeaderName", "loginTitle"];
    const taglineElements = ["companyTagline", "loginTagline", "receiptTagline"];

    nameElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = brand.company_name || "SmartsourcingKe";
    });

    taglineElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = brand.tagline || "";
    });

    // 2. Update Logos & Watermarks
    const logos = ["companyLogo", "loginLogo", "receiptLogo", "idLogo", "watermarkImg", "idWatermark"];
    logos.forEach(id => {
        const el = document.getElementById(id);
        if (el && brand.logo_url) {
            el.src = brand.logo_url;
            el.classList.remove("hidden");
        }
    });

    // 3. Background styling
    if (brand.background_url) {
        document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.9), rgba(244, 246, 249, 0.9)), url('${brand.background_url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
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