/**
 * RENDER ORDERS
 * Displays history and ensures the "Action" column has the View/Receipt buttons.
 */
function renderOrders() {
    const tbody = document.getElementById("ordersBody"); // Matches your index.html ID
    if (!tbody) return;

    const searchTerm = document.getElementById("orderSearch")?.value.toLowerCase() || "";
    
    // Get orders from global DB and sort by newest first
    const orders = (window.db.orders || []).filter(o => 
        o.id.toLowerCase().includes(searchTerm) || 
        (o.retailer_name && o.retailer_name.toLowerCase().includes(searchTerm))
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        // Find retailer name if not directly in order object
        const retailer = window.db.retailers?.find(r => r.id === order.retailer_id);
        const retailerName = retailer ? retailer.name : (order.retailer_name || "Unknown");

        return `
            <tr>
                <td>${order.id.slice(0, 8)}</td>
                <td>${retailerName}</td>
                <td>KES ${order.total || 0}</td>
                <td><span class="status-badge ${order.status}">${order.status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-blue" onclick="viewOrderDetails('${order.id}')" style="padding:2px 5px; font-size:10px;">View</button>
                    ${order.status === 'disbursed' ? 
                        `<button class="btn btn-green" onclick="generateAndStoreReceipt('${order.id}')" style="padding:2px 5px; font-size:10px;">Receipt</button>` 
                        : ''}
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * CREATE ORDER
 * Updated to force a refresh so it shows in history immediately.
 */
async function createOrder() {
    if (window.cart.length === 0) return alert("Cart is empty!");
    const retailerId = document.getElementById("retailerSelect").value;
    if (!retailerId) return alert("Select a retailer!");

    const total = window.cart.reduce((sum, item) => sum + (item.qty * item.selling_price), 0);

    // 1. Insert the Order
    const { data: order, error: orderError } = await supa.from("orders").insert([{
        retailer_id: retailerId,
        total: total,
        status: 'pending',
        created_by: window.currentUser.id
    }]).select().single();

    if (orderError) return alert("Order Error: " + orderError.message);

    // 2. Insert Order Items
    const itemsToInsert = window.cart.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.qty,
        price: item.selling_price
    }));

    const { error: itemsError } = await supa.from("order_items").insert(itemsToInsert);
    
    if (itemsError) {
        alert("Items Error: " + itemsError.message);
    } else {
        alert("Order #" + order.id.slice(0,8) + " created successfully!");
        window.cart = []; // Clear cart
        if (typeof renderCart === "function") renderCart();
        
        // IMPORTANT: Sync and Refresh
        await sync(); 
        renderOrders(); 
    }
}