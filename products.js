
async function addProduct() {
    const name = document.getElementById("newProductName").value;
    const price = document.getElementById("newProductPrice").value; // This is the Base Price (Cost)
    const fee = document.getElementById("newProductFee").value;     // This is your Profit Margin
    const stock = document.getElementById("newProductStock").value;

    if (!name) return alert("Product name required");

    try {
        // Calculate the Selling Price automatically for the UI
        // Selling Price = Base Price + Company Fee
        const { error } = await supa.from("products").insert([{
            name: name,
            base_price: parseFloat(price) || 0,
            company_fee: parseFloat(fee) || 0,
            price: (parseFloat(price) || 0) + (parseFloat(fee) || 0), // Total price shown to customers
            stock: parseInt(stock) || 0
        }]);

        if (error) throw error;

        alert("Product added successfully with profit tracking ✅");
        
        // Reset form
        document.getElementById("newProductName").value = "";
        document.getElementById("newProductPrice").value = "";
        document.getElementById("newProductFee").value = "";
        
        await sync();
        if (typeof renderAll === "function") renderAll();

    } catch (err) {
        console.error(err);
        alert("Failed to add product: " + err.message);
    }
}

/**
 * EDIT PRODUCT
 */
async function editProduct(id) {
    const newPrice = parseFloat(document.getElementById(`price-${id}`).value) || 0;
    const newFee = parseFloat(document.getElementById(`fee-${id}`).value) || 0;
    const newStock = parseInt(document.getElementById(`stock-${id}`).value) || 0;

    try {
        const { error } = await supa
            .from("products")
            .update({ 
                base_price: newPrice, 
                company_fee: newFee,
                stock: newStock
            })
            .eq("id", id); // ✅ FIXED: removed broken semicolon

        if (error) throw error;

        alert("Product updated successfully!");
        
        // CRITICAL: Refresh the data and the UI
        await refreshProductSystem(); // ✅ FIXED typo
        
    } catch (err) {
        console.error("Update Error:", err);
        alert("Failed to update: " + err.message);
    }
}

/**
 * HELPER: UI REFRESH
 * Ensures that changes reflect in inventory lists and order dropdowns
 */
async function refreshProductSystem() {
    await sync(); // Pull fresh data from Supabase
    
    // Trigger your specific render functions
    if (typeof renderProducts === "function") renderProducts();
    if (typeof renderPosItems === "function") renderPosItems();
    if (typeof renderCorporateOrderForm === "function") renderCorporateOrderForm();
    
    console.log("Product system synchronized.");
}

async function deleteProduct(id) {
    // 1. Improved Role Check: Ensure we check the current local state
    const userRole = window.currentUser?.role;
    console.log("Attempting delete. Current role:", userRole);

    if (userRole !== 'admin') {
        return alert(`Admin access required. Your current role is: ${userRole || 'Unknown'}`);
    }
    
    // 2. Safety: Check if this product is linked to any existing order items
    const inOrders = (window.db?.order_items || []).some(item => item.product_id === id);
    if (inOrders) {
        return alert("Cannot delete: This product has sales history. Try renaming or archiving it instead.");
    }

    if (!confirm("Are you sure you want to delete this product permanently?")) return;

    try {
        const { error } = await supa.from("products").delete().eq("id", id);
        if (error) throw error;
        
        alert("Product removed from inventory.");
        
        // 3. Refresh the global data and all UI components
        await sync();
        if (typeof renderAll === "function") renderAll();
        
    } catch (err) {
        console.error("Delete Error:", err);
        alert("Delete failed: " + err.message);
    }
}

window.renderProducts = renderProducts;