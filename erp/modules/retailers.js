async function addRetailer(){

if(!window.supa) return;

if(!retailerName?.value)
return alert("Enter retailer name");

const { error } = await supa.from("retailers").insert([{
name: retailerName.value,
phone: retailerPhone?.value || "",
location: retailerLocation?.value || "",
kyc_id: retailerKyc?.value || ""
}]);

if(error){
alert(error.message);
return;
}

retailerName.value="";
if(retailerPhone) retailerPhone.value="";
if(retailerLocation) retailerLocation.value="";
if(retailerKyc) retailerKyc.value="";

await sync();

}



function renderRetailers(){

if(!retailerBody) return;
if(!Array.isArray(db.retailers)) return;

const search =
(document.getElementById("retailerSearch")?.value || "")
.toLowerCase();

retailerBody.innerHTML =
db.retailers
.filter(r =>
(r.name || "").toLowerCase().includes(search) ||
(r.phone || "").toLowerCase().includes(search) ||
(r.location || "").toLowerCase().includes(search)
)
.map(r=>`
<tr>
<td>${r.name || ""}</td>
<td>${r.phone || ""}</td>
<td>${r.location || ""}</td>
</tr>
`).join("");

}



function renderRetailerDropdown(){

if(!retailerSelect) return;
if(!Array.isArray(db.retailers)) return;

retailerSelect.innerHTML =
'<option value="">Select Retailer</option>' +
db.retailers.map(r=>`
<option value="${r.id}">
${r.name}
</option>
`).join("");

}



async function deleteRetailer(id){

if(!window.supa) return;

if(!confirm("Delete this retailer?")) return;

const {error} = await supa
.from("retailers")
.delete()
.eq("id", id);

if(error){
console.error(error);
alert("Failed to delete retailer");
return;
}

await sync();

}