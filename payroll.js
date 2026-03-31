/**
 * GENERATE PAYROLL
 */
async function generatePayroll() {
    if (!window.db?.users || !window.db?.orders || !window.supa) {
        return alert("Data not fully loaded. Please wait for sync.");
    }

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (!confirm(`Generate payroll for ${month}? This will overwrite existing drafts.`)) return;

    try {
        // 1. Clear existing draft payroll for this month
        await supa.from("payroll").delete().eq("payroll_month", month).eq("status", "draft");

        const staffMembers = window.db.users.filter(u => u.role === "staff");
        const allOrders = window.db.orders || [];
        const allItems = window.db.order_items || [];
        const allProducts = window.db.products || [];

        for (const staff of staffMembers) {
            // Filter: Only disbursed orders by this staff this month
            const staffOrders = allOrders.filter(o => {
                const orderMonth = new Date(o.created_at).toISOString().slice(0, 7);
                return o.created_by === staff.id && o.status === "disbursed" && orderMonth === month;
            });

            let totalCommission = 0;
            staffOrders.forEach(order => {
                const items = allItems.filter(i => i.order_id === order.id);
                items.forEach(item => {
                    const product = allProducts.find(p => p.id === item.product_id);
                    if (product) {
                        const feePerUnit = Number(product.company_fee) || 0;
                        totalCommission += (feePerUnit * Number(item.quantity));
                    }
                });
            });

            const basicSalary = Number(staff.salary) || 0;
            const netPay = basicSalary + totalCommission;

            // 2. Insert into Supabase
            const { error: insertErr } = await supa.from("payroll").insert([{
                user_id: staff.id,
                payroll_month: month,
                basic_salary: basicSalary,
                commission: totalCommission,
                total_pay: netPay,
                status: 'draft'
            }]);
            if (insertErr) throw insertErr;
        }

        alert(`Payroll generated for ${staffMembers.length} staff!`);
        await sync(); 
        renderPayrollTable();

    } catch (err) {
        console.error("Payroll Error:", err);
        alert("Failure: " + err.message);
    }
}

/**
 * RENDER PAYROLL TABLE
 */
function renderPayrollTable() {
    const tbody = document.getElementById("payrollBody");
    if (!tbody) return;

    const payrollData = window.db.payroll || [];
    const users = window.db.users || [];

    if (payrollData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No payroll records found.</td></tr>';
        return;
    }

    tbody.innerHTML = payrollData.map(p => {
        const staff = users.find(u => u.id === p.user_id) || { full_name: "Unknown" };
        return `
            <tr>
                <td>${p.payroll_month}</td>
                <td>${staff.full_name}</td>
                <td>${p.basic_salary.toLocaleString()}</td>
                <td>${p.commission.toLocaleString()}</td>
                <td><strong>${p.total_pay.toLocaleString()}</strong></td>
                <td><span class="badge ${p.status === 'paid' ? 'bg-green' : 'bg-orange'}">${p.status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-blue" onclick="viewPayslip('${p.id}')">View Payslip</button>
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * VIEW PAYSLIP (Modal)
 */
function viewPayslip(id) {
    const p = window.db.payroll.find(x => x.id === id);
    const staff = window.db.users.find(u => u.id === p.user_id);
    const branding = window.db.branding || {};

    if (!p || !staff) return alert("Record not found");

    // We reuse your Receipt Modal for the Payslip
    document.getElementById("receiptCompanyName").innerText = branding.company_name || "SmartsourcingKe";
    document.getElementById("receiptTagline").innerText = "OFFICIAL PAYSLIP";
    
    // Safety check for logo
    const logoImg = document.getElementById("receiptLogo");
    if (logoImg) logoImg.src = branding.logo_url || "";

    document.getElementById("receiptMeta").innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <span><strong>Staff:</strong> ${staff.full_name}</span>
            <span><strong>Month:</strong> ${p.payroll_month}</span>
        </div>
    `;

    document.getElementById("receiptItemsBody").innerHTML = `
        <tr><td>Basic Salary</td><td>-</td><td style="text-align:right;">${p.basic_salary.toLocaleString()}</td></tr>
        <tr><td>Commissions</td><td>-</td><td style="text-align:right;">${p.commission.toLocaleString()}</td></tr>
        <tr style="border-top:2px solid #000;">
            <td><strong>TOTAL PAYABLE</strong></td>
            <td></td>
            <td style="text-align:right;"><strong>KES ${p.total_pay.toLocaleString()}</strong></td>
        </tr>
    `;

    document.getElementById("receiptGrandTotal").innerText = ""; 
    document.getElementById("receiptModal").classList.remove("hidden");
    document.getElementById("receiptModal").style.display = 'block';
}

// Map the master render function to this script
window.renderPayroll = renderPayrollTable;