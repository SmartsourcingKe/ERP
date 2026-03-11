async function addProduct(){

if(!window.supa) return;
if(!window.currentUser) return;

const nameInput = document.getElementById("productName");
const priceInput = document.getElementById("productPrice");
const feeInput = document.getElementById("productFee");

if(!nameInput || !priceInput || !feeInput) return;

const name = nameInput.value.trim();
const price = Number(priceInput.value || 0);
const company_fee = Number(feeInput.value || 0);

if(!name){
alert("Product name required");
return;
}

const {error} = await supa
.from("products")
.insert([{
name,
price,
company_fee
}]);

if(error){
console.error(error);
alert("Failed to add product");
return;
}

nameInput.value="";
priceInput.value="";
feeInput.value="";

if(typeof sync === "function"){
await sync();
}

}



function renderProducts(){

if(!window.db || !Array.isArray(db.products)) return;

const table = document.getElementById("productsTable");
if(!table) return;

table.innerHTML = db.products.map(p=>`
<tr>
<td>${p.name}</td>
<td>${p.price}</td>
<td>${p.company_fee}</td>
<td>
<button onclick="updateProduct('${p.id}')">Edit</button>
<button onclick="deleteProduct('${p.id}')">Delete</button>
</td>
</tr>
`).join("");

}



async function deleteProduct(id){

if(!window.supa) return;

if(!confirm("Delete product?")) return;

const {error} = await supa
.from("products")
.delete()
.eq("id", id);

if(error){
console.error(error);
alert("Delete failed");
return;
}

if(typeof sync === "function"){
await sync();
}

}



async function updateProduct(id){

if(!window.supa) return;

const name = prompt("New product name:");
const price = Number(prompt("New price:") || 0);
const fee = Number(prompt("New company fee:") || 0);

if(!name) return;

const {error} = await supa
.from("products")
.update({
name,
price,
company_fee: fee
})
.eq("id", id);

if(error){
console.error(error);
alert("Update failed");
return;
}

if(typeof sync === "function"){
await sync();
}

}



function searchProducts(){

const input = document.getElementById("productSearch");
if(!input) return;

const term = input.value.toLowerCase();

if(!window.db || !Array.isArray(db.products)) return;

const table = document.getElementById("productsTable");
if(!table) return;

const filtered = db.products.filter(p=>
(p.name || "").toLowerCase().includes(term)
);

table.innerHTML = filtered.map(p=>`
<tr>
<td>${p.name}</td>
<td>${p.price}</td>
<td>${p.company_fee}</td>
<td>
<button onclick="updateProduct('${p.id}')">Edit</button>
<button onclick="deleteProduct('${p.id}')">Delete</button>
</td>
</tr>
`).join("");

}