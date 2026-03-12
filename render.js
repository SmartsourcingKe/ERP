// Keep chart instances in the global scope to allow updates
window.monthlyTrendChart = window.monthlyTrendChart || null;
window.profitChart = window.profitChart || null;
window.salesChart = window.salesChart || null;

/**
 * MASTER RENDER DISPATCHER
 */
function renderAll() {
    try {
        // Core UI components
        if (typeof renderDashboard === "function") renderDashboard();
        if (typeof renderBranding === "function") renderBranding();
        
        // Data Tables
        if (typeof renderProducts === "function") renderProducts();
        if (typeof renderRetailers === "function") renderRetailers();
        if (typeof renderOrders === "function") renderOrders();
        if (typeof renderCorporate === "function") renderCorporate();
        if (typeof renderEmployees === "function") renderEmployees();
        if (typeof renderPayroll === "function") renderPayroll();
        
        // Insights & Communication
        if (typeof renderMessages === "function") renderMessages();
        if (typeof renderProfitDashboard === "function") renderProfitDashboard();

        console.log("ERP rendered successfully");
    } catch (err) {
        console.error("Render failure:", err);
    }
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

    // Safety: If window.profitChart exists but isn't a real Chart object yet, or is missing datasets
    if (window.profitChart && window.profitChart.data && window.profitChart.data.datasets) {
        window.profitChart.data.labels = labels;
        window.profitChart.data.datasets[0].data = data;
        window.profitChart.update();
    } else {
        // Destroy existing instance if it's corrupted to start fresh
        if (window.profitChart && typeof window.profitChart.destroy === 'function') {
            window.profitChart.destroy();
        }
        
        window.profitChart = new Chart(canvas, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Revenue (KES)",
                    data: data,
                    backgroundColor: "#3498db"
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

/**
 * CHART HELPER: Staff Sales Bar
 */
function renderStaffSalesChart() {
    const ctx = document.getElementById("salesChart");
    if (!ctx) return;

    let staffSales = {};
    (db.orders || []).filter(o => o.status === "disbursed").forEach(o => {
        const staffName = db.users?.find(u => u.id === o.created_by)?.full_name || "Unknown";
        staffSales[staffName] = (staffSales[staffName] || 0) + Number(o.total);
    });

    const labels = Object.keys(staffSales);
    const data = Object.values(staffSales);

    if (!salesChart) {
        salesChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{ label: "Sales by Staff (KES)", data, backgroundColor: "#3498db" }]
            },
            options: { responsive: true }
        });
    } else {
        salesChart.data.labels = labels;
        salesChart.data.datasets[0].data = data;
        salesChart.update();
    }
}