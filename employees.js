/**
 * ADD EMPLOYEE
 * 1. Creates Supabase Auth Account
 * 2. Uploads Profile Photo
 * 3. Creates Public.Users Profile
 */
async function addEmployee() {
    const email = document.getElementById("empEmail").value;
    const password = document.getElementById("empPassword").value;
    const fullName = document.getElementById("empFullName").value;
    const basic = document.getElementById("empBasic").value;
    const commission = document.getElementById("empCommissionRate").value;
    const role = document.getElementById("empRole").value;

    // 1. Create the Auth User
    const { data: authData, error: authError } = await supa.auth.signUp({
        email,
        password
    });

    if (authError) return alert("Auth Error: " + authError.message);

    const userId = authData.user?.id;

    if (userId) {
        // 2. Create the Database Profile (INSERT, not Update)
        const { error: dbError } = await supa.from("users").insert([{
            auth_user_id: userId,
            full_name: fullName,
            email: email,
            role: role,
            basic_salary: Number(basic),
            commission_rate: Number(commission)
        }]);

        if (dbError) {
            console.error(dbError);
            return alert("Database Error: " + dbError.message);
        }

        alert("Employee created successfully!");
        await sync(); // Refresh the list
    }
}

/**
 * RENDER EMPLOYEE LIST
 */
function renderEmployees() {
    const body = document.getElementById("employeeBody");
    if (!body || !db.users) return;

    const search = (document.getElementById("employeeSearch")?.value || "").toLowerCase();

    body.innerHTML = db.users
        .filter(u => 
            (u.full_name || "").toLowerCase().includes(search) || 
            (u.email || "").toLowerCase().includes(search)
        )
        .map(u => `
            <tr>
                <td>${u.full_name || u.email}</td>
                <td>${u.email}</td>
                <td><span class="badge">${u.role}</span></td>
                <td>
                    <button class="btn btn-blue" onclick="generateUserID('${u.id}')">ID Card</button>
                    <button class="btn btn-red" onclick="deleteEmployee('${u.id}')">Delete</button>
                </td>
            </tr>
        `).join("");
}

/**
 * DELETE EMPLOYEE
 */
async function deleteEmployee(id) {
    if (!currentUser || currentUser.role !== "admin") return alert("Admin only");
    if (!confirm("Are you sure you want to delete this employee? This will not remove their login credentials.")) return;

    const { error } = await supa.from("users").delete().eq("id", id);
    if (error) {
        alert("Delete failed: " + error.message);
    } else {
        await sync();
    }
}

/**
 * GENERATE USER ID (Professional CR80 Format)
 * 86mm x 54mm Landscape
 */
async function generateUserID(userId) {
    const user = db.users.find(u => String(u.id) === String(userId));
    if (!user) return alert("User not found");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [86, 54] });

    // Background Card Design
    doc.setFillColor(235, 235, 235);
    doc.rect(0, 0, 86, 54, "F");
    doc.setDrawColor(31, 45, 61); // Primary color border
    doc.setLineWidth(0.5);
    doc.rect(1, 1, 84, 52);

    // Header Branding
    if (db.branding?.logo_url) {
        try {
            const logoImg = await fetchImageAsBase64(db.branding.logo_url);
            doc.addImage(logoImg, 'PNG', 5, 4, 18, 10);
        } catch (e) { console.warn("Logo load failed"); }
    }

    doc.setFontSize(9).setFont(undefined, "bold");
    doc.text(db.branding?.company_name || "Company ERP", 43, 8, { align: "center" });
    doc.setFontSize(6).setFont(undefined, "normal");
    doc.text(db.branding?.tagline || "Professional Management System", 43, 11, { align: "center" });

    // Photo Section
    if (user.pic) {
        try {
            const photoImg = await fetchImageAsBase64(user.pic);
            doc.addImage(photoImg, 'JPEG', 5, 18, 25, 30);
        } catch (e) {
            doc.rect(5, 18, 25, 30); // Placeholder box
            doc.setFontSize(5).text("No Photo", 10, 33);
        }
    } else {
        doc.rect(5, 18, 25, 30);
    }

    // Details Section
    doc.setFontSize(8).setFont(undefined, "bold");
    doc.text("Name:", 35, 22);
    doc.setFont(undefined, "normal").text(user.full_name || "N/A", 35, 26);

    doc.setFont(undefined, "bold").text("Role:", 35, 32);
    doc.setFont(undefined, "normal").text(user.role?.toUpperCase() || "STAFF", 35, 36);

    doc.setFont(undefined, "bold").text("Staff ID:", 35, 42);
    doc.setFont(undefined, "normal").text(String(user.id).slice(0, 8), 35, 46);

    // Signature Area
    doc.setFontSize(5);
    doc.text("Authorized Signature", 65, 50);
    doc.line(60, 48, 80, 48);

    doc.save(`ID_${user.full_name.replace(/\s/g, '_')}.pdf`);
}