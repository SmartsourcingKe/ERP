/**
 * GENERATE PAYROLL
 * Calculates basic salary + commission based on disbursed orders for the current month.
 */
async function generatePayroll() {
    if (!window.db?.users || !window.supa) return;

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (!confirm(`Generate payroll for ${month}? Existing data for this month will be overwritten.`)) return;

    try {
        // 1. Clear existing payroll for this month to avoid duplicates
        await supa.from("payroll").delete().eq("payroll_month", month);

        const staffMembers = db.users.filter(u => u.role === "staff");

        for (const staff of staffMembers) {
            // Find all disbursed orders created by this staff member
            const staffOrders = (db.orders || []).filter(o => 
                o.created_by === staff.id && o.status === "disbursed"
            );

            let totalCompanyFeeEarned = 0;

            // Calculate fee earned from each item in those orders
            staffOrders.forEach(order => {
                const items = (db.order_items || []).filter(i => i.order_id === order.id);
                items.forEach(item => {
                    const product = (db.products || []).find(p => p.id === item.product_id);
                    if (product) {
                        totalCompanyFeeEarned += (Number(product.company_fee) || 0) * (item.quantity || 0);
                    }
                });
            });

            const commission = (totalCompanyFeeEarned * (Number(staff.commission_rate) || 0)) / 100;
            const basic = Number(staff.basic_salary) || 0;
            const totalPay = basic + commission;

            // 2. Insert into database
            await supa.from("payroll").insert([{
                staff_id: staff.id,
                basic_salary: basic,
                commission: commission,
                total: totalPay,
                payroll_month: month
            }]);
        }

        await sync();
        alert(`Payroll successfully generated for ${month}`);

    } catch (err) {
        console.error("Payroll generation failed:", err);
        alert("Error generating payroll: " + err.message);
    }
}

/**
 * RENDER PAYROLL TABLE
 */
function renderPayroll() {
    const tableBody = document.getElementById("payrollBody");
    if (!tableBody || !db.payroll) return;

    const currentMonth = new Date().toISOString().slice(0, 7);

    tableBody.innerHTML = db.payroll
        .filter(p => p.payroll_month === currentMonth)
        .map(p => {
            const staff = db.users.find(u => u.id === p.staff_id);
            return `
                <tr>
                    <td>${staff ? staff.full_name : "Unknown Staff"}</td>
                    <td>${Number(p.basic_salary).toLocaleString()}</td>
                    <td>${Number(p.commission).toLocaleString()}</td>
                    <td style="font-weight:bold">${Number(p.total).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-blue" onclick="downloadPayslip('${p.staff_id}','${p.payroll_month}')">
                            Payslip
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
}

/**
 * DOWNLOAD INDIVIDUAL PAYSLIP (PDF)
 */
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