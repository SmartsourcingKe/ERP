function renderAll(){

  try{

    if(typeof renderDashboard === "function")
      renderDashboard()

    if(typeof renderRetailers === "function")
      renderRetailers()

    if(typeof renderProducts === "function")
      renderProducts()

    if(typeof renderOrders === "function")
      renderOrders()

    if(typeof renderCorporate === "function")
      renderCorporate()

    if(typeof renderEmployees === "function")
      renderEmployees()

    if(typeof renderPayroll === "function")
      renderPayroll()

    if(typeof renderMessages === "function")
      renderMessages()

    if(typeof renderReports === "function")
      renderReports()

    if(typeof renderProfitDashboard === "function")
      renderProfitDashboard()

    if(typeof renderBranding === "function")
      renderBranding()

    console.log("ERP rendered successfully")

  }
  catch(err){
    console.error("Render failure:", err)
  }

}

function renderDashboard(){

  const container = document.getElementById("dashboardStats")
  if(!container) return

  const orders = db.orders?.length || 0
  const products = db.products?.length || 0
  const retailers = db.retailers?.length || 0

  container.innerHTML = `
  <div class="card">
  <h3>Dashboard</h3>

  <p>Total Orders: ${orders}</p>
  <p>Total Products: ${products}</p>
  <p>Total Retailers: ${retailers}</p>

  </div>
  `

}

function renderProfitDashboard(){

let manufacturerTotal = 0;
let feeTotal = 0;


for(const order of db.orders || []){

if(order.status !== "disbursed") continue;

const items =
db.order_items.filter(i=>i.order_id===order.id);

for(const item of items){

const product =
db.products.find(p=>p.id===item.product_id);

if(product){
manufacturerTotal +=
(product.base_price || 0) * item.quantity;

feeTotal +=
(product.company_fee || 0) * item.quantity;
}
}
}


let corporateTotal = 0;

for(const corp of db.corporate_orders){
if(corp.status === "disbursed"){
corporateTotal += Number(corp.total || 0);
}
}

const companyProfit =
feeTotal + corporateTotal;

profitSummary.innerHTML = `
<p><strong>Company Profit From Retail Orders:</strong> ${feeTotal}</p>
<p><strong>Corporate Revenue:</strong> ${corporateTotal}</p>
<hr>
<p><strong>Total Company Profit:</strong> ${companyProfit}</p>
`;


if(!profitChart){
const ctx = document.getElementById("profitChart");
profitChart = new Chart(ctx,{
type:"pie",
data:{
labels:[
"Manufacturer",
"Company Profit",
"Corporate"
],
datasets:[{
data:[
manufacturerTotal,
feeTotal,
corporateTotal
]
}]
}
});
}
else{
profitChart.data.datasets[0].data = [
manufacturerTotal,
feeTotal,
corporateTotal
];
profitChart.update();
}

if(!salesChart){
const ctx = document.getElementById("salesChart");
salesChart = new Chart(ctx,{
type:"bar",
data:{
labels:[],
datasets:[{
label:"Sales",
data:[]
}]
}
});
}

let staffSales = {};

db.orders.forEach(o=>{
if(o.status !== "disbursed") return;

if(!staffSales[o.created_by])
staffSales[o.created_by] = 0;

staffSales[o.created_by] += Number(o.total);
});

salesChart.data.labels =
Object.keys(staffSales).map(id=>{
const user = db.users.find(u=>u.id===id);
return user ? user.full_name : "Unknown";
});

salesChart.data.datasets[0].data =
Object.values(staffSales);

salesChart.update();
}


