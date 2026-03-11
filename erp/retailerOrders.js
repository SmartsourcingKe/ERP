function addToCart(){

const productId = productSelect.value;
const qty = Number(orderQty.value);

if(!productId) return alert("Select product");
if(!qty || qty <= 0) return alert("Enter valid quantity");

const product = (db.products || []).find(p=>p.id===productId);
if(!product) return;

const existing = cart.find(c=>c.product_id===productId);
const currentQty = existing ? existing.qty : 0;

if((product.stock || 0) < (qty + currentQty))
return alert("Insufficient stock");

if(existing){
existing.qty += qty;
}
else{
cart.push({
product_id: product.id,
name: product.product_name,
price: product.base_price,
fee: product.company_fee,
selling_price: product.selling_price,
qty: qty
});
}

orderQty.value="";
renderCart();
}



function renderCart(){

if(!cartView) return;

if(cart.length===0){
cartView.innerHTML = "<p>Cart empty</p>";
return;
}

cartView.innerHTML = `
<table>
<tr>
<th>Product</th>
<th>Qty</th>
<th>Price</th>
<th>Total</th>
<th></th>
</tr>
${cart.map((c,i)=>`
<tr>
<td>${c.name}</td>
<td>${c.qty}</td>
<td>${c.selling_price}</td>
<td>${c.qty * c.selling_price}</td>
<td>
<button onclick="removeCartItem(${i})">X</button>
</td>
</tr>
`).join("")}
</table>
`;
}



function removeCartItem(index){
cart.splice(index,1);
renderCart();
}



async function createOrder(){

if(!currentUser) return alert("Session invalid");
if(!retailerSelect?.value) return alert("Select retailer");
if(cart.length===0) return alert("Cart empty");

const retailerId = retailerSelect.value;

let total = cart.reduce((sum,c)=>sum + (c.qty * c.selling_price),0);

const { data: orderData, error: orderError } =
await supa.from("orders").insert([{
retailer_id: retailerId,
total: total,
created_by: currentUser.id,
status: "pending"
}]).select().single();

if(orderError){
alert(orderError.message);
return;
}

for(const item of cart){

await supa.from("order_items").insert([{
order_id: orderData.id,
product_id: item.product_id,
quantity: item.qty,
price: item.selling_price
}]);

const product =
(db.products || []).find(p=>p.id===item.product_id);

if(product){
await supa.from("products")
.update({ stock: (product.stock || 0) - item.qty })
.eq("id", item.product_id);
}

}

cart=[];
renderCart();

await sync();

}



function renderOrders(){

if(!ordersBody) return;

const search =
(document.getElementById("orderSearch")?.value || "")
.toLowerCase();

ordersBody.innerHTML =
(db.orders || [])
.filter(o =>
o.id.toLowerCase().includes(search) ||
(o.status||"").toLowerCase().includes(search)
)
.map(o=>{

const retailer =
(db.retailers || []).find(r=>r.id===o.retailer_id);

const items =
(db.order_items || []).filter(i=>i.order_id===o.id);

const productList = items.map(i=>{
const product =
(db.products || []).find(p=>p.id===i.product_id);
return `${product?.product_name} (x${i.quantity})`;
}).join(", ");

let actionButtons = "";

if(o.status === "pending"){

actionButtons = `
<button class="btn btn-blue"
onclick="editOrder('${o.id}')">
Edit
</button>

<button class="btn btn-green"
onclick="disburseOrder('${o.id}')">
Disburse
</button>

<button class="btn btn-red"
onclick="cancelOrder('${o.id}')">
Cancel
</button>
`;

}

else if(o.status === "disbursed"){

actionButtons = `
<button class="btn btn-blue"
onclick="printRetailReceipt('${o.id}')">
Print Receipt
</button>
`;

}

else{
actionButtons = "<span style='color:red'>Cancelled</span>";
}

return `
<tr>
<td>${o.id.slice(0,8)}</td>
<td>${retailer ? retailer.name : "-"}</td>
<td>
${o.total}
<br>
<small>${productList}</small>
</td>
<td>${o.status}</td>
<td>${new Date(o.created_at).toLocaleDateString()}</td>
<td>${actionButtons}</td>
</tr>
`;

}).join("");

}



async function disburseOrder(orderId){

if(!confirm("Disburse this order?")) return;

const { error } =
await supa.from("orders")
.update({ status: "disbursed" })
.eq("id", orderId);

if(error){
alert(error.message);
return;
}

await sync();

}



async function cancelOrder(orderId){

if(!confirm("Cancel this order?")) return;

const order =
(db.orders || []).find(o=>o.id===orderId);
if(!order) return;

if(order.status === "disbursed"){

const items =
(db.order_items || []).filter(i=>i.order_id===orderId);

for(const item of items){

const product =
(db.products || []).find(p=>p.id===item.product_id);

if(product){

await supa.from("products")
.update({ stock: (product.stock||0) + item.quantity })
.eq("id", product.id);

}

}

}

await supa.from("orders")
.update({ status: "cancelled" })
.eq("id", orderId);

await sync();

}



async function printRetailReceipt(orderId){

const order =
(db.orders || []).find(o => o.id === orderId);

if(!order) return alert("Order not found");

if(order.status !== "disbursed")
return alert("Only disbursed orders can print receipt");

const retailer =
(db.retailers || []).find(r=>r.id===order.retailer_id);

const items =
(db.order_items || []).filter(i=>i.order_id===order.id);

let total = 0;

let rows = items.map(item=>{

const product =
(db.products || []).find(p=>p.id===item.product_id);

const subtotal = item.quantity * item.price;
total += subtotal;

return `
<tr>
<td>${product?.product_name || "-"}</td>
<td>${item.quantity}</td>
<td>${item.price}</td>
<td>${subtotal}</td>
</tr>
`;

}).join("");

openReceiptWindow({
title: "OFFICIAL RECEIPT",
clientName: retailer?.name || "-",
meta: `
<p><strong>Order No:</strong> ${order.id.slice(0,8)}</p>
<p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
`,
rows,
total
});

}