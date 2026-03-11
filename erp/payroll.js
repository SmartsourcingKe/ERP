async function generatePayroll(){

if(!window.db || !Array.isArray(db.users)) return;
if(!window.supa) return;

const month = new Date().toISOString().slice(0,7);

// delete existing payroll for this month
await supa
.from("payroll")
.delete()
.eq("payroll_month", month);

for(const staff of db.users){

if(staff.role !== "staff") continue;

const staffOrders =
(db.orders || []).filter(o =>
o.created_by === staff.id &&
o.status === "disbursed"
);

let totalFee = 0;

for(const order of staffOrders){

const items =
(db.order_items || []).filter(i=>i.order_id===order.id);

for(const item of items){

const product =
(db.products || []).find(p=>p.id===item.product_id);

if(product){
totalFee +=
(product.company_fee || 0) * item.quantity;
}
}
}

const commission =
(totalFee * Number(staff.commission_rate || 0))/100;

const totalPay =
Number(staff.basic_salary||0) + commission;

await supa.from("payroll").insert([{
staff_id: staff.id,
basic_salary: Number(staff.basic_salary || 0),
commission: commission,
total: totalPay,
payroll_month: month
}]);

}

if(typeof sync === "function"){
await sync();
}

if(typeof renderPayroll === "function"){
renderPayroll();
}

alert("Payroll generated for " + month);
}



function renderPayroll(){

if(!window.db || !Array.isArray(db.payroll)) return;

const payrollBody = document.getElementById("payrollBody");
if(!payrollBody) return;

const month =
new Date().toISOString().slice(0,7);

const monthlyPayroll =
db.payroll.filter(p=>p.payroll_month===month);

payrollBody.innerHTML =
monthlyPayroll.map(p=>{

const staff =
(db.users || []).find(u=>u.id===p.staff_id);

return `
<tr>
<td>${staff ? staff.full_name : "-"}</td>
<td>${p.basic_salary}</td>
<td>${p.commission}</td>
<td>${p.total}</td>
<td>
<button class="btn btn-green"
onclick="downloadPayslip('${p.staff_id}','${p.payroll_month}')">
Payslip
</button>
</td>
</tr>
`;

}).join("");

}



function exportPayrollPDF(){

if(!window.db || !Array.isArray(db.payroll) || db.payroll.length===0)
return alert("No payroll data");

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

doc.text("Payroll Report", 20, 20);

let y = 30;

db.payroll.forEach(p=>{

const staff =
(db.users || []).find(u=>u.id===p.staff_id);

doc.text(
`${staff ? staff.full_name : "-"} | Basic: ${p.basic_salary} | Commission: ${p.commission} | Total: ${p.total}`,
20,
y
);

y += 10;

});

doc.save("payroll.pdf");

}



function downloadPayslip(staffId, month){

if(!window.db) return;

const payroll =
(db.payroll || []).find(p=>
p.staff_id===staffId &&
p.payroll_month===month
);

if(!payroll) return;

const staff =
(db.users || []).find(u=>u.id===staffId);

if(!staff) return;

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

let y = 20;

if(db.branding?.logo_url){
doc.addImage(
db.branding.logo_url,
"JPEG",
80,
10,
50,
20
);
y += 25;
}

doc.setFontSize(16);
doc.text("PAYSLIP", 85, y);
y += 15;

doc.setFontSize(12);

doc.text("Employee Name: " + staff.full_name, 20, y);
y += 8;

doc.text("Role: " + staff.role, 20, y);
y += 8;

doc.text("Payroll Month: " + month, 20, y);
y += 15;

doc.text("Basic Salary: " + payroll.basic_salary, 20, y);
y += 10;

doc.text("Commission: " + payroll.commission, 20, y);
y += 10;

doc.text("------------------------------", 20, y);
y += 10;

doc.setFontSize(14);
doc.text("TOTAL PAY: " + payroll.total, 20, y);

doc.save(
staff.full_name + "_Payslip_" + month + ".pdf"
);

}