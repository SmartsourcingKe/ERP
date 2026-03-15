/**
 * MASTER RENDERER
 * This function triggers all sub-renderers. 
 * It is called after every database sync.
 */
function renderAll() {
    console.log("Master Render started...");
    try {
        // Use this pattern for every single render call
        if (typeof renderPermissions === "function") renderPermissions();
        if (typeof renderOrders === "function") renderOrders();
        if (typeof renderRetailers === "function") renderRetailers();
        if (typeof renderProducts === "function") renderProducts();
        if (typeof renderCorporate === "function") renderCorporate();
        if (typeof renderEmployees === "function") renderEmployees();
        if (typeof renderPayroll === "function") renderPayroll();
        if (typeof renderMessages === "function") renderMessages();
        if (typeof renderAdmin === "function") renderAdmin(); 
        
        // Dropdowns
        if (typeof renderProductDropdowns === "function") renderProductDropdowns();
        if (typeof renderRetailerDropdown === "function") renderRetailerDropdown();
        if (typeof renderSchoolDropdown === "function") renderSchoolDropdown(); // Added check
        
        console.log("Master Render complete.");
    } catch (err) {
        console.error("Render Error:", err);
    }
}

/**
 * RENDER PERMISSIONS
 * Shows or hides admin-only buttons based on the user's role.
 */
 
function renderPermissions() {
    // 1. Get the profile from your database table using the logged-in ID
    const userProfile = (window.db.users || []).find(u => u.auth_user_id === window.currentUser?.id);
    
    // Fallback: If profile isn't synced yet, use the current user object
    const user = userProfile || window.currentUser;
    
    if (!user) return;

    // YOUR ORIGINAL LIST - I haven't changed a thing here
    const adminElements = [
        'performanceBtn', 
        'payrollBtn', 
        'adminBtn', 
        'profitBtn'
    ];

    adminElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Check the role from the database profile
            if (user.role === 'admin') {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    const welcome = document.getElementById("welcome");
    if (welcome) {
        welcome.textContent = `Welcome, ${user.full_name || user.email || 'User'}`;
    }
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

/**
 * RENDER ADMIN TOOLS
 */
function renderAdmin() {
    const tbody = document.getElementById("adminUserTableBody");
    if (!tbody) return;

    const users = window.db.users || [];
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.email}</td>
            <td><span class="badge">${user.role}</span></td>
            <td>
                <button class="btn btn-blue" onclick="editUserRole('${user.id}')">Edit Role</button>
            </td>
        </tr>
    `).join("");
}
