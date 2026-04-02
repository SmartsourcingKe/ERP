/**
 * ADD EMPLOYEE / ADMIN
 * Creates Auth account and database profile for immediate login
 */
async function addEmployee() {
    // 1. Safely grab elements
    const emailEl = document.getElementById("empEmail");
    const passEl = document.getElementById("empPassword");
    const nameEl = document.getElementById("empFullName");
    const roleEl = document.getElementById("empRole");
    const salaryEl = document.getElementById("empSalary");
    const photoEl = document.getElementById("empPhoto");

    // 2. Validate required text fields
    if (!emailEl?.value || !passEl?.value || !nameEl?.value) {
        return alert("Please fill in Email, Password, and Full Name.");
    }

    const email = emailEl.value.trim();
    const password = passEl.value;
    const fullName = nameEl.value;
    const role = roleEl ? roleEl.value : "staff";
    const salary = salaryEl ? parseFloat(salaryEl.value) : 0;

    // 3. Safely handle the photo (This was causing your null error)
    const photoFile = (photoEl && photoEl.files && photoEl.files.length > 0) ? photoEl.files[0] : null;

    try {
        // Step A: Create Auth User
        const { data: authData, error: authError } = await supa.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, role: role } }
        });

        if (authError) throw authError;
        const newUserId = authData.user.id;

        // Step B: Upload Photo if it exists
        let photoUrl = "";
        if (photoFile && newUserId) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${newUserId}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supa.storage
                .from('profiles')
                .upload(fileName, photoFile);

            if (!uploadError) {
                const { data: urlData } = supa.storage.from('profiles').getPublicUrl(fileName);
                photoUrl = urlData.publicUrl;
            }
        }

        // Step C: Insert into Public Users Table
        const { error: profileError } = await supa
            .from("users")
            .insert([{
                id: newUserId,
                email: email,
                full_name: fullName,
                role: role,
                salary: salary,
                pic: photoUrl
            }]);

        if (profileError) throw profileError;

        alert(`Employee ${fullName} created successfully!`);
        
        // Reset form
        emailEl.value = "";
        passEl.value = "";
        nameEl.value = "";
        if (photoEl) photoEl.value = "";

        await sync(); 
        if (typeof renderAll === "function") renderAll();

    } catch (err) {
        console.error("Employee Creation Error:", err);
        alert("Failed: " + err.message);
    }
}

// REST OF FILE (renderEmployees, printIDCard, editStaff) remains the same

/**
 * RENDER EMPLOYEES
 */
function renderEmployees() {
    const tbody = document.getElementById("employeeTableBody");
    if (!tbody) {
        console.warn("Table body 'employeeTableBody' not found in HTML.");
        return;
    }

    // CRITICAL: Your data is stored in window.db.users, not window.db.employees
    const staff = (window.db.users || []).filter(u => u.role === 'staff' || u.role === 'admin');
    
    if (staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No active employees found.</td></tr>';
        return;
    }

    tbody.innerHTML = staff.map(user => `
        <tr>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.email}</td>
            <td><span class="badge" style="background:${user.role === 'admin' ? '#e74c3c' : '#3498db'}">
                ${user.role.toUpperCase()}
            </span></td>
            <td>${user.phone || '-'}</td>
            <td>
                <button class="btn btn-blue" onclick="editUser('${user.id}')">Edit</button>
				<button class="btn" style="background: #f39c12; color: white;" onclick="resetEmployeePassword('${user.id}')">
					Reset Password
				</button>
                ${user.role !== 'admin' ? `<button class="btn btn-red" onclick="deleteUser('${user.id}')">Remove</button>` : ''}
            </td>
        </tr>
    `).join("");
}

/**
 * EDIT STAFF (Restored missing function)
 */
async function editStaff(userId) {
    const user = window.db.users.find(u => u.id === userId);
    if (!user) return;

    const newName = prompt("Update Full Name:", user.full_name);
    const newRole = prompt("Update Role (staff/admin):", user.role);

    if (newName && newRole) {
        try {
            const { error } = await supa
                .from('users')
                .update({ full_name: newName, role: newRole })
                .eq('id', userId);

            if (error) throw error;
            alert("Staff updated!");
            await sync();
            renderEmployees();
        } catch (err) {
            alert("Update failed: " + err.message);
        }
    }
}

/**
 * PRINT ID CARD
 */
function printIDCard(userId) {
    const user = window.db.users.find(u => u.id === userId);
    if (!user) return alert("User not found");

    const branding = window.db.branding || { company_name: "SmartsourcingKe" };

    const idHtml = `
        <div id="idCard" style="width:300px; border:2px solid #333; padding:20px; text-align:center; border-radius:15px; background:#fff; font-family: sans-serif;">
            <div style="font-weight:bold; font-size:18px; color: #2c3e50;">${branding.company_name}</div>
            <hr style="margin: 10px 0;">
            <img src="${user.pic || 'https://via.placeholder.com/100'}" style="width:110px; height:110px; border-radius:10px; margin:10px 0; border:2px solid #eee; object-fit: cover;">
            <h3 style="margin:5px 0; color: #333;">${user.full_name}</h3>
            <p style="color:blue; font-weight:bold; margin:0; font-size: 14px;">${user.role.toUpperCase()}</p>
            <div style="margin-top:20px; font-size:10px; color: #999;">Employee ID: ${user.id.slice(0,8)}</div>
        </div>
    `;

    const content = document.getElementById("receiptContent");
    if (content) {
        content.innerHTML = idHtml + '<br><button class="btn btn-blue no-print" onclick="window.print()">Print ID Card</button>';
        document.getElementById("receiptModal").classList.remove("hidden");
    }
}


async function resetEmployeePassword(userId) {
    const newPassword = prompt("Enter new password (min 6 characters):");
    if (!newPassword || newPassword.length < 6) return alert("Invalid password.");

    try {
        // This uses the Supabase Admin API
        // Note: This requires the 'Service Role' key or an Edge Function
        // for full administrative control.
        const { data, error } = await supa.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) throw error;
        alert("Password updated successfully! ✅");
    } catch (err) {
        console.error(err);
        alert("Reset failed: " + err.message + "\n\nNote: Admin resets usually require Service Role keys. If this fails, the user can use the 'Forgot Password' flow.");
    }
}

async function generateIDCard() {
    const user = window.currentUser;
    if (!user) return alert("No session found");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });

    // Branding Header
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 86, 15, 'F');
    
    const brand = window.db?.branding || {};
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10).text(brand.company_name || "SmartsourcingKe", 43, 9, { align: "center" });

    // Photo
    if (user.pic) {
        try {
            const photoBase64 = await fetchImageAsBase64(user.pic);
            doc.addImage(photoBase64, 'JPEG', 5, 20, 25, 25);
        } catch (e) { console.warn("Staff photo failed"); }
    }

    // Staff Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8).setFont(undefined, 'bold').text("NAME:", 35, 25);
    doc.setFont(undefined, 'normal').text(user.full_name || "User", 35, 29);
    
    doc.setFont(undefined, 'bold').text("ROLE:", 35, 36);
    doc.setFont(undefined, 'normal').text(user.role || "Staff", 35, 40);

    doc.setFont(undefined, 'bold').text("ID:", 35, 47);
    doc.setFont(undefined, 'normal').text(String(user.id).slice(0, 8), 35, 51);

    doc.save(`ID_${user.full_name}.pdf`);
}

async function fetchImageAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

window.resetEmployeePassword = resetEmployeePassword;
window.renderEmployees = renderEmployees;