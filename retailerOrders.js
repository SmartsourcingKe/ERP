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

    const existingItem = window.cart.find(item => item.product_id === productId);
    
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
                product_id: item.product_id, // Fixed from item.product_id
                quantity: item.qty,
                price_at_sale: item.price // This now includes the fee
            }]);

            // Deduct stock
            const originalProd = window.db.products.find(p => p.id === item.product_id);
            if (originalProd) {
                const newStock = (originalProd.stock || 0) - item.qty;
                await supa.from("products").update({ stock: newStock }).eq("id", item.product_id);
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