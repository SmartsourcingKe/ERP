// Keep chart instances in the global scope to allow updates
window.monthlyTrendChart = window.monthlyTrendChart || null;
window.profitChart = window.profitChart || null;
window.salesChart = window.salesChart || null;

/**
 * MASTER RENDER DISPATCHER
 */
function renderAll() {
    console.log("Master Render started...");
    
    // 1. Branding (Logo/Background)
    if (typeof renderBranding === "function") renderBranding();

    // 2. Inventory Table
    if (typeof renderProducts === "function") renderProducts();

    // 3. Dropdowns (The Order Form)
    if (typeof renderProductDropdowns === "function") renderProductDropdowns();

    // 4. Other Modules
    if (typeof renderRetailers === "function") renderRetailers();
    if (typeof renderOrders === "function") renderOrders();
    
    console.log("Master Render complete.");
}

/**
 * DASHBOARD STAT CARDS
 */
function renderDashboard() {
    const container = document.getElementById("dashboardStats");
    if (!container || !db) return;

    const orders = db.orders?.length || 0;
    const products = db.products?.length || 0;
    const retailers = db.retailers?.length || 0;
    const corporate = db.corporate_orders?.length || 0;

    container.innerHTML = `
        <div class="stat-card"><h3>${orders}</h3><p>Retail Orders</p></div>
        <div class="stat-card"><h3>${products}</h3><p>Products</p></div>
        <div class="stat-card"><h3>${retailers}</h3><p>Retailers</p></div>
        <div class="stat-card"><h3>${corporate}</h3><p>Corporate Jobs</p></div>
    `;
}

/**
 * PROFIT & ANALYTICS DASHBOARD
 * Calculates Manufacturer vs Company splits and visualizes staff performance.
 */
function renderProfitDashboard() {
    const profitSummary = document.getElementById("profitSummary");
    if (!profitSummary) return;

    let manufacturerTotal = 0;
    let companyFeeTotal = 0;
    let corporateTotal = 0;

    // 1. Calculate Retail Profit Splits
    (db.orders || []).filter(o => o.status === "disbursed").forEach(order => {
        const items = (db.order_items || []).filter(i => i.order_id === order.id);
        items.forEach(item => {
            const prod = (db.products || []).find(p => p.id === item.product_id);
            if (prod) {
                // Assuming base_price is what goes to manufacturer
                manufacturerTotal += (Number(prod.price) - Number(prod.company_fee)) * item.quantity;
                companyFeeTotal += Number(prod.company_fee) * item.quantity;
            }
        });
    });

    // 2. Calculate Corporate Revenue
    (db.corporate_orders || []).filter(c => c.status === "disbursed").forEach(corp => {
        corporateTotal += Number(corp.total || 0);
    });

    const totalProfit = companyFeeTotal + corporateTotal;

    profitSummary.innerHTML = `
        <div class="card">
            <p>Retail Profit: <strong>KES ${companyFeeTotal.toLocaleString()}</strong></p>
            <p>Corporate Revenue: <strong>KES ${corporateTotal.toLocaleString()}</strong></p>
            <hr>
            <h3 style="color:var(--green)">Net Company Profit: KES ${totalProfit.toLocaleString()}</h3>
        </div>
    `;

    // 3. Update Pie Chart (Profit Split)
    renderProfitChart(manufacturerTotal, companyFeeTotal, corporateTotal);

    // 4. Update Bar Chart (Staff Performance)
    renderStaffSalesChart();
}

/**
 * CHART HELPER: Profit Pie
 */
function renderProfitChart(labels, data) {
    const canvas = document.getElementById("profitChart");
    if (!canvas) return;

    // 1. If a chart instance exists, destroy it completely before making a new one
    if (window.myProfitChart instanceof Chart) {
        window.myProfitChart.destroy();
    }

    // 2. Safety check for data: Chart.js needs arrays
    const safeLabels = Array.isArray(labels) ? labels : [];
    const safeData = Array.isArray(data) ? data : [];

    try {
        // 3. Create the new chart and store it in a specific global variable
        window.myProfitChart = new Chart(canvas, {
            type: "bar",
            data: {
                labels: safeLabels,
                datasets: [{
                    label: "Revenue (KES)",
                    data: safeData,
                    backgroundColor: "#3498db"
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false 
            }
        });
    } catch (err) {
        console.error("Chart Creation Error:", err);
    }
}

/**
 * CHART HELPER: Staff Sales Bar
 */
function renderStaffSalesChart(labels, data) {
    const canvas = document.getElementById("staffSalesChart");
    if (!canvas) return; // Stop if the HTML element isn't there

    // If an old chart exists, kill it completely
    if (window.myStaffChart instanceof Chart) {
        window.myStaffChart.destroy();
    }

    // Safety: ensure labels and data are arrays
    const finalLabels = Array.isArray(labels) ? labels : [];
    const finalData = Array.isArray(data) ? data : [];

    try {
        // Create a FRESH chart every time
        window.myStaffChart = new Chart(canvas, {
            type: "pie",
            data: {
                labels: finalLabels,
                datasets: [{
                    data: finalData,
                    backgroundColor: ["#3498db", "#2ecc71", "#e74c3c", "#f1c40f", "#9b59b6"]
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false 
            }
        });
    } catch (err) {
        console.error("Staff Chart Crash prevented:", err);
    }
}

function populateProductDropdown() {
    const select = document.getElementById("orderProductSelect");
    if (!select) return;

    // Use the global db object, default to empty array if sync hasn't finished
    const products = db.products || [];

    select.innerHTML = '<option value="">-- Select Product --</option>' + 
        products.map(p => `
            <option value="${p.id}" data-price="${p.price}">
                ${p.name} (Stock: ${p.stock}) - KES ${p.price}
            </option>
        `).join("");
}


function renderProductDropdowns() {
const retailSelect = document.getElementById("orderProductSelect");
const products = db.products || [];
if (retailSelect) {
let options = '-- Select Product --';
products.forEach(p => {
options += '' + p.name + ' (Stock: ' + p.stock + ')';
});
retailSelect.innerHTML = options;
}
}

function renderProducts() {
	
const tableBody = document.getElementById("productBody");

if (!tableBody) return;
const products = db.products || [];

tableBody.innerHTML = products.map(p =>

<tr>
 <td>${p.name}</td> 
<td>${p.stock}</td>
 <td>KES ${p.price}</td> 
 <td><button onclick="deleteProduct('${p.id}')" class="btn btn-red">Delete</button></td> 
 </tr>
 
).join("");

}

function renderRetailerDropdown() {
const select = document.getElementById("retailerSelect");
const retailers = db.retailers || [];
if (!select) return;
let options = '-- Select Retailer --';
retailers.forEach(r => {
options += '' + r.name + '';
});
select.innerHTML = options;
}