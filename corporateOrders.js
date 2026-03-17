// Add this at the top of corporateOrders.js
let corporateCart = []; 

// Initialize the cart as an empty array at the top of corporateOrders.js
window.corporateCart = [];

function addCorporateToCart() {
    const grade = document.getElementById("cbcLevel").value;
    const students = parseInt(document.getElementById("cbcStudents").value);
    const price = parseFloat(document.getElementById("cbcPrice").value);

    if (!grade || !students || !price) {
        return alert("Please fill in Grade, Students, and Price.");
    }

    const item = {
        level: grade, // Use 'level' to match your render function
        students: students,
        pricePerStudent: price,
        subtotal: students * price
    };

    window.corporateCart.push(item);
    renderCorporateCart(); 
}

function renderCorporateCart() {
    const tbody = document.getElementById("corporateCartTable");
    const totalDisplay = document.getElementById("corporateTotalDisplay");
    if (!tbody) return;

    let grandTotal = 0;
    // CRITICAL: Ensure we use window.corporateCart consistently
    tbody.innerHTML = window.corporateCart.map((item, index) => {
        grandTotal += item.subtotal;
        return `
            <tr>
                <td>${item.level}</td>
                <td>${item.students}</td>
                <td>KES ${item.subtotal.toLocaleString()}</td>
                <td><button onclick="window.corporateCart.splice(${index},1); renderCorporateCart();" style="color:red; cursor:pointer;">Remove</button></td>
            </tr>
        `;
    }).join("");

    if (totalDisplay) totalDisplay.innerText = `Total: KES ${grandTotal.toLocaleString()}`;
}


/**
 * UPDATE STATUS
 */
async function updateCorpOrderStatus(orderId, newStatus) {
    const { error } = await supa.from("corporate_orders").update({ status: newStatus }).eq("id", orderId);
    if (error) return alert("Error updating status: " + error.message);
    
    alert(`Order ${newStatus} successfully!`);
    await sync(); // Refresh all data
}

// Keep your existing viewCorpOrder and generateCorporateReceipt functions below this...

/**
 * VIEW SPECIFIC CORPORATE ORDER DETAILS
 * Fetches line items from the database and displays them.
 */
async function viewCorpOrder(orderId) {
    try {
        // Fetch items specifically for this order ID
        const { data: items, error } = await supa
            .from("corporate_order_items")
            .select("*")
            .eq("corporate_order_id", orderId);

        if (error) throw error;

        if (!items || items.length === 0) {
            return alert("No items found for this order.");
        }

        // Format the items for display
        let details = "Order Details:\n\n";
        items.forEach((item, index) => {
            details += `${index + 1}. ${item.level}\n`;
            details += `   Students: ${item.student_count}\n`;
            details += `   Price: KES ${item.price_per_student.toLocaleString()}\n`;
            details += `   Subtotal: KES ${item.subtotal.toLocaleString()}\n`;
            details += `--------------------------\n`;
        });

        const total = items.reduce((sum, i) => sum + i.subtotal, 0);
        details += `GRAND TOTAL: KES ${total.toLocaleString()}`;

        alert(details);

    } catch (err) {
        console.error("Error fetching order items:", err);
        alert("Could not load order details: " + err.message);
    }
}

/**
 * GENERATE CORPORATE RECEIPT PDF
 */
async function generateCorporateReceipt(orderId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        // 1. Get Order and School Data
        const order = db.corporate_orders.find(o => o.id === orderId);
        const school = db.schools.find(s => s.id === order.school_id);

        // 2. Fetch specific items for this order
        const { data: items, error } = await supa
            .from("corporate_order_items")
            .select("*")
            .eq("corporate_order_id", orderId);

        if (error) throw error;

        // 3. PDF Header
        doc.setFontSize(22);
        doc.text("OFFICIAL RECEIPT", 105, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.text(`Company: ${document.getElementById('companyName')?.innerText || 'SmartsourcingKe'}`, 20, 40);
        doc.text(`Receipt No: ${order.id.substring(0, 8).toUpperCase()}`, 20, 50);
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 60);

        // 4. Client Details
        doc.setFont(undefined, 'bold');
        doc.text("Bill To:", 20, 80);
        doc.setFont(undefined, 'normal');
        doc.text(`School: ${school?.name || 'N/A'}`, 20, 90);
        doc.text(`Location: ${school?.location || 'N/A'}`, 20, 100);

        // 5. Items Table Header
        let y = 120;
        doc.setFont(undefined, 'bold');
        doc.text("Level/Description", 20, y);
        doc.text("Qty", 100, y);
        doc.text("Price", 130, y);
        doc.text("Subtotal", 170, y);
        doc.line(20, y + 2, 190, y + 2);

        // 6. Loop Items
        y += 10;
        doc.setFont(undefined, 'normal');
        items.forEach(item => {
            doc.text(`${item.level}`, 20, y);
            doc.text(`${item.student_count}`, 100, y);
            doc.text(`${Number(item.price_per_student).toLocaleString()}`, 130, y);
            doc.text(`${Number(item.subtotal).toLocaleString()}`, 170, y);
            y += 10;
        });

        // 7. Total
        doc.line(20, y, 190, y);
        y += 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL: KES ${Number(order.total).toLocaleString()}`, 170, y, { align: "right" });

        // 8. Footer
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text("Thank you for your business.", 105, y + 30, { align: "center" });

        // 9. Save the PDF
        doc.save(`Receipt_${school?.name.replace(/\s+/g, '_')}_${orderId.substring(0,5)}.pdf`);

    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Error generating receipt: " + err.message);
    }
}

function showOnScreenReceipt(orderId, type = 'retail') {
    let order, entity, items;
    
    // 1. Get the Correct Data
    if (type === 'corporate') {
        order = window.db.corporate_orders.find(o => o.id === orderId);
        entity = window.db.schools.find(s => s.id === order.school_id);
        items = window.db.corporate_order_items.filter(i => i.corporate_order_id === orderId);
    } else {
        order = window.db.orders.find(o => o.id === orderId);
        entity = window.db.retailers.find(r => r.id === order.retailer_id);
        items = window.db.order_items.filter(i => i.order_id === orderId);
    }

    if (!order) return alert("Order not found");

    // 2. Fill Branding (Logo, Name, Tagline)
    const branding = window.db.branding || {};
    document.getElementById("receiptLogo").src = branding.logo_url || "";
    document.getElementById("watermarkImg").src = branding.logo_url || "";
    document.getElementById("receiptCompanyName").innerText = branding.company_name || "SmartsourcingKe";
    document.getElementById("receiptTagline").innerText = branding.tagline || "";

    // 3. Fill Meta Data
    document.getElementById("receiptMeta").innerHTML = `
        <strong>Order No:</strong> ${order.id.substring(0,8).toUpperCase()}<br>
        <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
        <strong>Customer:</strong> ${entity ? entity.name : 'N/A'}
    `;

    // 4. Fill Items Table (Amount Calculation)
    const tbody = document.getElementById("receiptItemsBody");
    tbody.innerHTML = items.map(item => {
        // For Retail: item.product_id | For Corporate: item.level
        const description = item.level || (window.db.products.find(p => p.id === item.product_id)?.name) || "Item";
        const qty = item.students || item.quantity;
        const total = item.subtotal || (item.price * item.quantity);
        
        return `
            <tr style="border-bottom: 1px dashed #eee;">
                <td style="padding:5px;">${description}</td>
                <td style="text-align:center;">${qty}</td>
                <td style="text-align:right;">${Number(total).toLocaleString()}</td>
            </tr>
        `;
    }).join("");

    // 5. Fill Grand Total
    document.getElementById("receiptGrandTotal").innerText = `TOTAL KES: ${Number(order.total).toLocaleString()}`;

    // 6. Show the Modal
    document.getElementById("receiptModal").classList.remove("hidden");
}

async function addSchool() {
    const name = document.getElementById("schoolName").value.trim();
    const phone = document.getElementById("schoolPhone").value.trim();
    const location = document.getElementById("schoolLocation").value.trim();

    if (!name || !phone) {
        return alert("Please enter at least the School Name and Phone.");
    }

    try {
        // 1. Save to Supabase
        const { error } = await supa.from("schools").insert([{
            name: name,
            phone: phone,
            location: location,
            created_by: window.currentUser.id // Essential for security/RLS
        }]);

        if (error) throw error;

        alert("School saved successfully!");

        // 2. Clear inputs
        document.getElementById("schoolName").value = "";
        document.getElementById("schoolPhone").value = "";
        document.getElementById("schoolLocation").value = "";

        // 3. REFRESH EVERYTHING
        await sync();        // Pulls new data from Supabase
        renderSchools();     // Redraws the school table
        updateSchoolDropdown(); // Adds the new school to the Order dropdown
        
    } catch (err) {
        console.error("Save Error:", err.message);
        alert("Failed to save school: " + err.message);
    }
}

function updateSchoolDropdown() {
    const select = document.getElementById("corpSchoolSelect");
    if (!select) return;

    const schools = window.db.schools || [];
    
    // Keep the first default option
    select.innerHTML = '<option value="">-- Select School --</option>';
    
    schools.forEach(school => {
        const opt = document.createElement("option");
        opt.value = school.id;
        opt.textContent = school.name;
        select.appendChild(opt);
    });
}

// Inside corporateOrders.js -> processCorporateOrder()
async function processCorporateOrder() {
    // 1. Get the school ID from the dropdown
    const schoolSelect = document.getElementById("corpSchoolSelect");
    const schoolId = schoolSelect.value;
    
    // 2. Check if the cart has items (we use window.corporateCart to keep it global)
    if (!schoolId) {
        return alert("Please select a school first.");
    }
    
    if (!window.corporateCart || window.corporateCart.length === 0) {
        return alert("Your cart is empty. Add items before completing the order.");
    }

    try {
        // 1. Calculate Grand Total
        const grandTotal = window.corporateCart.reduce((sum, item) => sum + item.subtotal, 0);
        console.log("Total calculated:", grandTotal);

        // 2. Insert into corporate_orders
        const { data: order, error: orderErr } = await supa.from("corporate_orders").insert([{
    school_id: schoolId,
    total: grandTotal,
    status: 'pending', // <--- Change this from 'completed'
    created_by: window.currentUser.id
}]).select().single();

        if (orderErr) throw orderErr;
        console.log("Order Header created:", order.id);

        // 3. Insert Items into corporate_order_items
    for (const item of window.corporateCart) {
    const { error: itemErr } = await supa.from("corporate_order_items").insert([{
        corporate_order_id: order.id, // Ensure this matches your DB column exactly
        level: item.level,           // Using 'level' to match your addCorporateToCart object
        student_count: item.students,
        price_per_student: item.pricePerStudent, 
        subtotal: item.subtotal
    }]);
    if (itemErr) throw itemErr;
}

        console.log("All items saved. Finalizing...");
        alert("Corporate Order Finalized Successfully!");
        
        // 4. Cleanup
        window.corporateCart = [];
        renderCorporateCart();
        await sync(); // Refresh history
        
    } catch (err) {
        console.error("CORPORATE ORDER ERROR:", err);
        alert("Error completing order: " + err.message);
    }
}

function renderSchools() {
    const tbody = document.getElementById("schoolBody"); 
    const select = document.getElementById("corpSchoolSelect");
    
    // Check if the data exists in our local database
    const schools = window.db.schools || [];

    // 1. Update the Table List (The visual list of schools)
    if (tbody) {
        tbody.innerHTML = schools.length === 0 
            ? '<tr><td colspan="3" style="text-align:center;">No schools registered.</td></tr>'
            : schools.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.phone}</td>
                    <td>${s.location || 'N/A'}</td>
                </tr>
            `).join("");
    }

    // 2. Update the Dropdown (So you can select them for a new order)
    if (select) {
        select.innerHTML = '<option value="">-- Select School --</option>' + 
            schools.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    }
}

async function completeCorporateOrder() {
    // ... existing validation code ...

    try {
        // 1. Create the Main Order
        const { data: order, error: orderErr } = await supa.from("corporate_orders").insert([{
            school_id: selectedSchoolId,
            total: grandTotal,
            created_by: window.currentUser.id
        }]).select().single();

        if (orderErr) throw orderErr;

        // 2. Save Items
        for (const item of window.corporateCart) {
    const { error: itemErr } = await supa.from("corporate_order_items").insert([{
        order_id: order.id, // This is the column the error mentioned
        grade: item.grade,
        student_count: item.students,
        price_per_student: item.pricePerStudent,
        subtotal: item.subtotal
    }]);

    if (itemErr) throw itemErr;
}
        
        alert("Corporate Order Finalized!");
        await sync();
        
    } catch (err) {
        alert("Error: " + err.message);
    }
}