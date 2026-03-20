/**
 * ADD EMPLOYEE / ADMIN
 * Creates Auth account, uploads photo, and creates database profile
 */
async function addEmployee() {
    const email = document.getElementById("empEmail").value;
    const password = document.getElementById("empPassword").value;
    const fullName = document.getElementById("empFullName").value;
    const role = document.getElementById("empRole").value;
    const salary = document.getElementById("empSalary") ? document.getElementById("empSalary").value : 0;
    const photoFile = document.getElementById("empPhoto").files[0];

    if (!email || !password || !fullName) return alert("Please fill in all fields.");

    try {
        // 1. Create the Auth Account 
        // Note: We don't 'await' the session to change. 
        // If your Supabase project has 'Confirm Email' ON, they must click a link before logging in.
        const { data: authData, error: authError } = await supa.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role
                }
            }
        });

        if (authError) throw authError;
        
        // Use the ID from the newly created auth user
        const newUserId = authData.user.id;

        let photoUrl = "";

        // 2. Upload Profile Photo (Optional)
        if (photoFile && newUserId) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${newUserId}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supa.storage
                .from('avatars')
                .upload(fileName, photoFile);

            if (!uploadError) {
                const { data: publicData } = supa.storage.from('avatars').getPublicUrl(fileName);
                photoUrl = publicData.publicUrl;
            }
        }

        // 3. Create Database Profile in 'users' table
        // This links the Auth ID to your visible Staff list
        const { error: dbError } = await supa.from("users").insert([{
            id: newUserId, // CRITICAL: This connects Auth to Database
            email: email,
            full_name: fullName,
            role: role,
            salary: parseFloat(salary),
            pic: photoUrl,
            status: 'active',
            created_at: new Date()
        }]);

        if (dbError) throw dbError;

        alert(`Success! ${fullName} created. They can now login with their email.`);
        
        // 4. Cleanup and Refresh
        await sync(); 
        if (typeof renderAll === "function") renderAll(); 
        
        // Clear Form
        document.getElementById("empEmail").value = "";
        document.getElementById("empPassword").value = "";
        document.getElementById("empFullName").value = "";

    } catch (err) {
        console.error("Employee Creation Error:", err);
        alert("Error: " + err.message);
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