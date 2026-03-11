async function login() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");

  if (!emailInput || !passwordInput) {
    console.error("Login inputs not found");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {

    if (!window.supa) {
      console.error("Supabase client not initialized");
      alert("System not ready. Refresh page.");
      return;
    }

    const { data, error } = await supa.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      alert(error.message);
      return;
    }

    console.log("Login successful", data);

    showDashboard();

  } catch (err) {
    console.error("Login error:", err);
    alert("Login failed. Try again.");
  }
  
await sync()
await loadBranding()

}

async function logout() {

  try {

    if (typeof cleanupMessaging === "function") {
      cleanupMessaging();
    }

    if (!window.supa) {
      console.error("Supabase client not initialized");
      return;
    }

    const { error } = await supa.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      alert("Logout failed");
      return;
    }

    const loginPage = document.getElementById("loginPage");
    const dashboard = document.getElementById("dashboard");

    if (dashboard) dashboard.style.display = "none";
    if (loginPage) loginPage.style.display = "block";

    console.log("Logged out successfully");

  } catch (err) {
    console.error("Logout failed:", err);
  }

}

async function handleSignedIn(session) {

  if (!session || !session.user) return;

  try {

    const { data: userRow, error } = await supa
      .from("users")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    if (error || !userRow) {
      alert("User profile not found.");
      await supa.auth.signOut();
      return;
    }

    window.currentUser = userRow;

    applyPermissions();

    console.log("User loaded:", userRow);

    showDashboard();

    if (typeof sync === "function") {
      await sync();
    }

    if (typeof renderAll === "function") {
      renderAll();
    }

  } catch (err) {
    console.error("Signed-in handler failed:", err);
  }
}


/* ---- signed out handler ---- */

function handleSignedOut() {

  const loginPage = document.getElementById("loginPage");
  const dashboard = document.getElementById("dashboard");

  if (dashboard) dashboard.style.display = "none";
  if (loginPage) loginPage.style.display = "block";

  window.currentUser = null;

}


/* ---- expose login globally ---- */

window.login = login;

console.log("MAIN SCRIPT LOADED");

function getCurrentUser() {
  return window.currentUser || null;
}

function getUser(id){

  if(!window.db || !Array.isArray(db.users)) return null;

  return db.users.find(u => String(u.id) === String(id)) || null;
}

function getUserName(authId) {

  if(!window.db || !Array.isArray(db.users)) return "User";

  const user = db.users.find(u => String(u.auth_user_id) === String(authId));

  return user?.full_name || user?.email || "User";
}

function applyPermissions() {

  const user = window.currentUser;

  if (!user) return;

  const role = (user.role || "").toLowerCase();

  const adminBtn = document.getElementById("adminBtn");
  const payrollBtn = document.getElementById("payrollBtn");
  const performanceBtn = document.getElementById("performanceBtn");
  const profitBtn = document.getElementById("profitBtn");

  adminBtn?.classList.add("hidden");
  payrollBtn?.classList.add("hidden");
  performanceBtn?.classList.add("hidden");
  profitBtn?.classList.add("hidden");

  if (role === "admin") {
    adminBtn?.classList.remove("hidden");
    payrollBtn?.classList.remove("hidden");
    performanceBtn?.classList.remove("hidden");
    profitBtn?.classList.remove("hidden");
  }

  if (role === "staff") {
    performanceBtn?.classList.remove("hidden");
  }
}

async function generateUserID(userId){

if(!window.db || !Array.isArray(db.users)) return;

const user = db.users.find(u => u.id === userId);
if(!user) return alert("User not found");

const { jsPDF } = window.jspdf;

const doc = new jsPDF({
orientation:"landscape",
unit:"mm",
format:[86,54]
});

// Background
doc.setFillColor(230,236,245);
doc.rect(0,0,86,54,"F");

// Border
doc.setDrawColor(100);
doc.rect(1,1,84,52);

// ===== HEADER =====
if(db.branding?.logo_url){
const logoImg = await fetchImageAsBase64(db.branding.logo_url);
doc.addImage(logoImg, undefined, 5, 4, 18, 10);
}

doc.setFontSize(8);
doc.setFont(undefined,"bold");
doc.text(
db.branding?.company_name || "Company",
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

// ===== PHOTO =====
if(user.pic){
const photoImg = await fetchImageAsBase64(user.pic);
doc.addImage(photoImg, undefined, 5, 22, 20, 25);
}

// ===== DETAILS =====

const name =
user?.full_name || user?.email || "User";

doc.setFontSize(7);

doc.setFont(undefined,"bold");
doc.text("Name:",35,22);

doc.setFont(undefined,"normal");
doc.text(
doc.splitTextToSize(name,45),
35,
26
);

doc.setFont(undefined,"bold");
doc.text("Role:",35,34);

doc.setFont(undefined,"normal");
doc.text(user.role || "-",35,38);

doc.setFont(undefined,"bold");
doc.text("Staff ID:",35,44);

doc.setFont(undefined,"normal");
doc.text(String(user.id).slice(0,8),35,48);

// ===== FOOTER =====

doc.setFontSize(6);
doc.text("Authorized Signature",60,50);

// Save
doc.save(
`Staff_ID_${name.replace(/\s/g,"_")}.pdf`
);

}

function renderUserDropdown(){

  const select = document.getElementById("userSelect");

  if(!select) return;

  const users = db.users || [];

  select.innerHTML = users
    .map(u => `<option value="${u.id}">${u.full_name || u.email}</option>`)
    .join("");

}

async function restoreSession(){

const { data } = await supa.auth.getSession()

if(!data.session) return

await sync()
await loadBranding()

document.getElementById("loginPage").classList.add("hidden")
document.getElementById("dashboard").classList.remove("hidden")

}