/**
 * ADD TO CART
 * Handles inventory checks and local cart state.
 */
function addToCart() {
    const productId = document.getElementById("orderProductSelect").value;
    const qty = parseInt(document.getElementById("orderQty").value);
    
    // Find the product in your database to get its price
    const product = window.db.products.find(p => p.id === productId);
    
    if (!product) return alert("Please select a valid product.");
    if (qty <= 0) return alert("Quantity must be at least 1.");

    // Check if the item is already in the cart
    const existingItem = window.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        window.cart.push({
            productId: product.id,
            name: product.name,
            price: product.base_price, // Ensure this field name matches your Supabase table
            qty: qty
        });
    }

    renderCart(); // Refresh the table display
}

function renderCart() {
    const tbody = document.getElementById("cartTableBody");
    let grandTotal = 0;

    tbody.innerHTML = window.cart.map((item, index) => {
        const rowTotal = item.qty * item.price;
        grandTotal += rowTotal;
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${rowTotal.toLocaleString()}</td>
                <td><button onclick="window.cart.splice(${index},1); renderCart();" style="color:red;">Remove</button></td>
            </tr>
        `;
    }).join("");

    document.getElementById("cartGrandTotal").innerText = `Total: KES ${grandTotal.toLocaleString()}`;
}

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