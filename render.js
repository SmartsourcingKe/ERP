// Keep chart instances in the global scope to allow updates
window.myProfitChart = null;
window.myStaffChart = null;

/**
 * MASTER RENDER DISPATCHER
 */
function renderAll() {
    console.log("Master Render started...");
    
    // 1. Dashboard Stats
    renderDashboard();

    // 2. Inventory Table
    renderProducts();

    // 3. Dropdowns
    renderProductDropdowns();
    renderRetailerDropdown();

    // 4. Modules
    if (typeof renderOrders === "function") renderOrders();
    if (typeof renderBranding === "function") renderBranding();
    
    // 5. Analytics
    renderProfitDashboard();
    
    console.log("Master Render complete.");
}

/**
 * DASHBOARD STAT CARDS
 */
function renderDashboard() {
    const container = document.getElementById("dashboardStats");
    if (!container || !window.db) return;

    const orders = window.db.orders?.length || 0;
    const products = window.db.products?.length || 0;
    const retailers = window.db.retailers?.length || 0;
    const corporate = window.db.corporate_orders?.length || 0;

    container.innerHTML = `
        <div class="stat-card"><h3>${orders}</h3><p>Retail Orders</p></div>
        <div class="stat-card"><h3>${products}</h3><p>Products</p></div>
        <div class="stat-card"><h3>${retailers}</h3><p>Retailers</p></div>
        <div class="stat-card"><h3>${corporate}</h3><p>Corporate Jobs</p></div>
    `;
}

/**
 * INVENTORY TABLE
 * Fixed the backtick syntax error here
 */
function renderProducts() {
    const tableBody = document.getElementById("productBody");
    if (!tableBody) return;
    
    const products = window.db.products || [];

    tableBody.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td> 
            <td>${p.stock}</td>
            <td>KES ${p.price}</td> 
            <td><button onclick="deleteProduct('${p.id}')" class="btn btn-danger">Delete</button></td> 
        </tr>
    `).join("");
}

/**
 * PROFIT & ANALYTICS
 */
function renderProfitDashboard() {
    const profitSummary = document.getElementById("profitSummary");
    if (!profitSummary || !window.db) return;

    let manufacturerTotal = 0;
    let companyFeeTotal = 0;
    let corporateTotal = 0;

    // Logic for Retail Splits
    (window.db.orders || []).filter(o => o.status === "disbursed").forEach(order => {
        const items = (window.db.order_items || []).filter(i => i.order_id === order.id);
        items.forEach(item => {
            const prod = (window.db.products || []).find(p => p.id === item.product_id);
            if (prod) {
                manufacturerTotal += (Number(prod.price) - Number(prod.company_fee)) * item.quantity;
                companyFeeTotal += Number(prod.company_fee) * item.quantity;
            }
        });
    });

    (window.db.corporate_orders || []).filter(c => c.status === "disbursed").forEach(corp => {
        corporateTotal += Number(corp.total || 0);
    });

    profitSummary.innerHTML = `
        <div class="card">
            <p>Retail Profit: <strong>KES ${companyFeeTotal.toLocaleString()}</strong></p>
            <p>Corporate Revenue: <strong>KES ${corporateTotal.toLocaleString()}</strong></p>
            <hr>
            <h3 style="color:green">Net Company Profit: KES ${(companyFeeTotal + corporateTotal).toLocaleString()}</h3>
        </div>
    `;

    // Update Charts
    renderProfitChart(["Manufacturer", "Company Fee", "Corporate"], [manufacturerTotal, companyFeeTotal, corporateTotal]);
}

/**
 * CHART HELPERS (Standardized)
 */
function renderProfitChart(labels, data) {
    const canvas = document.getElementById("profitChart");
    if (!canvas) return;

    if (window.myProfitChart) window.myProfitChart.destroy();

    window.myProfitChart = new Chart(canvas, {
        type: "pie", // Switched to pie for better profit visualization
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ["#e74c3c", "#2ecc71", "#3498db"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderProductDropdowns() {
    const retailSelect = document.getElementById("orderProductSelect");
    if (!retailSelect) return;
    
    const products = window.db.products || [];
    let options = '<option value="">-- Select Product --</option>';
    products.forEach(p => {
        options += `<option value="${p.id}" data-price="${p.price}">${p.name} (Stock: ${p.stock})</option>`;
    });
    retailSelect.innerHTML = options;
}

function renderRetailerDropdown() {
    const select = document.getElementById("retailerSelect");
    if (!select) return;
    
    const retailers = window.db.retailers || [];
    let options = '<option value="">-- Select Retailer --</option>';
    retailers.forEach(r => {
        options += `<option value="${r.id}">${r.name}</option>`;
    });
    select.innerHTML = options;
}