 const DEBUG = false;
 if (DEBUG) console.log("render.js loaded");
 
window.renderAll = function () {
    console.log("Master Render started...");

    // 1. DATA CHECK
    if (!window.db) {
        console.warn("⚠️ Data not ready, skipping render");
        return;
    }

    // 2. APPLY GLOBAL BRANDING
    // Use 'b' as the shorthand for branding data
    const b = window.db.branding || {};
    const logo = document.getElementById("companyLogo");
    const name = document.getElementById("companyName");
    const tagline = document.getElementById("companyTagline");

    // Handle Logo
    if (logo) {
        if (b.logo_url) {
            logo.src = b.logo_url;
            logo.classList.remove("hidden");
        } else {
            logo.classList.add("hidden");
        }
    }

    // Handle Background (Using the correct key from your DB)
    const backgroundUrl = b.background_url || b.bg_url; 
    if (backgroundUrl) {
        document.body.style.backgroundImage = `url('${backgroundUrl}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundPosition = "center";
    }

    // 3. DEFINE AND RUN TASKS
    const tasks = [
        { name: 'Employees', func: typeof renderEmployees === 'function' ? renderEmployees : null },
        { name: 'Products', func: typeof renderProducts === 'function' ? renderProducts : null },
        { name: 'Product Dropdowns', func: typeof renderProductDropdowns === 'function' ? renderProductDropdowns : null },
        { name: 'Retailer Dropdowns', func: typeof renderRetailerDropdown === 'function' ? renderRetailerDropdown : null },
        { name: 'Retailers', func: typeof renderRetailers === 'function' ? renderRetailers : null },
        { name: 'Orders', func: typeof renderOrders === 'function' ? renderOrders : null },
        { name: 'Corp History', func: typeof renderCorporateHistory === 'function' ? renderCorporateHistory : null },
        { name: 'Schools', func: typeof renderSchools === 'function' ? renderSchools : null },
        { name: 'Payroll', func: typeof renderPayroll === 'function' ? renderPayroll : null },
        { name: 'Profit', func: typeof renderProfit === 'function' ? renderProfit : null },
        { name: 'Messages', func: typeof renderMessages === 'function' ? renderMessages : null }
    ];

    tasks.forEach(task => {
        if (!task.func) {
            console.warn(`⚠️ Missing render function: ${task.name}`);
            return;
        }
        try {
            task.func();
        } catch (e) {
            console.error(`❌ Render failed: ${task.name}`, e);
        }
    });

    // 4. APPLY PERMISSIONS
    if (typeof renderPermissions === 'function') {
        renderPermissions();
    }
    
    console.log("Render cycle complete.");
};

/**
 * RENDER PERMISSIONS
 * Shows or hides admin tabs based on the logged-in user's role.
 */
function renderPermissions() {
    const role = window.currentUser?.role;
    console.log("Applying permissions for role:", role);

    const adminBtn = document.getElementById("adminBtn");
    const payrollBtn = document.getElementById("payrollBtn");
    const profitBtn = document.getElementById("profitBtn");

    if (role === 'admin') {
        if (adminBtn) adminBtn.classList.remove("hidden");
        if (payrollBtn) payrollBtn.classList.remove("hidden");
        if (profitBtn) profitBtn.classList.remove("hidden");
    } else {
        if (adminBtn) adminBtn.classList.add("hidden");
        if (payrollBtn) payrollBtn.classList.add("hidden");
        if (profitBtn) profitBtn.classList.add("hidden");
    }
}

/**
 * RENDER EMPLOYEES
 * Fills the admin table with staff data from window.db.users.
 */
function renderEmployees() {
    const tbody = document.getElementById("employeeTableBody");
    if (!tbody) return;

    const staff = (window.db.users || []).filter(u => u.role === 'staff' || u.role === 'admin');
    
    if (staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No staff found.</td></tr>';
        return;
    }

    tbody.innerHTML = staff.map(user => `
        <tr>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.email}</td>
            <td><span class="badge" style="background:${user.role === 'admin' ? '#e74c3c' : '#3498db'}">
                ${user.role.toUpperCase()}
            </span></td>
            <td>${user.phone || '-'}</td>
			<td>
    <button class="btn btn-blue" onclick="editStaff('${user.id}')">Edit</button>
    <button class="btn btn-green" onclick="previewIDCard('${user.id}')">Print ID</button>
</td>
        </tr>
    `).join("");
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
        (r.phone || '').includes(searchTerm)
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
/* ---- render.js Updates ---- */

// 1. Correct the ID for Corporate Orders
function renderCorporateOrders() {
    const tbody = document.getElementById("corpOrdersBody"); // Must match index.html
    if (!tbody) return;

    const orders = window.db.corporate_orders || [];
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>${order.schools?.name || 'N/A'}</td>
            <td>KES ${order.total.toLocaleString()}</td>
            <td><span class="badge">${order.status.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-blue" onclick="viewReceipt('${order.id}', 'corporate')">Receipt</button>
            </td>
        </tr>
    `).join("");
}

// 2. Add the Print Function
async function viewCorporateReceipt(orderId) {
    const modal = document.getElementById("receiptModal");
    if (!modal) return;
    
    // Show modal
    modal.classList.remove("hidden");
    
    // Populate modal data
    await renderCorporateReceipt(orderId); // This is the function already in your render.js
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
    const products = window.db?.products || [];

    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        // 3. Clear and Rebuild
        // We filter for p.stock > 0 so staff don't try to sell what you don't have
        const options = products
            .filter(p => true) 
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
    // MATCHING YOUR HTML: change 'inventoryList' to 'productList'
    const container = document.getElementById("productList"); 
    if (!container) return; 

    const products = window.db.products || [];
    let html = "";

    products.forEach(product => {
        html += `
            <div class="card" style="border:1px solid #ddd; padding:15px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0;">${product.name}</h4>
                    <button onclick="deleteProduct('${product.id}')" style="color:red; border:none; background:none; cursor:pointer;">🗑️</button>
                </div>
                
                <div style="display: grid; gap: 5px; margin-top: 10px;">
                    <label>Base Price (KES):</label>
                    <input type="number" id="price-${product.id}" value="${product.base_price || 0}">
                    
                    <label>Company Fee (KES):</label>
                    <input type="number" id="fee-${product.id}" value="${product.company_fee || 0}">
                    
                    <label>Stock Count:</label>
                    <input type="number" id="stock-${product.id}" value="${product.stock || 0}">
                </div>

                <button class="btn btn-blue" style="width:100%; margin-top:10px;" 
                        onclick="editProduct('${product.id}')">Update Product</button>
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
    base_price: parseFloat(newPrice) || 0,
    company_fee: parseFloat(newFee) || 0,
    stock: parseInt(newStock) || 0
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
    const order = window.db.orders.find(o => String(o.id) === String(orderId));
    const items = (window.db.order_items || []).filter(oi => String(oi.order_id) === String(orderId));
    const branding = window.db.branding || { company_name: "SmartsourcingKe" };

    if (!order) return "Order not found";

    return `
    <div id="printableReceipt" class="receipt-font">
        <div class="receipt-header" style="text-align:center;">
            <h2 class="company-name">${(branding.company_name || "ERP").toUpperCase()}</h2>
            <hr style="border-top: 1px dashed #000;">
        </div>
        
        <table class="receipt-table" style="width:100%; font-size:10px;">
            <thead>
                <tr>
                    <th align="left">ITEM</th>
                    <th align="center">QTY</th>
                    <th align="right">PRICE</th>
                    <th align="right">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
                    // Use your specific column: price_at_sale
                    const qty = Number(item.quantity ?? 0);
                    const price = Number(item.price_at_sale ?? 0);
                    const rowTotal = qty * price;

                    return `
                    <tr>
                        <td>${item.product_name || 'Product'}</td>
                        <td align="center">${qty}</td>
                        <td align="right">${price.toLocaleString()}</td>
                        <td align="right"><strong>${rowTotal.toLocaleString()}</strong></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>

        <div class="receipt-footer" style="margin-top:10px;">
            <hr style="border-top: 1px dashed #000;">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>GRAND TOTAL:</span>
                <span>KES ${(Number(order.total_amount ?? 0)).toLocaleString()}</span>
            </div>
        </div>
    </div>`;
}

function renderOrders() {
    const tbody = document.getElementById("ordersBody");
    if (!tbody) return;

    const orders = (window.db.orders || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    tbody.innerHTML = orders.map(order => {
        const retailer = window.db.retailers?.find(r => r.id === order.retailer_id);
        const date = new Date(order.created_at).toLocaleDateString();

        const items = window.db.order_items?.filter(i => i.order_id === order.id) || [];

        const productList = items.map(i => {
            const product = window.db.products?.find(p => p.id === i.product_id);
            return product 
                ? `${product.name} (${i.product_id.slice(0,6)})`
                : `Unknown (${i.product_id})`;
        }).join(", ");

        return `
        <tr>
            <td>${date}</td>
            <td>${retailer ? retailer.name : 'Unknown'}</td>
            <td>${productList || '-'}</td>
            <td>KES ${Number(order.total || 0).toLocaleString()}</td>
            <td><span class="badge">${(order.status || 'pending').toUpperCase()}</span></td>
            <td>
                <button class="btn btn-blue" onclick="viewReceipt('${order.id}', 'retailer')">Receipt</button>
                ${order.status !== 'paid' ? 
                    `<button class="btn btn-green" onclick="markAsPaid('${order.id}')">Disburse</button>` 
                    : ''}
            </td>
        </tr>`;
    }).join("");
}

async function renderCorporateReceipt(orderId) {
    const order = window.db.corporate_orders?.find(o => o.id === orderId);
    if (!order) return;

    const school = window.db.schools?.find(s => s.id === order.school_id);
    
    // Set Meta Data (Order Number and Date)
    const meta = document.getElementById("receiptMeta");
    if (meta) {
        meta.innerHTML = `
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:5px;">
                <span><strong>Order No:</strong> #${order.id.slice(0, 8)}</span>
                <span><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div style="margin-top:5px;">
                <strong>School:</strong> ${school ? school.name : 'N/A'}
            </div>
        `;
    }

    // Fetch Items from corporate_order_items
    const { data: items } = await supa.from('corporate_order_items').select('*').eq('corporate_order_id', orderId);
    const itemsBody = document.getElementById("receiptItemsBody");
    
    if (items && itemsBody) {
        itemsBody.innerHTML = items.map(item => `
            <tr>
                <td>${item.grade} (${item.student_count} Students)</td>
                <td style="text-align:center;">1</td>
                <td style="text-align:right;">KES ${Number(item.subtotal).toLocaleString()}</td>
            </tr>
        `).join("");
    }

    document.getElementById("receiptGrandTotal").textContent = `TOTAL: KES ${Number(order.total).toLocaleString()}`;
}

function renderMessages() {
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    // Table name is usually 'messages' or 'team_messages'
    const msgs = window.db.messages || []; 
    
    container.innerHTML = msgs.map(m => `
        <div style="margin-bottom:10px; padding:8px; background:#f9f9f9; border-radius:5px;">
            <strong>${m.sender_name || 'System'}:</strong> ${m.content}
            <div style="font-size:0.7em; color:#999;">${new Date(m.created_at).toLocaleTimeString()}</div>
        </div>
    `).join("");
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}


function viewReceipt(id, type = 'retailer') {
    const modal = document.getElementById("receiptModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.style.display = 'block';

    // Apply Branding (Logo, Name, Watermark) immediately
    applyReceiptBranding();

    // Now populate the specific data
    if (type === 'corporate') {
        renderCorporateReceipt(id);
    } else if (type === 'payroll') {
        if (typeof viewPayrollReceipt === 'function') viewPayrollReceipt(id);
    } else {
        renderReceipt(id);
    }
}

function closeReceiptModal() {
    document.getElementById("receiptModal").classList.add("hidden");
    document.getElementById("receiptModal").style.display = "none";
}

function renderProfit() {
    const container = document.getElementById("profitReport");
    if (!container) return;

    const retailTotal = (window.db.orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);
    const corpTotal = (window.db.corporate_orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="card"><h4>Retail</h4><h2>KES ${retailTotal.toLocaleString()}</h2></div>
            <div class="card"><h4>Corporate</h4><h2>KES ${corpTotal.toLocaleString()}</h2></div>
            <div class="card" style="grid-column: span 2; background:#1f2d3d; color:white;">
                <h4>Total Revenue</h4><h1>KES ${(retailTotal + corpTotal).toLocaleString()}</h1>
            </div>
        </div>`;
}

function renderPayroll() {
    const tbody = document.getElementById("payrollBody");
    if (!tbody) return;
    
    tbody.innerHTML = (window.db.payroll || []).map(p => `
        <tr>
            <td>${p.payroll_month}</td>
            <td>KES ${Number(p.total_pay).toLocaleString()}</td>
            <td>${p.status}</td>
            <td><button class="btn btn-green" onclick="viewReceipt('${p.id}', 'payroll')">Slip</button></td>
        </tr>`).join("");
}

function applyReceiptBranding() {
    const branding = window.db?.branding || {};
    
    // Update IDs that exist in your index.html modal
    const nameEl = document.getElementById("receiptCompanyName");
    const tagEl = document.getElementById("receiptTagline");
    const logoImg = document.getElementById("receiptLogo");
    const watermark = document.getElementById("watermarkImg");

    if (nameEl) nameEl.innerText = branding.company_name || "SmartsourcingKe";
    if (tagEl) tagEl.innerText = branding.tagline || "";

    if (branding.logo_url) {
        if (logoImg) {
            logoImg.src = branding.logo_url;
            logoImg.style.display = 'block';
        }
        if (watermark) {
            watermark.src = branding.logo_url;
            watermark.style.opacity = "0.1"; // Ensure it stays as a faint watermark
        }
    }
}

function generateReceiptHTML(orderId) {
    // 1. Double check the data source
    if (!window.db || !window.db.orders) {
        console.error("Database not initialized");
        return "Error: System not ready";
    }

    const order = window.db.orders.find(o => String(o.id) === String(orderId));
    const items = (window.db.order_items || []).filter(oi => String(oi.order_id) === String(orderId));

    if (!order) {
        console.error("Order ID not found in window.db.orders:", orderId);
        return "Order Not Found";
    }

    return `
    <div id="receiptContainer">
        <div style="text-align:center; margin-bottom:10px;">
            <h2 style="margin:0;">${(window.db.branding?.company_name || "SmartsourcingKe").toUpperCase()}</h2>
            <div style="border-top:1px dashed #000; margin:5px 0;"></div>
        </div>

        <table class="receipt-table">
            <thead>
                <tr>
                    <th align="left">ITEM</th>
                    <th align="center">QTY</th>
                    <th align="right">PRICE</th>
                    <th align="right">FEE</th>
                    <th align="right">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.product_name || 'Item'}</td>
                        <td align="center">${item.quantity || 0}</td>
                        <td align="right">${(item.unit_price || item.price || 0).toLocaleString()}</td>
                        <td align="right">${(item.fee || 0).toLocaleString()}</td>
                        <td align="right"><strong>${(item.total_price || 0).toLocaleString()}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="border-top:1px dashed #000; margin:10px 0;"></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>TOTAL:</span>
            <span>KES ${(order.total_amount || 0).toLocaleString()}</span>
        </div>
    </div>`;
}