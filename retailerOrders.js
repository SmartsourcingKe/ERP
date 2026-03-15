/**
 * ADD TO CART
 * Handles inventory checks and local cart state.
 */
function addToCart() {
    // 1. Correct IDs from index.html
    const productId = document.getElementById("orderProductSelect")?.value;
    const qtyInput = document.getElementById("orderQty");
    const qty = Number(qtyInput.value);

    if (!productId) return alert("Please select a product.");
    if (qty <= 0) return alert("Please enter a valid quantity.");

    // 2. Use global window.db
    const product = (window.db.products || []).find(p => p.id === productId);
    if (!product) return;

    // Initialize window.cart if it doesn't exist
    if (!window.cart) window.cart = [];

    const existing = window.cart.find(c => c.product_id === productId);
    const currentCartQty = existing ? existing.qty : 0;

    // 3. Check inventory
    if ((product.stock || 0) < (qty + currentCartQty)) {
        return alert(`Insufficient stock. Available: ${product.stock}`);
    }

    if (existing) {
        existing.qty += qty;
    } else {
        window.cart.push({
            product_id: product.id,
            name: product.name, 
            price: Number(product.price), 
            qty: qty
        });
    }

    qtyInput.value = "";
    renderCart();
}

/**
 * RENDER CART TABLE
 */
function renderCart() {
    const view = document.getElementById("cartView");
    if (!view) return;

    if (!window.cart || window.cart.length === 0) {
        view.innerHTML = "<p style='color:gray; padding:10px;'>Cart is empty</p>";
        return;
    }

    let grandTotal = 0;
    const rows = window.cart.map((item, index) => {
        const rowTotal = item.qty * item.price;
        grandTotal += rowTotal;
        return `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.qty}</td>
                <td>${item.price.toLocaleString()}</td>
                <td>${rowTotal.toLocaleString()}</td>
                <td><button class="btn btn-red" style="padding:2px 8px;" onclick="window.cart.splice(${index},1);renderCart()">X</button></td>
            </tr>`;
    }).join("");

    view.innerHTML = `
        <table class="card">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="text-align:right; margin-top:10px; font-size:1.2em;">
            <strong>Grand Total: KES ${grandTotal.toLocaleString()}</strong>
        </div>`;
}

/**
 * CREATE RETAILER ORDER
 */
async function createOrder() {
    const retailerId = document.getElementById("retailerSelect")?.value;
    if (!retailerId) return alert("Select a retailer.");
    if (!window.cart || window.cart.length === 0) return alert("Cart is empty.");

    const total = window.cart.reduce((sum, c) => sum + (c.qty * c.price), 0);

    try {
        // 1. Insert Master Order
        const { data: order, error: orderErr } = await supa.from("orders").insert([{
            retailer_id: retailerId,
            total: total,
            created_by: window.currentUser.id,
            status: "pending"
        }]).select().single();

        if (orderErr) throw orderErr;

        // 2. Insert Items & Update Stock
        for (const item of window.cart) {
            // Save item
            await supa.from("order_items").insert([{
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.qty,
                price: item.price
            }]);

            // Deduct stock from Supabase
            const originalProd = window.db.products.find(p => p.id === item.product_id);
            if (originalProd) {
                const newStock = (originalProd.stock || 0) - item.qty;
                await supa.from("products").update({ stock: newStock }).eq("id", item.product_id);
            }
        }

        alert("Order created successfully!");
        window.cart = [];
        renderCart();
        await sync(); // Refresh UI and global data

    } catch (err) {
        console.error("Order Error:", err);
        alert("Failed to create order: " + err.message);
    }
}

/**
 * PRINT RETAIL RECEIPT (PDF)
 */
async function printRetailReceipt(orderId) {
    const order = window.db.orders?.find(o => o.id === orderId);
    const retailer = window.db.retailers?.find(r => r.id === order?.retailer_id);
    const items = window.db.order_items?.filter(i => i.order_id === orderId) || [];

    if (!order || !retailer) return alert("Order data not found.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. Branding Header
    if (window.db.branding?.logo_url) {
        try {
            const logo = await fetchImageAsBase64(window.db.branding.logo_url);
            if (logo) doc.addImage(logo, 'PNG', 85, 10, 40, 20);
        } catch (e) { console.warn("Logo failed to load for PDF"); }
    }
    
    doc.setFontSize(18).text(window.db.branding?.company_name || "ERP System", 105, 35, {align:"center"});
    doc.setFontSize(10).text(window.db.branding?.tagline || "", 105, 40, {align:"center"});

    doc.setFontSize(14).text("OFFICIAL RECEIPT", 20, 55);
    doc.setFontSize(10).text(`Retailer: ${retailer.name}`, 20, 62);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 150, 62);
    doc.line(20, 65, 190, 65);

    // 2. Table Header
    let y = 75;
    doc.setFont("helvetica", "bold");
    doc.text("Item", 20, y);
    doc.text("Qty", 100, y);
    doc.text("Price", 130, y);
    doc.text("Subtotal", 160, y);
    
    doc.setFont("helvetica", "normal");
    y += 5;
    
    items.forEach(item => {
        const prod = window.db.products.find(p => p.id === item.product_id);
        y += 8;
        doc.text(prod?.name || "Product", 20, y);
        doc.text(String(item.quantity), 100, y);
        doc.text(Number(item.price).toLocaleString(), 130, y);
        doc.text((item.quantity * item.price).toLocaleString(), 160, y);
    });

    y += 15;
    doc.setFontSize(14).setFont("helvetica", "bold");
    doc.text(`Total Paid: KES ${Number(order.total).toLocaleString()}`, 190, y, {align:"right"});

    doc.save(`Receipt_${retailer.name.replace(/\s/g, '_')}.pdf`);
}

/**
 * RENDER ORDER HISTORY
 * Displays past orders and provides the Print button.
 */
function renderOrders() {
    const tbody = document.getElementById("ordersBody");
    if (!tbody) return;

    const orders = window.db.orders || [];
    const retailers = window.db.retailers || [];

    tbody.innerHTML = orders.map(o => {
        const retailer = retailers.find(r => r.id === o.retailer_id);
        return `
            <tr>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>${retailer ? retailer.name : 'Unknown'}</td>
                <td>KES ${Number(o.total).toLocaleString()}</td>
                <td><span class="badge">${o.status}</span></td>
                <td>
                    <button class="btn btn-blue" onclick="printRetailReceipt('${o.id}')">Print Receipt</button>
                </td>
            </tr>
        `;
    }).join("");
}