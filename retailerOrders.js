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
function showOnScreenReceipt(orderId) {
    const order = (window.db.orders || []).find(o => o.id === orderId);
    if (!order) return alert("Order not found");

    const retailer = (window.db.retailers || []).find(r => r.id === order.retailer_id);
    const items = (window.db.order_items || []).filter(i => i.order_id === orderId);

    // 1. Fill Header Branding (Matches your receiptLogo ID)
    const logoImg = document.getElementById("receiptLogo");
    if (logoImg) logoImg.src = window.db.branding?.logo_url || "";
    
    document.getElementById("receiptCompanyName").innerText = window.db.branding?.company_name || "SmartsourcingKe";
    document.getElementById("receiptTagline").innerText = window.db.branding?.tagline || "";

    // 2. Fill Meta Data (Date and Order Number)
    document.getElementById("receiptMeta").innerHTML = `
        <strong>Order ID:</strong> ${order.id.substring(0, 8)}<br>
        <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
        <strong>Customer:</strong> ${retailer ? retailer.name : 'Walk-in'}
    `;

    // 3. Fill Items Table
    const tbody = document.getElementById("receiptItemsBody");
    tbody.innerHTML = items.map(item => {
        const product = (window.db.products || []).find(p => p.id === item.product_id);
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:5px;">${product ? product.name : 'Unknown Product'}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">KES ${Number(item.price * item.quantity).toLocaleString()}</td>
            </tr>
        `;
    }).join("");

    // 4. Fill Total
    document.getElementById("receiptGrandTotal").innerText = `TOTAL: KES ${Number(order.total).toLocaleString()}`;

    // 5. Show the Modal
    document.getElementById("receiptModal").classList.remove("hidden");
}


function renderOrders() {
    const tbody = document.getElementById("ordersBody");
    if (!tbody) return;

    const orders = window.db.orders || [];
    const retailers = window.db.retailers || [];

    // Sort by date so new ones are at the top
    const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    tbody.innerHTML = sortedOrders.map(o => {
        const retailer = retailers.find(r => r.id === o.retailer_id);
        const isPending = o.status === 'pending';
        
        return `
            <tr>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>${retailer ? retailer.name : 'Unknown'}</td>
                <td>KES ${Number(o.total).toLocaleString()}</td>
                <td><span class="badge ${o.status}">${o.status.toUpperCase()}</span></td>
                <td>
                    ${isPending 
                        ? `<button class="btn btn-green" onclick="updateOrderStatus('${o.id}', 'disbursed')">Mark Disbursed</button>` 
                        : `<button class="btn btn-blue" onclick="showOnScreenReceipt('${o.id}')">Print Receipt</button>`
                    }
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * UPDATE ORDER STATUS
 * Changes status to 'disbursed' so receipt can be printed
 */
async function updateOrderStatus(orderId, newStatus) {
    try {
        const { error } = await supa
            .from("orders")
            .update({ status: newStatus })
            .eq("id", orderId);

        if (error) throw error;

        alert(`Order successfully ${newStatus}!`);
        
        // Refresh local data and UI
        await sync(); 
        renderOrders();
        
    } catch (err) {
        console.error("Status Update Error:", err);
        alert("Failed to update status: " + err.message);
    }
}