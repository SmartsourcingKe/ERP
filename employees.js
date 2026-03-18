/**
 * ADD EMPLOYEE
 * 1. Creates Supabase Auth Account
 * 2. Uploads Profile Photo to 'avatars' bucket
 * 3. Creates Public Profile in 'users' table
 */
async function addEmployee() {
    const email = document.getElementById("empEmail").value;
    const password = document.getElementById("empPassword").value;
    const fullName = document.getElementById("empFullName").value;
    const role = document.getElementById("empRole").value;
    const photoFile = document.getElementById("empPhoto").files[0];

    if (!email || !password || !fullName) {
        return alert("Please fill in Email, Password, and Full Name.");
    }

    try {
        // 1. Create Auth Account
        const { data: authData, error: authError } = await supa.auth.signUp({ email, password });
        if (authError) throw authError;
        const userId = authData.user.id;

        let photoUrl = "";

        // 2. Upload Photo if selected
        if (photoFile) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supa.storage
                .from('avatars')
                .upload(fileName, photoFile);

            if (uploadError) throw uploadError;

            // Get Public URL for the uploaded photo
            const { data: publicData } = supa.storage.from('avatars').getPublicUrl(fileName);
            photoUrl = publicData.publicUrl;
        }

        // 3. Create Public Profile
        const { error: profileError } = await supa.from('users').upsert([{
            id: userId,
            auth_user_id: userId,
            full_name: fullName,
            email: email,
            role: role,
            pic: photoUrl, // Restored the photo URL logic
            status: 'active'
        }], { onConflict: 'email' });

        if (profileError) throw profileError;

        alert("Employee Saved Successfully!");
        
        // Reset form and refresh UI
        document.getElementById("empEmail").value = "";
        document.getElementById("empPassword").value = "";
        if (typeof sync === "function") await sync();
        renderEmployees();
        
    } catch (err) {
        console.error("Employee Creation Error:", err);
        alert("Error: " + err.message);
    }
}

/**
 * RENDER EMPLOYEES
 */
function renderEmployees() {
    const tbody = document.getElementById("employeeBody");
    if (!tbody) return;

    const employees = window.db.users || [];

    tbody.innerHTML = employees.map(user => `
        <tr>
            <td><img src="${user.pic || 'https://via.placeholder.com/40'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border: 1px solid #ddd;"></td>
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td><span class="badge">${user.role.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-blue" onclick="printIDCard('${user.id}')">ID Card</button>
                <button class="btn btn-red" onclick="editStaff('${user.id}')">Edit</button>
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