window.monthlyTrendChart = window.monthlyTrendChart || null;
window.profitBreakdownChart = window.profitBreakdownChart || null;
window.salesChart = window.salesChart || null;
/**
 * MAIN RENDER FUNCTION
 */
function renderMonthlyFinance() {
    console.log("Calculating profits...");
    const monthlyData = {};

    const track = (dateStr, fee = 0, corporate = 0, payroll = 0) => {
        const date = new Date(dateStr);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[key]) {
            monthlyData[key] = { fee: 0, corporate: 0, payroll: 0 };
        }
        monthlyData[key].fee += fee;
        monthlyData[key].corporate += corporate;
        monthlyData[key].payroll += payroll;
    };

    // 1. Calculate Retail Profit (Your Fee from Products)
    (window.db.orders || []).filter(o => o.status === "disbursed").forEach(order => {
        const items = (window.db.order_items || []).filter(i => i.order_id === order.id);
        items.forEach(item => {
            const product = window.db.products.find(p => p.id === item.product_id);
            // We use 'company_fee' as the profit per item
            const profitPerItem = (product?.company_fee || 0) * item.quantity;
            track(order.created_at, profitPerItem, 0, 0);
        });
    });

    // 2. Calculate Corporate Revenue
    (window.db.corporate_orders || []).forEach(co => {
        track(co.created_at, 0, Number(co.total || 0), 0);
    });

    // 3. Subtract Payroll Expenses
    (window.db.payroll || []).forEach(p => {
        // Payroll records usually have a month string "YYYY-MM"
        track(p.payroll_month + "-01", 0, 0, Number(p.total_pay || 0));
    });

    // Sort months for the UI
    const sortedMonths = Object.keys(monthlyData).sort();

    renderProfitTable(sortedMonths, monthlyData);
    updateCharts(sortedMonths, monthlyData);
}

/**
 * RENDER THE FINANCE TABLE
 */
function renderProfitTable(months, data) {
    const tbody = document.getElementById("profitTableBody");
    if (!tbody) return;

    tbody.innerHTML = months.reverse().map(m => {
        const row = data[m];
        const netProfit = (row.fee + row.corporate) - row.payroll;
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:12px; font-weight:bold;">${m}</td>
                <td style="padding:12px;">KES ${row.fee.toLocaleString()}</td>
                <td style="padding:12px;">KES ${row.corporate.toLocaleString()}</td>
                <td style="padding:12px; color: #e74c3c;">- KES ${row.payroll.toLocaleString()}</td>
                <td style="padding:12px; font-weight:bold; color: ${netProfit >= 0 ? '#27ae60' : '#e74c3c'};">
                    KES ${netProfit.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * UPDATE ALL CHARTS
 */
function updateCharts(months, data) {
    const trendLabels = months;
    const trendValues = months.map(m => (data[m].fee + data[m].corporate) - data[m].payroll);

    // 1. Trend Line Chart
    const ctxTrend = document.getElementById("monthlyTrendChart");
    if (ctxTrend) {
        if (window.monthlyTrendChart) window.monthlyTrendChart.destroy();
        window.monthlyTrendChart = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Net Profit (KES)',
                    data: trendValues,
                    borderColor: '#27ae60',
                    fill: false,
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Breakdown Bar Chart (Latest Month)
    const latestMonth = months[months.length - 1];
    const ctxBreakdown = document.getElementById("profitBreakdownChart");
    if (ctxBreakdown && latestMonth) {
        if (window.profitBreakdownChart) window.profitBreakdownChart.destroy();
        window.profitBreakdownChart = new Chart(ctxBreakdown, {
            type: 'bar',
            data: {
                labels: ['Retail Profit', 'Corporate Revenue', 'Payroll Costs'],
                datasets: [{
                    label: `Financials for ${latestMonth}`,
                    data: [data[latestMonth].fee, data[latestMonth].corporate, data[latestMonth].payroll],
                    backgroundColor: ['#3498db', '#9b59b6', '#e74c3c']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
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

function printReceipt() {
    const receiptContent = document.getElementById('receiptContainer').innerHTML;
    const originalContent = document.body.innerHTML;

    // Temporarily replace body with only receipt content
    document.body.innerHTML = receiptContent;
    window.print();
    
    // Restore original app content
    document.body.innerHTML = originalContent;
    window.location.reload(); // Re-binds JS events
}