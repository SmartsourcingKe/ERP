// Global chart instance
window.monthlyTrendChart = window.monthlyTrendChart || null;
window.profitChart = window.profitChart || null;
window.salesChart = window.salesChart || null;

/**
 * RENDER MONTHLY FINANCE TABLE & CHART
 * Consolidates retail, corporate, and payroll data into a monthly view.
 */
// Update in reports.js
function renderMonthlyFinance() {
	if (window.monthlyTrendChart instanceof Chart) window.monthlyTrendChart.destroy();
    const monthlyData = {};
    const track = (dateStr, manufacturer = 0, fee = 0, corporate = 0, payroll = 0) => {
        const date = new Date(dateStr);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[key]) {
            monthlyData[key] = { manufacturer: 0, fee: 0, corporate: 0, payroll: 0 };
        }
        monthlyData[key].manufacturer += manufacturer;
        monthlyData[key].fee += fee;
        monthlyData[key].corporate += corporate;
        monthlyData[key].payroll += payroll;
    };

    // 1. Process Retail (Fee = Your Profit)
    (db.orders || []).filter(o => o.status === "disbursed").forEach(order => {
        const items = (db.order_items || []).filter(i => i.order_id === order.id);
        items.forEach(item => {
            const product = db.products.find(p => p.id === item.product_id);
            const fee = (product?.company_fee || 0) * item.quantity;
            const manCost = ((product?.price || 0) - (product?.company_fee || 0)) * item.quantity;
            track(order.created_at, manCost, fee, 0, 0);
        });
    });

    // 2. Process Payroll (Subtracting from profit)
    (db.payroll || []).forEach(p => {
        track(p.payroll_month + "-01", 0, 0, 0, Number(p.total_pay));
    });

    renderProfitTable(monthlyData);
    updateProfitChart(monthlyData);
}

/**
 * UPDATE TREND CHART
 */
function updateTrendChart(labels, data) {
    const canvas = document.getElementById("monthlyTrendChart");
    if (!canvas) return;

    if (!monthlyTrendChart) {
        monthlyTrendChart = new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Monthly Net Profit (KES)",
                    data: data,
                    borderColor: "#27ae60",
                    backgroundColor: "rgba(39, 174, 96, 0.1)",
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } else {
        monthlyTrendChart.data.labels = labels;
        monthlyTrendChart.data.datasets[0].data = data;
        monthlyTrendChart.update();
    }
	
	const staffPerformance = db.users.filter(u => u.role === 'staff').map(user => {
    const userOrders = (db.orders || []).filter(o => o.created_by === user.id && o.status === 'disbursed');
    let totalProfitGenerated = 0;
    
    userOrders.forEach(order => {
        const items = (db.order_items || []).filter(i => i.order_id === order.id);
        items.forEach(item => {
            const product = db.products.find(p => p.id === item.product_id);
            totalProfitGenerated += (product?.company_fee || 0) * item.quantity;
        });
    });

    return { name: user.full_name, profit: totalProfitGenerated };
});

}

/**
 * EXPORT PERFORMANCE PDF
 */
function exportPerformancePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18).text("Staff Performance Report", 20, 20);
    doc.setFontSize(10).text("Generated on: " + new Date().toLocaleDateString(), 20, 28);

    let y = 40;
    db.users.forEach(user => {
        const sales = (db.orders || [])
            .filter(o => o.created_by === user.id && o.status === "disbursed")
            .reduce((sum, o) => sum + Number(o.total || 0), 0);

        doc.text(`${user.full_name} (${user.role})`, 20, y);
        doc.text(`Total Sales: KES ${sales.toLocaleString()}`, 150, y, { align: "right" });
        doc.line(20, y + 2, 190, y + 2);
        y += 12;

        if (y > 270) { doc.addPage(); y = 20; }
    });

// Inside exportPerformancePDF loop:
const sales = (db.orders || [])
    .filter(o => o.created_by === user.id && o.status === "disbursed")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

// Use a conditional to highlight top performers in the PDF
if (sales > 100000) {
    doc.setTextColor(39, 174, 96); // Green for high performers
} else {
    doc.setTextColor(0, 0, 0); // Black for others
}

    doc.save("Staff_Performance.pdf");
}