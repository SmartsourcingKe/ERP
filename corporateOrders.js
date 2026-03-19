// 1. Initialize Global Cart
window.corporateCart = [];

/**
 * ADD TO CORPORATE CART
 */
function addCorporateToCart() {
    const grade = document.getElementById("cbcLevel").value;
    const students = parseInt(document.getElementById("cbcStudents").value);
    const price = parseFloat(document.getElementById("cbcPrice").value);

    if (!grade || !students || !price) {
        return alert("Please fill in Grade, Students, and Price.");
    }

    const item = {
        grade: grade, 
        students: students,
        pricePerStudent: price,
        subtotal: students * price
    };

    window.corporateCart.push(item);
    renderCorporateCart(); 
}

/**
 * RENDER CART UI
 */
function renderCorporateCart() {
    const tbody = document.getElementById("corporateCartTable");
    const totalDisplay = document.getElementById("corporateTotalDisplay");
    if (!tbody) return;

    let grandTotal = 0;
    tbody.innerHTML = window.corporateCart.map((item, index) => {
        grandTotal += item.subtotal;
        return `
            <tr>
                <td>${item.grade}</td>
                <td>${item.students}</td>
                <td>KES ${item.subtotal.toLocaleString()}</td>
                <td>
                    <button onclick="window.corporateCart.splice(${index},1); renderCorporateCart();" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">
                        Remove
                    </button>
                </td>
            </tr>`;
    }).join("");

    if (totalDisplay) totalDisplay.innerText = grandTotal.toLocaleString();
}

/**
 * SAVE ORDER TO DATABASE
 */
// Rename this to match the 'onclick' in index.html
// Rename this to match the 'onclick' in index.html
async function processCorporateOrder() { 
    const schoolId = document.getElementById("corpSchoolSelect").value;
    
    if (!window.currentUser) return alert("Please log in again.");
    if (!schoolId) return alert("Please select a school.");
    if (!window.corporateCart.length) return alert("Cart is empty.");

    try {
        const grandTotal = window.corporateCart.reduce((sum, item) => sum + item.subtotal, 0);

        // 1. Create Header
        const { data: order, error: orderErr } = await supa.from("corporate_orders").insert([{
            school_id: schoolId,
            total: grandTotal,
            status: 'pending',
            created_by: window.currentUser.id 
        }]).select().single();

        if (orderErr) throw orderErr;

        // 2. Create Items
        const itemsToInsert = window.corporateCart.map(item => ({
            corporate_order_id: order.id,
            grade: item.grade, 
            student_count: item.students,
            price_per_student: item.pricePerStudent,
            subtotal: item.subtotal
        }));

        const { error: itemsErr } = await supa.from("corporate_order_items").insert(itemsToInsert);
        if (itemsErr) throw itemsErr;

        alert("Corporate Order Saved Successfully!");
        window.corporateCart = [];
        renderCorporateCart();
        await sync(); 
    } catch (err) {
        alert("Order failed: " + err.message);
    }
}

/**
 * RENDER SCHOOLS DROPDOWN & TABLE
 */
function renderSchools() {
    const tbody = document.getElementById("schoolTableBody");
    const select = document.getElementById("corpSchoolSelect");
    const schools = window.db.schools || [];

    if (tbody) {
        tbody.innerHTML = schools.length === 0 
            ? '<tr><td colspan="3" style="text-align:center;">No schools registered.</td></tr>'
            : schools.map(s => `<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.location || 'N/A'}</td></tr>`).join("");
    }

    if (select) {
        select.innerHTML = '<option value="">-- Select School --</option>' + 
            schools.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    }
}


// RENAME THIS EXACTLY
function renderCorporateHistory() {
    const tbody = document.getElementById("corpOrdersBody");
    if (!tbody) return;

    // Get orders and sort by newest first
    const orders = (window.db.corporate_orders || []).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No corporate orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const school = (window.db.schools || []).find(s => s.id === order.school_id);
        const status = order.status || 'pending';
        
        return `
            <tr>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${school ? school.name : 'Unknown'}</td>
                <td>KES ${Number(order.total || 0).toLocaleString()}</td>
                <td><span class="badge ${status}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-blue" onclick="viewReceipt('${order.id}', 'corporate')">Receipt</button>
                    ${status === 'pending' ? 
                        `<button class="btn btn-green" onclick="disburseOrder('${order.id}', 'corporate_orders')">Disburse</button>` : 
                        `<span style="color:green; font-weight:bold;">✓ DISBURSED</span>`
                    }
                </td>
            </tr>`;
    }).join("");
}

/**
 * ADD NEW SCHOOL
 */
async function addSchool() {
    const name = document.getElementById("schoolName").value;
    const phone = document.getElementById("schoolPhone").value; // Added this
    const location = document.getElementById("schoolLocation").value;

    if (!name || !phone) return alert("School name and phone are required.");

    try {
        const { error } = await supa
            .from("schools")
            .insert([{ name, phone, location }]) // Match your table columns
            .select();

        if (error) throw error;

        alert("School added successfully!");
        
        await sync(); // Fetches the new school into window.db.schools
        if (typeof renderSchools === "function") renderSchools(); // Corrected function name
        
        // Clear forms
        document.getElementById("schoolName").value = "";
        document.getElementById("schoolPhone").value = "";
        document.getElementById("schoolLocation").value = "";
    } catch (err) {
        console.error("Error adding school:", err);
        alert("Save failed: " + err.message);
    }
}

function viewReceipt(orderId, type) {
    if (type !== 'corporate') return; // Handle other types as needed

    const order = window.db.corporate_orders.find(o => o.id === orderId);
    const school = window.db.schools.find(s => s.id === order.school_id);
    const items = window.db.corporate_order_items.filter(i => i.corporate_order_id === orderId);

    // Populate the Modal defined in your index.html
    document.getElementById("receiptCompanyName").innerText = window.db.branding?.name || "SmartsourcingKe";
    document.getElementById("receiptTagline").innerText = window.db.branding?.tagline || "";
    document.getElementById("receiptGrandTotal").innerText = `TOTAL: KES ${Number(order.total).toLocaleString()}`;
    
    document.getElementById("receiptMeta").innerHTML = `
        <p><strong>School:</strong> ${school ? school.name : 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
        <p><strong>Order ID:</strong> ${order.id.slice(0,8)}</p>
    `;

    document.getElementById("receiptItemsBody").innerHTML = items.map(i => `
        <tr>
            <td>${i.grade}</td>
            <td style="text-align:center;">${i.student_count}</td>
            <td style="text-align:center;">${i.price_per_student}</td>
            <td style="text-align:center;">-</td>
            <td style="text-align:right;">${i.subtotal.toLocaleString()}</td>
        </tr>
    `).join("");

    // Show the modal
    document.getElementById("receiptModal").classList.remove("hidden");
}