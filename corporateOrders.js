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
async function completeCorporateOrder() {
    const schoolId = document.getElementById("corpSchoolSelect").value;
    
    if (!schoolId) return alert("Please select a school.");
    if (window.corporateCart.length === 0) return alert("Your cart is empty.");

    try {
        const grandTotal = window.corporateCart.reduce((sum, item) => sum + item.subtotal, 0);

        // 1. Save Header
        const { data: order, error: orderErr } = await supa.from("corporate_orders").insert([{
            school_id: schoolId,
            total: grandTotal,
            status: 'pending',
            created_by: window.currentUser.id
        }]).select().single();

        if (orderErr) throw orderErr;

        // 2. Save Items
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
        
        // 3. Cleanup & UI Refresh
        window.corporateCart = []; 
        renderCorporateCart();      
        if (typeof sync === "function") await sync();
        renderCorpHistory(); 
        
    } catch (err) {
        console.error("Order Error:", err);
        alert("Failed to save order: " + err.message);
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

/**
 * RENDER CORPORATE HISTORY
 */
function renderCorpHistory() {
    const tbody = document.getElementById("corpOrdersBody");
    if (!tbody) return;

    const orders = window.db.corporate_orders || [];
    
    tbody.innerHTML = orders.length === 0 
        ? '<tr><td colspan="5" style="text-align:center;">No corporate orders found.</td></tr>'
        : orders.map(order => {
            const school = window.db.schools?.find(s => s.id === order.school_id);
            const status = order.status || 'pending';
            
            return `
                <tr>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td>${school ? school.name : 'Unknown'}</td>
                    <td>KES ${Number(order.total).toLocaleString()}</td>
                    <td><span class="badge ${status}">${status.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-blue" onclick="viewReceipt('${order.id}', 'corporate')">Receipt</button>
                        ${status === 'pending' ? 
                            `<button class="btn btn-green" onclick="disburseOrder('${order.id}', 'corporate_orders')">Disburse</button>` : 
                            `<span style="color:green; font-weight:bold;">✓ COMPLETED</span>`
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
    const phone = document.getElementById("schoolPhone").value;
    const location = document.getElementById("schoolLocation").value;

    if (!name || !phone) return alert("Name and Phone are required.");

    try {
        const { error } = await supa.from("schools").insert([{ 
            name, phone, location 
        }]);
        if (error) throw error;

        alert("School added!");
        if (typeof sync === "function") await sync();
        renderSchools();
    } catch (err) {
        alert("Error: " + err.message);
    }
}