/**
 * ADD TO CART
 * Handles inventory checks and local cart state.
 */
function addToCart() {
    const productId = document.getElementById("orderProductSelect").value;
    const qty = parseInt(document.getElementById("orderQty").value);
    
    // Find product to get both base_price and company_fee
    const product = window.db.products.find(p => p.id === productId);
    
    if (!product) return alert("Please select a valid product.");
    if (qty <= 0) return alert("Quantity must be at least 1.");

    // CALCULATION: Selling Price + Company Fee
    const basePrice = Number(product.base_price || 0);
    const companyFee = Number(product.company_fee || 0);
    const totalUnitPrice = basePrice + companyFee;

    const existingItem = window.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        window.cart.push({
            productId: product.id,
            name: product.name,
            price: totalUnitPrice, // Storing the combined price
            qty: qty
        });
    }

    renderCart(); 
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
            // Save item with the combined price
            await supa.from("order_items").insert([{
                order_id: order.id,
                product_id: item.productId, // Fixed from item.product_id
                quantity: item.qty,
                price_at_sale: item.price // This now includes the fee
            }]);

            // Deduct stock
            const originalProd = window.db.products.find(p => p.id === item.productId);
            if (originalProd) {
                const newStock = (originalProd.stock || 0) - item.qty;
                await supa.from("products").update({ stock: newStock }).eq("id", item.productId);
            }
        }

        alert("Order created successfully!");
        window.cart = [];
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
async function showOnScreenReceipt(orderId, type = 'retailer') {
    // 1. Get the Order and Branding
    const brand = window.db.branding || { company_name: "SmartsourcingKe ERP", tagline: "Quality Service" };
    const order = type === 'retailer' 
        ? window.db.orders.find(o => o.id === orderId)
        : window.db.corporate_orders.find(o => o.id === orderId);

    if (!order) return alert("Order not found");

    // 2. Fetch the Items FIRST (Asynchronous)
    const table = type === 'retailer' ? 'order_items' : 'corporate_order_items';
    const { data: items, error } = await supa
        .from(table)
        .select('*, products(name)')
        .eq('order_id', orderId);

    if (error) return alert("Error loading items: " + error.message);

    // 3. Map the items into HTML rows
    const itemsHtml = items.map(item => {
        // Use price_at_sale (Retail) or subtotal (Corporate)
        const total = item.subtotal || (item.quantity * (item.price_at_sale || 0));
        const name = item.products?.name || item.grade || "Item";
        const qty = item.quantity || item.student_count || 0;

        return `
            <tr>
                <td>${name}</td>
                <td>${qty}</td>
                <td style="text-align: right;">KES ${Number(total).toLocaleString()}</td>
            </tr>
        `;
    }).join("");

    // 4. Build the Final Branded HTML
    const receiptDiv = document.getElementById("receiptContent");
    receiptDiv.innerHTML = `
        <div style="position: relative; padding: 20px; border: 1px solid #eee; background: white; font-family: 'Courier New', Courier, monospace; color: #333;">
            ${brand.bg_url ? `<img src="${brand.bg_url}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; opacity: 0.08; z-index: 0; pointer-events: none;">` : ''}

            <div style="text-align: center; position: relative; z-index: 1; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 15px;">
                ${brand.logo_url ? `<img src="${brand.logo_url}" style="max-height: 60px; margin-bottom: 5px;"><br>` : ''}
                <h2 style="margin: 0; text-transform: uppercase;">${brand.company_name}</h2>
                <small><em>${brand.tagline}</em></small>
            </div>

            <div style="position: relative; z-index: 1;">
                <p><strong>Receipt No:</strong> ${order.id.slice(0,8).toUpperCase()}</p>
                <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                <hr style="border: none; border-top: 1px dashed #333;">
                
                <table style="width: 100%; text-align: left; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="border-bottom: 1px solid #333;">Item</th>
                            <th style="border-bottom: 1px solid #333;">Qty</th>
                            <th style="border-bottom: 1px solid #333; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <hr style="border: none; border-top: 2px solid #333; margin-top: 15px;">
                <div style="text-align: right; font-size: 1.2em;">
                    <strong>GRAND TOTAL: KES ${Number(order.total).toLocaleString()}</strong>
                </div>
            </div>

            <div style="margin-top: 30px; text-align: center; position: relative; z-index: 1;">
                <div style="width: 150px; border-bottom: 1px solid #333; margin: 10px auto;"></div>
                <p style="font-size: 10px;">AUTHORIZED SIGNATURE & STAMP</p>
                <p style="font-size: 12px; margin-top: 15px;">Thank you for your business!</p>
            </div>
        </div>
    `;

    document.getElementById("receiptModal").classList.remove("hidden");
}

async function viewReceipt(orderId, type) {
    // 1. Get order details from your local database
    const order = window.db.orders.find(o => o.id === orderId);
    if (!order) return alert("Order data not found locally.");

    try {
        // 2. Fetch the specific items for this order
        const { data: items, error } = await supa
            .from('order_items')
            .select('*, products(name)')
            .eq('order_id', orderId);

        if (error) throw error;

        // 3. Fill the Modal
        const itemsBody = document.getElementById("receiptItemsBody");
        itemsBody.innerHTML = items.map(item => {
            // Use price_at_sale if it exists, otherwise fallback to the current product price
            const unitPrice = item.price_at_sale || (item.products?.base_price || 0);
            return `
                <tr>
                    <td style="text-align:left; padding: 5px;">${item.products?.name || 'Item'}</td>
                    <td style="text-align:center;">${item.quantity}</td>
                    <td style="text-align:right;">${unitPrice.toLocaleString()}</td>
                    <td style="text-align:right;">${(item.quantity * unitPrice).toLocaleString()}</td>
                </tr>
            `;
        }).join("");

        // 4. Update Header and Totals
        document.getElementById("receiptGrandTotal").textContent = `TOTAL: KES ${order.total.toLocaleString()}`;
        document.getElementById("receiptCompanyName").textContent = window.db.branding?.company_name || "SmartsourcingKe";
        
        // 5. Show and Print
        document.getElementById("receiptModal").classList.remove("hidden");
    } catch (err) {
        console.error("Receipt Error:", err);
        alert("Failed to generate receipt: " + err.message);
    }
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