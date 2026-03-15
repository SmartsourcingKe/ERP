/**
 * GENERATE PAYROLL
 * Calculates basic salary + commission based on disbursed orders.
 */
async function generatePayroll() {
    if (!window.db?.users || !window.supa) return;

    const month = new Date().toISOString().slice(0, 7); 
    if (!confirm(`Generate payroll for ${month}?`)) return;

    try {
        // 1. Clear existing for the month
        await supa.from("payroll").delete().eq("payroll_month", month);

        const staffMembers = db.users.filter(u => u.role === "staff");

        for (const staff of staffMembers) {
            const staffOrders = (db.orders || []).filter(o => 
                o.created_by === staff.id && o.status === "disbursed"
            );

            let totalCommission = 0;

            staffOrders.forEach(order => {
                const items = (db.order_items || []).filter(i => i.order_id === order.id);
                items.forEach(item => {
                    const product = (db.products || []).find(p => p.id === item.product_id);
                    if (product) {
                        totalCommission += (Number(product.company_fee) || 0) * item.quantity;
                    }
                });
            });

            const basicSalary = Number(staff.salary) || 0;
            const netPay = basicSalary + totalCommission;

            await supa.from("payroll").insert([{
                user_id: staff.id,
                payroll_month: month,
                basic_salary: basicSalary,
                commission: totalCommission,
                total_pay: netPay,
                status: "paid"
            }]);
        }

        alert("Payroll generated and saved!");
        await sync(); // Refresh UI
    } catch (err) {
        console.error(err);
        alert("Payroll Error: " + err.message);
    }
}

/**
 * RENDER PAYROLL HISTORY
 */
function renderPayroll() {
    const tbody = document.getElementById("payrollBody");
    if (!tbody) return;

    const payroll = window.db.payroll || [];
    const users = window.db.users || [];

    tbody.innerHTML = payroll.map(p => {
        const staff = users.find(u => u.id === p.user_id);
        return `
            <tr>
                <td>${p.payroll_month}</td>
                <td>${staff ? staff.full_name : 'Unknown'}</td>
                <td>${Number(p.basic_salary).toLocaleString()}</td>
                <td>${Number(p.commission).toLocaleString()}</td>
                <td><strong>${Number(p.total_pay).toLocaleString()}</strong></td>
                <td>
                    <button class="btn btn-blue" onclick="viewPayslip('${p.id}')">View Payslip</button>
                </td>
            </tr>
        `;
    }).join("");
}
async function downloadPayslip(staffId, month) {
    const record = db.payroll.find(p => p.staff_id === staffId && p.payroll_month === month);
    const staff = db.users.find(u => u.id === staffId);
    if (!record || !staff) return alert("Record not found");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Design Header
    doc.setFillColor(31, 45, 61);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(db.branding?.company_name || "Company ERP", 20, 25);
    
    doc.setFontSize(10);
    doc.text("OFFICIAL PAYSLIP - " + month, 150, 25);

    // Body
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 60;

    doc.setFont(undefined, "bold");
    doc.text("EMPLOYEE DETAILS", 20, y);
    doc.setFont(undefined, "normal");
    y += 10;
    doc.text(`Name: ${staff.full_name}`, 20, y);
    doc.text(`Staff ID: ${String(staff.id).slice(0,8)}`, 120, y);
    y += 8;
    doc.text(`Role: ${staff.role}`, 20, y);
    y += 20;

    // Financial Table
    doc.line(20, y, 190, y);
    y += 10;
    doc.text("Description", 20, y);
    doc.text("Amount (KES)", 150, y);
    y += 5;
    doc.line(20, y, 190, y);
    
    y += 10;
    doc.text("Basic Salary", 20, y);
    doc.text(Number(record.basic_salary).toLocaleString(), 150, y);
    
    y += 10;
    doc.text("Commission Earned", 20, y);
    doc.text(Number(record.commission).toLocaleString(), 150, y);
    
    y += 15;
    doc.setFont(undefined, "bold");
    doc.text("NET PAYABLE", 20, y);
    doc.text(Number(record.total).toLocaleString(), 150, y);
    
    y += 40;
    doc.setFontSize(8);
    doc.setFont(undefined, "italic");
    doc.text("This is a computer generated document and does not require a signature.", 105, y, {align:"center"});

    doc.save(`Payslip_${staff.full_name}_${month}.pdf`);
}

async function viewPayslip(id) {
    const p = window.db.payroll.find(x => x.id === id);
    const staff = window.db.users.find(u => u.id === p.user_id);
    const branding = window.db.branding || {};

    // Populate the Modal (Reuse the receipt modal ID)
    document.getElementById("receiptCompanyName").innerText = branding.company_name || "SmartsourcingKe";
    document.getElementById("receiptTagline").innerText = "OFFICIAL PAYSLIP";
    document.getElementById("receiptLogo").src = branding.logo_url || "";
    document.getElementById("watermarkImg").src = branding.logo_url || "";

    document.getElementById("receiptMeta").innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <span><strong>Staff:</strong> ${staff.full_name}</span>
            <span><strong>Month:</strong> ${p.payroll_month}</span>
        </div>
    `;

    document.getElementById("receiptItemsBody").innerHTML = `
        <tr><td>Basic Salary</td><td>1</td><td style="text-align:right;">${p.basic_salary.toLocaleString()}</td></tr>
        <tr><td>Commissions</td><td>-</td><td style="text-align:right;">${p.commission.toLocaleString()}</td></tr>
        <tr style="border-top:2px solid #000;">
            <td><strong>NET PAY</strong></td>
            <td></td>
            <td style="text-align:right;"><strong>KES ${p.total_pay.toLocaleString()}</strong></td>
        </tr>
    `;

    document.getElementById("receiptGrandTotal").innerText = ""; 
    document.getElementById("receiptModal").classList.remove("hidden");
}