/**
 * RENDER CORPORATE SCHOOL DROPDOWNS
 */
function renderSchools() {
    const schoolSelect = document.getElementById("corpSchoolSelect");
    if (!schoolSelect || !db.schools) return;

    schoolSelect.innerHTML = '<option value="">Select School</option>' +
        db.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}

/**
 * CORPORATE CART LOGIC
 * Allows adding multiple grades/levels to a single school order.
 */
function addCorporateToCart() {
    const schoolId = document.getElementById("corpSchoolSelect").value;
    const level = document.getElementById("cbcLevel").value;
    const students = Number(document.getElementById("cbcStudents").value);
    const price = Number(document.getElementById("cbcPrice").value);

    if (!schoolId || !level || students <= 0 || price <= 0) {
        return alert("Please fill in school, level, students, and price.");
    }

    const item = {
        level: level,
        students: students,
        price_per_student: price,
        subtotal: students * price
    };

    corporateCart.push(item);
    renderCorporateCart();
}

function renderCorporateCart() {
    const view = document.getElementById("corporateCartView");
    if (!view) return;

    if (corporateCart.length === 0) {
        view.innerHTML = "";
        return;
    }

    let html = `<table class="card">
        <thead><tr><th>Level</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>`;
    
    let grandTotal = 0;
    corporateCart.forEach((item, index) => {
        grandTotal += item.subtotal;
        html += `<tr>
            <td>${item.level}</td>
            <td>${item.students}</td>
            <td>${item.price_per_student}</td>
            <td>${item.subtotal.toLocaleString()}</td>
            <td><button class="btn-red" onclick="corporateCart.splice(${index},1);renderCorporateCart()">X</button></td>
        </tr>`;
    });

    html += `</tbody></table><p><strong>Grand Total: ${grandTotal.toLocaleString()}</strong></p>`;
    view.innerHTML = html;
}

/**
 * PROCESS CORPORATE ORDER
 * Saves the order and its items to Supabase.
 */
async function createCorporateOrder() {
    const schoolId = document.getElementById("corpSchoolSelect").value;
    if (!schoolId || corporateCart.length === 0) return alert("Select school and add items to cart.");

    const total = corporateCart.reduce((sum, item) => sum + item.subtotal, 0);

    try {
        // 1. Insert Master Order
        const { data: order, error: orderErr } = await supa
            .from("corporate_orders")
            .insert([{
                school_id: schoolId,
                total: total,
                status: 'Pending',
                created_by: currentUser?.id
            }])
            .select()
            .single();

        if (orderErr) throw orderErr;

        // 2. Insert Order Items (CBC Levels)
        const orderItems = corporateCart.map(item => ({
            corporate_order_id: order.id,
            level: item.level,
            student_count: item.students,
            price_per_student: item.price_per_student,
            subtotal: item.subtotal
        }));

        const { error: itemsErr } = await supa.from("corporate_order_items").insert(orderItems);
        if (itemsErr) throw itemsErr;

        alert("Corporate order processed successfully!");
        corporateCart = []; // Clear cart
        await sync();
        
    } catch (err) {
        console.error("Corporate Order Error:", err);
        alert("Failed to process order: " + err.message);
    }
}

/**
 * RENDER CORPORATE ORDERS TABLE
 */
function renderCorporate() {
    const body = document.getElementById("corporateBody");
    if (!body || !db.corporate_orders) return;

    const search = (document.getElementById("schoolSearch")?.value || "").toLowerCase();

    body.innerHTML = db.corporate_orders
        .filter(o => {
            const school = db.schools.find(s => String(s.id) === String(o.school_id));
            return (school?.name || "").toLowerCase().includes(search);
        })
        .map(o => {
            const school = db.schools.find(s => String(s.id) === String(o.school_id));
            return `
                <tr>
                    <td>${school ? school.name : "Unknown School"}</td>
                    <td><span class="status-${o.status.toLowerCase()}">${o.status}</span></td>
                    <td>${Number(o.total).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-blue" onclick="printCorporateInvoice('${o.id}')">Invoice</button>
                    </td>
                </tr>
            `;
        }).join("");
}