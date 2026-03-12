// Global chart instance
let monthlyTrendChart = null;

/**
 * RENDER MONTHLY FINANCE TABLE & CHART
 * Consolidates retail, corporate, and payroll data into a monthly view.
 */
function renderMonthlyFinance() {
    if (!window.db) return;

    const monthlyData = {};

    // Helper to initialize and add values to monthly object
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

    // 1. Process Retail Orders
    (db.orders || []).filter(o => o.status === "disbursed").forEach(order => {
        const items = (db.order_items || []).filter(i => i.order_id === order.id);
        let orderMan = 0, orderFee = 0;

        items.forEach(item => {
            const prod = (db.products || []).find(p => p.id === item.product_id);
            if (prod) {
                // Calculation: Price = Mfg Base + Company Fee
                orderMan += (Number(prod.price) - Number(prod.company_fee)) * item.quantity;
                orderFee += Number(prod.company_fee) * item.quantity;
            }
        });
        track(order.created_at, orderMan, orderFee, 0, 0);
    });

    // 2. Process Corporate Orders
    (db.corporate_orders || []).filter(c => c.status === "disbursed").forEach(corp => {
        track(corp.created_at, 0, 0, Number(corp.total || 0), 0);
    });

    // 3. Process Payroll (Expenses)
    (db.payroll || []).forEach(p => {
        track(p.payroll_month + "-01", 0, 0, 0, Number(p.total || 0));
    });

    // Generate HTML Table
    let tableHtml = `
        <table class="card">
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Mfg Costs</th>
                    <th>Co. Profit</th>
                    <th>Corporate</th>
                    <th>Payroll</th>
                    <th>Net Gain</th>
                </tr>
            </thead>
            <tbody>`;

    const labels = [], netGains = [];
    Object.keys(monthlyData).sort().forEach(month => {
        const m = monthlyData[month];
        const netGain = (m.fee + m.corporate) - m.payroll;

        labels.push(month);
        netGains.push(netGain);

        tableHtml += `
            <tr>
                <td>${month}</td>
                <td>${m.manufacturer.toLocaleString()}</td>
                <td>${m.fee.toLocaleString()}</td>
                <td>${m.corporate.toLocaleString()}</td>
                <td style="color:var(--red)">(${m.payroll.toLocaleString()})</td>
                <td style="font-weight:bold; color:${netGain >= 0 ? 'var(--green)' : 'var(--red)'}">
                    ${netGain.toLocaleString()}
                </td>
            </tr>`;
    });

    tableHtml += "</tbody></table>";
    const container = document.getElementById("monthlyFinance");
    if (container) container.innerHTML = tableHtml;

    // 4. Render/Update Chart
    updateTrendChart(labels, netGains);
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

    doc.save("Staff_Performance.pdf");
}