async function addSchool() {
    if (!window.supa) return;

    const name = document.getElementById("schoolName").value.trim();
    const phone = document.getElementById("schoolPhone").value.trim();
    const loc = document.getElementById("schoolLocation").value.trim();

    if (!name) return alert("School name is required");

    try {
        const { error } = await supa.from("schools").insert([{ 
            name: name, 
            phone: phone, 
            location: loc 
        }]);

        if (error) throw error;

        alert("School registered successfully!");
        // Clear inputs
        document.getElementById("schoolName").value = "";
        document.getElementById("schoolPhone").value = "";
        document.getElementById("schoolLocation").value = "";
        
        await sync(); // Refresh the list for the dropdowns
    } catch (err) {
        alert("Error adding school: " + err.message);
    }
}

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

function renderCorporate() {
    const body = document.getElementById("corporateBody");
    if (!body || !db.corporate_orders) return;

    body.innerHTML = db.corporate_orders.map(order => {
        // Safe find: if db.schools isn't loaded yet, show "Loading..."
        const school = (db.schools || []).find(s => s.id === order.school_id);
        
        return `
            <tr>
                <td>${school ? school.name : 'Unknown School'}</td>
                <td>${order.status}</td>
                <td>KES ${Number(order.total).toLocaleString()}</td>
                <td>
                    <button class="btn btn-blue" onclick="viewCorpOrder('${order.id}')">View</button>
                </td>
            </tr>
        `;
    }).join("");
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
    if (!body) return;

    // SAFETY GUARD: Ensure arrays exist before we search them
    const orders = db.corporate_orders || [];
    const schools = db.schools || [];

    const search = (document.getElementById("schoolSearch")?.value || "").toLowerCase();

    body.innerHTML = orders
        .filter(o => {
            // Find school name safely
            const school = schools.find(s => s.id === o.school_id);
            const schoolName = (school?.name || "").toLowerCase();
            return schoolName.includes(search);
        })
        .map(o => {
            const school = schools.find(s => s.id === o.school_id);
            return `
            <tr>
                <td>${school?.name || "Unknown School"}</td>
                <td><span class="badge">${o.status}</span></td>
                <td>KES ${Number(o.total || 0).toLocaleString()}</td>
                <td>
                    <button class="btn btn-blue" onclick="viewCorpOrder('${o.id}')">View</button>
                </td>
            </tr>`;
        }).join("");
}