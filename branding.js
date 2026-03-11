async function updateBranding(){

if(!currentUser || currentUser.role !== "admin"){
    alert("Admin only");
    return;
}

const name = document.getElementById("brandCompanyName").value;
const tagline = document.getElementById("brandTagline").value;
const logoFile = document.getElementById("brandLogoFile").files[0];
const bgFile = document.getElementById("brandBgFile").files[0];

let logoUrl = db.branding?.logo_url || null;
let bgUrl = db.branding?.background_url || null;

// ---------- LOGO UPLOAD ----------
if(logoFile){

const fileExt = logoFile.name.split('.').pop();
const fileName = "logo_" + Date.now() + "." + fileExt;

const { error: uploadError } = await supa.storage
.from("branding")
.upload(fileName, logoFile);

if(uploadError){
alert("Logo upload failed: " + uploadError.message);
return;
}

const { data } = supa.storage
.from("branding")
.getPublicUrl(fileName);

logoUrl = data.publicUrl;
}

// ---------- BACKGROUND UPLOAD ----------
if(bgFile){

const fileName = "bg_" + Date.now();

const { error: uploadError } = await supa.storage
.from("branding")
.upload(fileName, bgFile);

if(uploadError){
alert("Background upload failed: " + uploadError.message);
return;
}

const { data } = supa.storage
.from("branding")
.getPublicUrl(fileName);

bgUrl = data.publicUrl;
}

// ---------- DATABASE UPDATE ----------
let dbError;

if(db.branding){

const { error } = await supa.from("branding")
.update({
company_name: name,
tagline: tagline,
logo_url: logoUrl,
background_url: bgUrl
})
.eq("id", db.branding.id);

dbError = error;

}else{

const { error } = await supa.from("branding")
.insert([{
company_name: name,
tagline: tagline,
logo_url: logoUrl,
background_url: bgUrl
}]);

dbError = error;
}

if(dbError){
alert("Database error: " + dbError.message);
return;
}

await sync();
alert("Branding updated successfully");
}

function renderBranding(){

if(!db.branding) return;

const logo = document.getElementById("companyLogo");
const name = document.getElementById("companyName");
const tagline = document.getElementById("companyTagline");

if(logo){
if(db.branding.logo_url){
logo.src = db.branding.logo_url;
logo.style.display = "block";
}else{
logo.style.display = "none";
}
}

if(name){
name.textContent = db.branding.company_name || "";
}

if(tagline){
tagline.textContent = db.branding.tagline || "";
}

const loginLogo = document.getElementById("loginLogo");
const loginName = document.getElementById("loginCompanyName");
const loginTagline = document.getElementById("loginTagline");

if(loginLogo){
    if(db.branding?.logo_url){
        loginLogo.src = db.branding.logo_url;
        loginLogo.style.display = "block";
    }else{
        loginLogo.style.display = "none";
    }
}

if(loginName){
    loginName.textContent = db.branding?.company_name || "SmartsourcingKe ERP";
}

if(loginTagline){
    loginTagline.textContent = db.branding?.tagline || "";
}

// ===== APPLY APP BACKGROUND =====
if(db.branding?.background_url){

    document.body.style.backgroundImage = 
`linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), 
url('${db.branding.background_url}')`;

    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";

}else{

    document.body.style.backgroundImage = "none";
}

}

async function fetchImageAsBase64(url){
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve)=>{
        const reader = new FileReader();
        reader.onloadend = ()=> resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

async function loadBranding(){

const { data, error } = await supa
.from("branding")
.select("*")
.single()

if(error){
console.log("branding error:", error)
return
}

if(!data) return

db.branding = data

// Company name
const name = document.getElementById("companyName")
if(name) name.textContent = data.company_name || ""

// Tagline
const tagline = document.getElementById("companyTagline")
if(tagline) tagline.textContent = data.tagline || ""

// Logo
if(data.logo_url){
const logo = document.getElementById("companyLogo")
if(logo){
logo.src = data.logo_url
logo.style.display = "block"
}
}

// Login page branding
const loginName = document.getElementById("loginCompanyName")
if(loginName) loginName.textContent = data.company_name || ""

const loginTag = document.getElementById("loginTagline")
if(loginTag) loginTag.textContent = data.tagline || ""

const loginLogo = document.getElementById("loginLogo")
if(loginLogo && data.logo_url){
loginLogo.src = data.logo_url
loginLogo.style.display = "block"
}

}