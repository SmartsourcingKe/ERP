/**
 * ADD PRODUCT
 */
async function addProduct() {
    const name = document.getElementById("addProductName").value;
    const stock = document.getElementById("productStock").value;
    const price = document.getElementById("productBasePrice").value;
    const fee = document.getElementById("productFee").value;

    try {
        const { error } = await supa.from("products").insert([{
            name: name,
            stock: parseInt(stock),
            base_price: parseFloat(price), 
            company_fee: parseFloat(fee)
        }]);

        if (error) throw error;
        
        alert("Product saved!");
        await refreshProductSystem(); // Unified refresh
    } catch (err) {
        alert("Failed to save: " + err.message);
    }
}

/**
 * EDIT PRODUCT
 */
async function editProduct(id) {
    const newPrice = document.getElementById(`price-${id}`).value;
    const newFee = document.getElementById(`fee-${id}`).value;
    const newStock = document.getElementById(`stock-${id}`).value;

    try {
        const { error } = await supa
            .from("products")
            .update({ 
                base_price: parseFloat(newPrice), 
                company_fee: parseFloat(newFee),
                stock: parseInt(newStock)
            })
            .eq("id", id);

        if (error) throw error;

        alert("Product updated successfully!");
        
        // CRITICAL: Refresh the data and the UI
        await sync(); 
        if (typeof renderProducts === "function") renderProducts();
        if (typeof renderPosItems === "function") renderPosItems(); // For the Retailer Order dropdown
        
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