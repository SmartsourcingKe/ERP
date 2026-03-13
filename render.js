/**
 * MASTER RENDERER
 * This function triggers all sub-renderers. 
 * It is called after every database sync.
 */
function renderAll() {
    console.log("render.js:9 Master Render started...");

    try {
        // 1. UI Permissions (Show/Hide tabs based on Role)
        renderPermissions();

        // 2. Tab-Specific Data Tables
        renderOrders();
        renderRetailers();
        renderProducts();
        renderCorporate();
        renderEmployees();
        renderPayroll();
        renderMessages();

        // 3. Dropdowns (for forms)
        renderProductDropdowns();
        renderRetailerDropdown();
        renderSchoolDropdown();

        console.log("render.js:28 Master Render complete.");
    } catch (err) {
        console.error("Master Render Failed:", err);
    }
}

/**
 * RENDER PERMISSIONS
 * Shows or hides admin-only buttons based on the user's role.
 */
function renderPermissions() {
    const user = window.currentUser;
    if (!user) return;

    // Elements that only admins should see
    const adminElements = [
        'performanceBtn', 
        'payrollBtn', 
        'adminBtn', 
        'profitBtn'
    ];

    adminElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (user.role === 'admin') {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    const welcome = document.getElementById("welcome");
    if (welcome) welcome.textContent = `Welcome, ${user.full_name || 'User'}`;
}

/**
 * RENDER RETAILERS
 */
function renderRetailers() {
    const tbody = document.getElementById("retailerBody");
    if (!tbody) return;

    const data = window.db.retailers || [];
    const search = document.getElementById("retailerSearch")?.value.toLowerCase() || "";

    const filtered = data.filter(r => 
        (r.name?.toLowerCase().includes(search)) || 
        (r.phone?.includes(search)) ||
        (r.location?.toLowerCase().includes(search))
    );

    tbody.innerHTML = filtered.map(r => `
        <tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.phone}</td>
            <td>${r.location}</td>
        </tr>
    `).join("");
}

/**
 * RENDER CORPORATE (CBC)
 */
function renderCorporate() {
    const tbody = document.getElementById("corporateBody");
    if (!tbody) return;

    const data = window.db.corporate_orders || [];
    const search = document.getElementById("schoolSearch")?.value.toLowerCase() || "";

    const filtered = data.filter(o => {
        const school = (window.db.schools || []).find(s => s.id === o.school_id);
        return school?.name.toLowerCase().includes(search);
    });

    tbody.innerHTML = filtered.map(o => {
        const school = (window.db.schools || []).find(s => s.id === o.school_id);
        return `
            <tr>
                <td>${school?.name || 'Unknown'}</td>
                <td><span class="status-${o.status}">${o.status}</span></td>
                <td>KES ${Number(o.total_amount).toLocaleString()}</td>
                <td><button class="btn btn-blue" onclick="printCorpReceipt('${o.id}')">Receipt</button></td>
            </tr>
        `;
    }).join("");
}

/**
 * RENDER PRODUCT DROPDOWNS
 * Used in the "Create Order" section.
 */
function renderProductDropdowns() {
    const selects = ["orderProductSelect"]; // Add other product select IDs here
    const products = window.db.products || [];

    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        el.innerHTML = '<option value="">Select Product</option>' + 
            products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`).join("");
    });
}

/**
 * RENDER RETAILER DROPDOWN
 */
function renderRetailerDropdown() {
    const el = document.getElementById("retailerSelect");
    if (!el) return;

    const retailers = window.db.retailers || [];
    el.innerHTML = '<option value="">Select Retailer</option>' + 
        retailers.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
}

/**
 * RENDER SCHOOL DROPDOWN
 */
function renderSchoolDropdown() {
    const el = document.getElementById("corpSchoolSelect");
    if (!el) return;

    const schools = window.db.schools || [];
    el.innerHTML = '<option value="">Select School</option>' + 
        schools.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}