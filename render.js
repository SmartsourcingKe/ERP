/**
 * MASTER RENDERER
 * This function triggers all sub-renderers. 
 * It is called after every database sync.
 */
function renderAll() {
    console.log("Master Render started...");
    try {
        if (typeof renderPermissions === "function") renderPermissions();
        if (typeof renderOrders === "function") renderOrders();
        if (typeof renderProducts === "function") renderProducts();
        
        // FIX: Match the actual functions in corporateOrders.js
        if (typeof renderSchools === "function") renderSchools();
        if (typeof renderCorpHistory === "function") renderCorporateHistory();

        if (typeof renderEmployees === "function") renderEmployees();
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
function renderCorporateOrders() {
    const tbody = document.getElementById("CorporateOrdersBody");
    tbody.innerHTML = window.db.corporate_orders.map(order => {
        const isPending = order.status === 'pending';
        
        return `
            <tr>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${order.schools?.name || 'N/A'}</td>
                <td>KES ${order.total.toLocaleString()}</td>
                <td>
                    <span class="badge ${isPending ? 'btn-red' : 'btn-green'}">
                        ${order.status.toUpperCase()}
                    </span>
                </td>
                <td>
                    ${isPending ? 
                        `<button class="btn btn-blue" onclick="disburseOrder('${order.id}', 'corporate_orders')">Disburse</button>` : 
                        `<button class="btn btn-green" onclick="printReceipt('${order.id}', 'corporate')">Print Receipt</button>`
                    }
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * RENDER PRODUCT DROPDOWNS
 * Used in the "Create Order" section.
 */
function renderProductDropdowns() {
    // 1. Identify all dropdowns that need product data
    const selects = ["orderProductSelect", "corpProductSelect"]; 
    
    // 2. Use window.products (from your sync function) as the source
    // If window.db.products is your primary store, keep it, but ensure it's fresh.
    const products = window.products || window.db?.products || [];

    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        // 3. Clear and Rebuild
        // We filter for p.stock > 0 so staff don't try to sell what you don't have
        const options = products
            .filter(p => p.stock > 0) 
            .map(p => `<option value="${p.id}">${p.name} - Sh${p.base_price} (Stock: ${p.stock})</option>`)
            .join("");

        el.innerHTML = '<option value="">-- Select Product --</option>' + options;
    });
    
    console.log("Order dropdowns refreshed with latest stock.");
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
    const container = document.getElementById("inventoryList");
    if (!container) return; 

    const products = window.db.products || [];
    let html = "";

    products.forEach(product => {
        // MUST USE BACKTICKS `
        html += `
            <div class="card" style="border:1px solid #ddd; padding:15px; margin-bottom:10px;">
                <h4>${product.name}</h4>
                <div style="margin-top:10px;">
                    <label>Base Price:</label>
                    <input type="number" id="price-${product.id}" value="${product.base_price || 0}">
                    
                    <label>Fee:</label>
                    <input type="number" id="fee-${product.id}" value="${product.company_fee || 0}">
                    
                    <label>Stock:</label>
                    <input type="number" id="stock-${product.id}" value="${product.stock || 0}">
                </div>
                <button class="btn btn-blue" onclick="editProduct('${product.id}')">Update</button>
            </div>`;
    });
    container.innerHTML = html;
}

async function saveProductUpdate(productId) {
    const newPrice = document.getElementById(`price-${productId}`).value;
    const newFee = document.getElementById(`fee-${productId}`).value;
    const newStock = document.getElementById(`stock-${productId}`).value;

    try {
        const { error } = await supa
            .from('products')
            .update({ 
                productBasePrice: parseFloat(newPrice),
                productCompanyFee: parseFloat(newFee),
                productStock: parseInt(newStock)
            })
            .eq('id', productId);

        if (error) throw error;

        alert("Product updated successfully!");
        
        // Refresh the database and UI
        if (typeof sync === 'function') {
            await sync(); 
        } else {
            location.reload(); // Fallback if sync isn't global
        }
        
    } catch (err) {
        console.error("Update error:", err);
        alert("Failed to update: " + err.message);
    }
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

function renderOrders() {
    const tbody = document.getElementById("ordersTableBody");
    if (!tbody) return;

    const orders = window.db.orders || [];
    
    tbody.innerHTML = orders.map(order => {
        // Fix: Ensure we pull from the correct retailers list
        const retailer = (window.db.retailers || []).find(r => r.id === order.retailer_id);
        const status = order.status || 'pending';
        
        return `
            <tr>
                <td>${order.id.slice(0, 8).toUpperCase()}</td> 
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${retailer ? retailer.name : 'Unknown Retailer'}</td>
                <td>KES ${Number(order.total).toLocaleString()}</td>
                <td><span class="badge ${status}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-blue" onclick="viewReceipt('${order.id}')">Receipt</button>
                    ${status === 'pending' ? 
                        `<button class="btn btn-green" onclick="updateOrderStatus('${order.id}', 'disbursed')">Disburse</button>` : 
                        `<span style="color:green; font-weight:bold;">✓ SHIPPED</span>`
                    }
                </td>
            </tr>`;
    }).join("");
}

async function renderCorporateReceipt(orderId) {
    const { data: order } = await supa.from('corporate_orders').select('*, schools(*)').eq('id', orderId).single();
    const { data: items } = await supa.from('corporate_order_items').select('*').eq('order_id', orderId);

    const itemsBody = document.getElementById("receiptItemsBody");
    let calculatedTotal = 0;

    itemsBody.innerHTML = items.map(item => {
        const itemTotal = item.subtotal || (item.student_count * item.price_per_student);
        calculatedTotal += itemTotal; // Sum the items correctly
        
        return `
            <tr>
                <td>${item.grade} (${item.student_count} Students)</td>
                <td style="text-align:center;">1</td>
                <td style="text-align:right;">KES ${itemTotal.toLocaleString()}</td>
            </tr>
        `;
    }).join("");

    // Use the sum of items for the display to ensure accuracy
    document.getElementById("receiptGrandTotal").textContent = `TOTAL: KES ${calculatedTotal.toLocaleString()}`;
}