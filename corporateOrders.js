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
    const tbody = document.getElementById("corpOrdersBody"); // Matched to index.html
    if (!tbody) return;

    const orders = window.db.corporate_orders || [];
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No corporate history found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const school = window.db.schools?.find(s => s.id === order.school_id);
        return `
            <tr>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${school ? school.name : 'N/A'}</td>
                <td>KES ${Number(order.total).toLocaleString()}</td>
                <td><span class="badge">${order.status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-blue" onclick="viewReceipt('${order.id}', 'corporate')">Receipt</button>
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

async function viewReceipt(orderId) {
    // 1. Try to find in memory (Check both Retail and Corporate)
    let order = (window.db.orders || []).find(o => String(o.id) === String(orderId)) || 
                (window.db.corporate_orders || []).find(o => String(o.id) === String(orderId));

    // 2. FALLBACK: Fetch directly from Supabase if memory is behind
    if (!order) {
        console.log("Order not in memory, fetching from Supabase...");
        let { data: retail } = await supa.from('orders').select('*').eq('id', orderId).single();
        order = retail;
        
        if (!order) {
            let { data: corp } = await supa.from('corporate_orders').select('*').eq('id', orderId).single();
            order = corp;
        }
    }

    if (!order) return alert("Order not found in Database!");

    // 3. Identify if it is Corporate (Corporate orders use 'school_id' or 'total' column)
    // Note: your corporate table uses 'total' while retail uses 'total_amount'
    const isCorporate = order.hasOwnProperty('school_id');
    const itemsTable = isCorporate ? 'corporate_order_items' : 'order_items';
    const idColumn = isCorporate ? 'corporate_order_id' : 'order_id';

    // 4. Fetch the specific items
    const { data: items, error: itemsError } = await supa
        .from(itemsTable)
        .select('*')
        .eq(idColumn, orderId);

    if (itemsError || !items) return alert("Could not load receipt items.");

    // 5. Fill Branding & Meta
    const branding = window.db.branding || { company_name: "SmartsourcingKe" };
    document.getElementById('receiptCompanyName').innerText = branding.company_name.toUpperCase();
    document.getElementById('receiptLogo').src = branding.logo_url || "";
    document.getElementById('watermarkImg').src = branding.logo_url || "";

    document.getElementById('receiptMeta').innerHTML = `
        <p><strong>Type:</strong> ${isCorporate ? 'CORPORATE' : 'RETAIL'}</p>
        <p><strong>Order No:</strong> #${String(order.id).slice(0, 8)}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
    `;

    // 6. Fill Table Body (Fixes the blank Fee column)
    const tbody = document.getElementById('receiptItemsBody');
    tbody.innerHTML = items.map(item => {
        const qty = Number(item.quantity || item.student_count || 0);
        const price = Number(item.price_at_sale || item.price_per_student || 0);
        const fee = Number(item.unit_price_with_fee || item.fee || 0);
        const total = Number(item.total_price || item.subtotal || (qty * price) + fee);

        return `
            <tr>
                <td style="padding: 5px 0; border-bottom:1px solid #000;">${item.product_name || item.grade || 'Item'}</td>
                <td style="text-align:center; border-bottom:1px solid #000;">${qty}</td>
                <td style="text-align:center; border-bottom:1px solid #000;">${price.toLocaleString()}</td>
                <td style="text-align:center; border-bottom:1px solid #000;">${fee.toLocaleString()}</td>
                <td style="text-align:right; font-weight:bold; border-bottom:1px solid #000;">${total.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    // 7. Grand Total (Corporate uses .total, Retail uses .total_amount)
    const grandTotal = order.total || order.total_amount || 0;
    document.getElementById('receiptGrandTotal').innerText = `TOTAL: KES ${Number(grandTotal).toLocaleString()}`;

    // 8. Show Modal
    document.getElementById('receiptModal').classList.remove('hidden');
    document.getElementById('receiptModal').style.display = 'flex';
}

async function saveCorporateOrder(cart) {
    // Calculate values before sending
    const itemsToSave = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: item.price_at_sale,
        unit_price_with_fee: item.fee || 0, // Ensure this isn't null
        total_price: (item.quantity * item.price_at_sale) + (item.fee || 0)
    }));

    const { data, error } = await supa
        .from('corporate_order_items')
        .insert(itemsToSave);

    if (error) {
        console.error("RLS or Database Error:", error.message);
        alert("Order Failed: Check Supabase RLS Policies.");
    }
}