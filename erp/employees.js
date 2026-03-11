async function addEmployee(){

if(!currentUser || currentUser.role !== "admin")
return alert("Admin only");

if(!empEmail.value || !empPassword.value)
return alert("Email & Password required");

const { data: signData, error: signError } = await supa.auth.signUp({
email: empEmail.value,
password: empPassword.value
});

if(signError){
alert(signError.message);
return;
}

let photoUrl = null;
const file = empPhoto.files[0];

if(file){

const fileExt = file.name.split(".").pop();
const fileName = "emp_" + Date.now() + "." + fileExt;

const { error: uploadError } = await supa.storage
.from("staff_photos")
.upload(fileName, file);

if(uploadError){
alert("Photo upload failed: " + uploadError.message);

}else{

const { data: urlData } = supa.storage
.from("staff_photos")
.getPublicUrl(fileName);

photoUrl = urlData.publicUrl;

}

}

const { error: profileError } = await supa.from("users").insert([{
auth_user_id: signData.user?.id,
full_name: empFullName.value,
email: empEmail.value,
basic_salary: Number(empBasic.value || 0),
commission_rate: Number(empCommissionRate.value || 0),
role: empRole.value,
pic: photoUrl
}]);

if(profileError){
alert("Profile Error: " + profileError.message);
return;
}

alert("Employee created successfully.");

empFullName.value="";
empEmail.value="";
empPassword.value="";
empBasic.value="";
empCommissionRate.value="";
empPhoto.value="";

await sync();

if(typeof generatePayroll === "function"){
await generatePayroll();
}

}


function renderEmployees(){

if(!window.db || !Array.isArray(db.users)) return;

const search =
(document.getElementById("employeeSearch")?.value || "")
.toLowerCase();

employeeBody.innerHTML =
db.users
.filter(u =>
(u.full_name || "").toLowerCase().includes(search) ||
(u.email || "").toLowerCase().includes(search)
)
.map(u=>`
<tr>
<td>${u.full_name}</td>
<td>${u.email}</td>
<td>${u.role}</td>
<td>
<button onclick="generateUserID('${u.id}')">Print ID</button>
<button onclick="deleteEmployee('${u.id}')">Delete</button>
</td>
</tr>
`).join("");

}


async function deleteEmployee(id){

if(!currentUser || currentUser.role !== "admin")
return alert("Admin only");

if(!confirm("Delete employee?")) return;

await supa.from("users")
.delete()
.eq("id", id);

await sync();

}


function printID(userId){

if(!window.db || !Array.isArray(db.users)) return;

const user = db.users.find(u=>String(u.id)===String(userId));
if(!user) return;

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

let y = 15;

doc.setFontSize(16);
doc.text(
db.branding?.company_name || "SmartsourcingKe",
105,
y,
{ align:"center" }
);
y += 8;

doc.setFontSize(10);
doc.text(
db.branding?.tagline || "Nunua Kibosi, Dignify Your Hustle",
105,
y,
{ align:"center" }
);
y += 10;

if(db.branding?.logo_url){
doc.addImage(db.branding.logo_url,"JPEG",80,y,50,25);
y += 30;
}

if(user.pic){
doc.addImage(user.pic,"JPEG",80,y,50,40);
y += 45;
}

doc.setFontSize(12);
doc.text("Staff No: " + String(user.id).slice(0,8),20,y);
y += 8;

doc.text("Name: " + user.full_name,20,y);
y += 8;

doc.text("Role: " + user.role,20,y);

doc.save(user.full_name + "_ID.pdf");

}


async function generateUserID(userId){

if(!window.db || !Array.isArray(db.users)) return;

const user = db.users.find(u => String(u.id) === String(userId));
if(!user) return alert("User not found");

const { jsPDF } = window.jspdf;

const doc = new jsPDF({
orientation:"landscape",
unit:"mm",
format:[86,54]
});

doc.setFillColor(245,245,245);
doc.rect(0,0,86,54,"F");

if(db.branding?.logo_url){
const logoImg = await fetchImageAsBase64(db.branding.logo_url);
doc.addImage(logoImg, undefined, 5, 4, 18, 10);
}

doc.setFontSize(8);
doc.setFont(undefined,"bold");
doc.text(
db.branding?.company_name || "Company Name",
43,
10,
{align:"center"}
);

doc.setFontSize(6);
doc.setFont(undefined,"normal");
doc.text(
db.branding?.tagline || "",
43,
14,
{align:"center"}
);

if(user.pic){
const photoImg = await fetchImageAsBase64(user.pic);
doc.addImage(photoImg, undefined, 5, 18, 25, 30);
}

doc.setFontSize(7);

doc.setFont(undefined,"bold");
doc.text("Name:",35,22);

doc.setFont(undefined,"normal");
doc.text(user.full_name || user.email,35,26);

doc.setFont(undefined,"bold");
doc.text("Role:",35,32);

doc.setFont(undefined,"normal");
doc.text(user.role,35,36);

doc.setFont(undefined,"bold");
doc.text("Staff ID:",35,42);

doc.setFont(undefined,"normal");
doc.text(String(user.id).slice(0,8),35,46);

doc.setFontSize(6);
doc.text("Authorized Signature",60,50);

doc.save(`Staff_ID_${user.full_name || user.email}.pdf`);

}