/**
 * ADD TO CART
 * Handles inventory checks and local cart state.
 */
function addToCart() {
    const productId = document.getElementById("productSelect").value;
    const qty = Number(document.getElementById("orderQty").value);

    if (!productId) return alert("Please select a product.");
    if (qty <= 0) return alert("Please enter a valid quantity.");

    const product = (db.products || []).find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(c => c.product_id === productId);
    const currentCartQty = existing ? existing.qty : 0;

    // Check inventory
    if ((product.stock || 0) < (qty + currentCartQty)) {
        return alert(`Insufficient stock. Available: ${product.stock}`);
    }

    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name, // Fixed from product_name
            price: Number(product.price), // Fixed from selling_price
            qty: qty
        });
    }

    document.getElementById("orderQty").value = "";
    renderCart();
}

/**
 * RENDER CART TABLE
 */
function renderCart() {
    const view = document.getElementById("cartView");
    if (!view) return;

    if (cart.length === 0) {
        view.innerHTML = "<p class='text-gray'>Cart is empty</p>";
        return;
    }

    let grandTotal = 0;
    const rows = cart.map((item, index) => {
        const rowTotal = item.qty * item.price;
        grandTotal += rowTotal;
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.price.toLocaleString()}</td>
                <td>${rowTotal.toLocaleString()}</td>
                <td><button class="btn-red" onclick="cart.splice(${index},1);renderCart()">X</button></td>
            </tr>`;
    }).join("");

    view.innerHTML = `
        <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="text-align:right; margin-top:10px;">
            <strong>Grand Total: KES ${grandTotal.toLocaleString()}</strong>
        </div>`;
}

/**
 * CREATE RETAILER ORDER
 * Commits the cart to Supabase and updates inventory.
 */
async function createOrder() {
    const retailerId = document.getElementById("retailerSelect")?.value;
    if (!retailerId) return alert("Select a retailer.");
    if (cart.length === 0) return alert("Cart is empty.");

    const total = cart.reduce((sum, c) => sum + (c.qty * c.price), 0);

    try {
        // 1. Insert Master Order
        const { data: order, error: orderErr } = await supa.from("orders").insert([{
            retailer_id: retailerId,
            total: total,
            created_by: currentUser.id,
            status: "pending"
        }]).select().single();

        if (orderErr) throw orderErr;

        // 2. Insert Items & Update Stock
        for (const item of cart) {
            await supa.from("order_items").insert([{
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.qty,
                price: item.price
            }]);

            const originalProd = db.products.find(p => p.id === item.product_id);
            if (originalProd) {
                await supa.from("products")
                    .update({ stock: (originalProd.stock || 0) - item.qty })
                    .eq("id", item.product_id);
            }
        }

        alert("Order created successfully!");
        cart = [];
        renderCart();
        await sync();

    } catch (err) {
        console.error("Order Error:", err);
        alert("Failed to create order: " + err.message);
    }
}

/**
 * PRINT RETAIL RECEIPT (PDF)
 */
async function printRetailReceipt(orderId) {
    const order = db.orders.find(o => o.id === orderId);
    const retailer = db.retailers.find(r => r.id === order.retailer_id);
    const items = db.order_items.filter(i => i.order_id === orderId);

    if (!order || !retailer) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Branding Header
    if (db.branding?.logo_url) {
        const logo = await fetchImageAsBase64(db.branding.logo_url);
        doc.addImage(logo, 'PNG', 85, 10, 40, 20);
    }
    
    doc.setFontSize(18).text(db.branding?.company_name || "ERP System", 105, 35, {align:"center"});
    doc.setFontSize(10).text(db.branding?.tagline || "", 105, 40, {align:"center"});

    doc.setFontSize(14).text("OFFICIAL RECEIPT", 20, 55);
    doc.setFontSize(10).text(`Retailer: ${retailer.name}`, 20, 62);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 150, 62);
    doc.line(20, 65, 190, 65);

    // Table Header
    let y = 75;
    doc.setFont(undefined, "bold");
    doc.text("Item", 20, y);
    doc.text("Qty", 100, y);
    doc.text("Price", 130, y);
    doc.text("Subtotal", 160, y);
    doc.setFont(undefined, "normal");
    
    y += 5;
    items.forEach(item => {
        const prod = db.products.find(p => p.id === item.product_id);
        y += 8;
        doc.text(prod?.name || "Product", 20, y);
        doc.text(String(item.quantity), 100, y);
        doc.text(Number(item.price).toLocaleString(), 130, y);
        doc.text((item.quantity * item.price).toLocaleString(), 160, y);
    });

    y += 15;
    doc.setFontSize(14).setFont(undefined, "bold");
    doc.text(`Total Paid: KES ${Number(order.total).toLocaleString()}`, 190, y, {align:"right"});

    doc.save(`Receipt_${retailer.name.replace(/\s/g, '_')}.pdf`);
}