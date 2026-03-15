// Add this at the top of corporateOrders.js
let corporateCart = []; 

function addCorporateToCart() {
    const schoolId = document.getElementById("corpSchoolSelect").value;
    const level = document.getElementById("cbcLevel").value;
    const students = Number(document.getElementById("cbcStudents").value);
    const price = Number(document.getElementById("cbcPrice").value);

    if (!schoolId || !level || students <= 0 || price <= 0) {
        return alert("Please fill in school, level, students, and price.");
    }

    corporateCart.push({
        level: level,
        students: students,
        price_per_student: price,
        subtotal: students * price
    });
    
    document.getElementById("cbcLevel").value = "";
    document.getElementById("cbcStudents").value = "";
    document.getElementById("cbcPrice").value = "";
    
    renderCorporateCart();
}

function renderCorporateCart() {
    const view = document.getElementById("corporateCartView");
    if (!view) return;
    if (corporateCart.length === 0) {
        view.innerHTML = "<em>Cart is empty</em>";
        return;
    }
    let html = "<ul>";
    corporateCart.forEach((item) => {
        html += `<li>${item.level}: ${item.students} students @ KES ${item.price_per_student.toLocaleString()}</li>`;
    });
    html += "</ul>";
    view.innerHTML = html;
}

/**
 * RENDER CORPORATE SECTION
 * Lists schools and corporate order history
 */
function renderCorporate() {
    // 1. Render School List
    const schoolBody = document.getElementById("schoolBody");
    const schoolSearch = document.getElementById("schoolSearch")?.value.toLowerCase() || "";
    const schools = (window.db.schools || []).filter(s => s.name.toLowerCase().includes(schoolSearch));
    
    if (schoolBody) {
        schoolBody.innerHTML = schools.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.phone}</td>
                <td>${s.location}</td>
            </tr>
        `).join("");
    }

    // 2. Render Corporate Order History
    const orderBody = document.getElementById("corpOrdersBody");
    if (!orderBody) return;

    const orders = window.db.corporate_orders || [];
    orderBody.innerHTML = orders.map(o => {
        const school = (window.db.schools || []).find(s => s.id === o.school_id);
        const isPending = o.status === 'pending';
        
        return `
            <tr>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>${school ? school.name : 'Unknown'}</td>
                <td>KES ${Number(o.total).toLocaleString()}</td>
                <td><span class="badge ${o.status}">${o.status.toUpperCase()}</span></td>
                <td>
                    ${isPending 
                        ? `<button class="btn btn-green" onclick="updateCorpOrderStatus('${o.id}', 'disbursed')">Mark Disbursed</button>` 
                        : `<button class="btn btn-blue" onclick="showOnScreenReceipt('${o.id}', 'corporate')">Print Receipt</button>`
                    }
                </td>
            </tr>
        `;
    }).join("");
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
    
    if (type === 'corporate') {
        order = window.db.corporate_orders.find(o => o.id === orderId);
        entity = window.db.schools.find(s => s.id === order.school_id);
        items = window.db.corporate_order_items.filter(i => i.corporate_order_id === orderId);
    } else {
        order = window.db.orders.find(o => o.id === orderId);
        entity = window.db.retailers.find(r => r.id === order.retailer_id);
        items = window.db.order_items.filter(i => i.order_id === orderId);
    }

    // ... Use the same Modal population logic from our previous step ...
    // Change "Retailer" label to "School" if type === 'corporate'
    document.getElementById("receiptModal").classList.remove("hidden");
}

async function addSchool() {
    const name = document.getElementById("schoolName").value;
    const phone = document.getElementById("schoolPhone").value;
    const location = document.getElementById("schoolLocation").value;

    if(!name) return alert("School name required");

    const { error } = await supa.from("schools").insert([{ name, phone, location }]);
    if (error) alert(error.message);
    else {
        alert("School saved!");
        await sync(); 
    }
}