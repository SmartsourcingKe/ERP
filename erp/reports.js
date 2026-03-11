function exportPerformancePDF(){

if(!window.db || !Array.isArray(db.users)) return;

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

doc.text("Employee Sales Performance", 20, 20);

let y = 30;

db.users.forEach(user=>{

const sales = (db.orders || [])
.filter(o=>o.created_by===user.id)
.reduce((sum,o)=>sum+Number(o.total||0),0);

doc.text(
`${user.full_name} - Sales: ${sales}`,
20,
y
);

y += 10;

});

doc.save("performance.pdf");

}



function renderMonthlyFinance(){

if(!window.db) return;

let monthly = {};

function addToMonth(date, manufacturer, fee, corporate){

const d = new Date(date);
const month = String(d.getMonth()+1).padStart(2,"0");
const key = d.getFullYear() + "-" + month;

if(!monthly[key]){
monthly[key] = {
manufacturer:0,
fee:0,
corporate:0,
payroll:0
};
}

monthly[key].manufacturer += manufacturer;
monthly[key].fee += fee;
monthly[key].corporate += corporate;

}


for(const order of (db.orders || [])){

if(order.status !== "disbursed") continue;

const items =
(db.order_items || []).filter(i=>i.order_id===order.id);

let man = 0;
let fee = 0;

for(const item of items){

const product =
(db.products || []).find(p=>p.id===item.product_id);

if(product){
man += (product.base_price||0) * item.quantity;
fee += (product.company_fee||0) * item.quantity;
}

}

addToMonth(order.created_at, man, fee, 0);

}



for(const corp of (db.corporate_orders || [])){

if(corp.status === "disbursed"){

addToMonth(
corp.created_at,
0,
0,
Number(corp.total||0)
);

}

}



for(const p of (db.payroll || [])){

const d = new Date(p.payroll_month);
const month = String(d.getMonth()+1).padStart(2,"0");
const key = d.getFullYear() + "-" + month;

if(!monthly[key]){

monthly[key] = {
manufacturer:0,
fee:0,
corporate:0,
payroll:0
};

}

monthly[key].payroll += Number(p.total||0);

}



let html = `
<table border="1" width="100%" cellpadding="5">
<tr>
<th>Month</th>
<th>Manufacturer</th>
<th>Company Profit</th>
<th>Corporate</th>
<th>Total Revenue</th>
<th>Payroll</th>
<th>Net Profit</th>
</tr>
`;

const labels = [];
const netData = [];

Object.keys(monthly)
.sort()
.forEach(key => {

const m = monthly[key];

const revenue =
m.manufacturer +
m.fee +
m.corporate;

const net = revenue - m.payroll;

labels.push(key);
netData.push(net);

html += `
<tr>
<td>${key}</td>
<td>${m.manufacturer}</td>
<td>${m.fee}</td>
<td>${m.corporate}</td>
<td>${revenue}</td>
<td>${m.payroll}</td>
<td>${net}</td>
</tr>
`;

});

html += "</table>";

const container =
document.getElementById("monthlyFinance");

if(container){
container.innerHTML = html;
}



const canvas =
document.getElementById("monthlyTrendChart");

if(canvas){

if(!monthlyTrendChart){

monthlyTrendChart = new Chart(canvas,{
type:"line",
data:{
labels:labels,
datasets:[{
label:"Net Profit",
data:netData,
fill:false
}]
}
});

}else{

monthlyTrendChart.data.labels = labels;
monthlyTrendChart.data.datasets[0].data = netData;
monthlyTrendChart.update();

}

}

}



function exportPDF(){

if(!window.db) return;

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

doc.text("ERP Report",20,20);

let y = 40;

(db.orders || []).forEach(o=>{

doc.text(
`Order ${o.id} - ${o.total}`,
20,
y
);

y+=10;

});

doc.save("report.pdf");

}

function exportPDF(title,data){

const { jsPDF } = window.jspdf

const doc = new jsPDF()

doc.text(title,20,20)

let y = 40

data.forEach(row=>{
doc.text(JSON.stringify(row),20,y)
y += 10
})

doc.save(title+".pdf")

}