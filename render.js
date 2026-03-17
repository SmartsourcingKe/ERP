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

    const searchTerm = document.getElementById("retailerSearch")?.value.toLowerCase() || "";
    const retailers = (window.db.retailers || []).filter(r => 
        r.name.toLowerCase().includes(searchTerm) || 
        r.phone.includes(searchTerm)
    );

    if (retailers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No retailers found.</td></tr>';
        return;
    }

    tbody.innerHTML = retailers.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.phone}</td>
            <td>${r.location}</td>
            <td>
                <button class="btn btn-blue" onclick="selectRetailerForOrder('${r.id}')">New Order</button>
            </td>
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

function renderProducts() {
    const grid = document.getElementById("inventoryGrid");
    if (!grid) return;

    const products = window.db.products || [];
    
    if (products.length === 0) {
        grid.innerHTML = "<p>No products in inventory.</p>";
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-info">
                <h4>${p.name}</h4>
                <p class="price">Price: KES ${p.base_price.toLocaleString()}</p>
                <p class="stock ${p.stock <= 5 ? 'text-red' : ''}">
                    Stock: ${p.stock}
                </p>
                <p class="sku">Profit/Fee: KES ${p.company_fee}</p>
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct('${p.id}')">Edit</button>
            </div>
        </div>
    `).join("");
}

function renderEmployees() {
    const tbody = document.getElementById("employeeTableBody");
    if (!tbody) return;

    const staff = window.db.users || [];
    
    tbody.innerHTML = staff.map(user => `
        <tr>
            <td><img src="${user.photo_url || 'default-avatar.png'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;"></td>
            <td>${user.full_name}</td>
            <td><span class="badge ${user.role === 'admin' ? 'disbursed' : 'pending'}">${user.role}</span></td>
            <td>Active</td>
            <td>
                <button class="btn btn-blue" onclick="previewIDCard('${user.id}')">View ID</button>
                <button class="btn btn-red" onclick="editStaff('${user.id}')">Edit</button>
            </td>
        </tr>
    `).join("");
}

function previewIDCard(userId) {
    const user = window.db.users.find(u => u.id === userId);
    const branding = window.db.branding || {};

    // Map data to the ID Template
    document.getElementById("idHeaderName").innerText = branding.company_name || "COMPANY ERP";
    document.getElementById("idLogo").src = branding.logo_url || "";
    document.getElementById("idWatermark").src = branding.bg_url || ""; // Watermark image
    
    document.getElementById("idStaffPhoto").src = user.photo_url || "default-avatar.png";
    document.getElementById("idStaffName").innerText = user.full_name;
    document.getElementById("idStaffRole").innerText = user.role;
    document.getElementById("idStaffEmail").innerText = user.email;

    // Show the modal
    document.getElementById("idCardModal").classList.remove("hidden");
}

function renderReceipt(orderId) {
    const order = window.db.orders.find(o => o.id === orderId);
    const items = window.db.order_items.filter(oi => oi.order_id === orderId);
    const tbody = document.getElementById("receiptItemsBody");
    tbody.innerHTML = "";

    items.forEach(item => {
        // Retrieve the product to get the fee breakdown
        const product = window.db.products.find(p => p.id === item.product_id);
        const fee = parseFloat(product?.productCompanyFee || 0);
        const unitPriceAtSale = parseFloat(item.price_at_sale || 0);
        const basePrice = unitPriceAtSale - fee;
        const itemSubtotal = unitPriceAtSale * item.quantity;

        const row = `
            <tr>
                <td style="padding: 5px 0;">${item.product_name}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:center;">${basePrice.toLocaleString()}</td>
                <td style="text-align:center;">${fee.toLocaleString()}</td>
                <td style="text-align:right;">${itemSubtotal.toLocaleString()}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    document.getElementById("receiptGrandTotal").innerText = `TOTAL KES: ${order.total.toLocaleString()}`;
}