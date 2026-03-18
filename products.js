/**
 * ADD PRODUCT
 */
async function addProduct() {
    const name = document.getElementById("productName").value;
    const stock = document.getElementById("productStock").value;
    const price = document.getElementById("productBasePrice").value;
    const fee = document.getElementById("productCompanyFee").value;

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
 * DELETE PRODUCT
 */
async function deleteProduct(id) {
    // Stage 1: Permission Check
    if (window.currentUser?.role !== 'admin') return alert("Admin access required.");
    
    // Stage 2: Integrity Check (Prevents breaking old order records)
    const inOrders = (window.db?.order_items || []).some(item => item.product_id === id);
    if (inOrders) {
        return alert("Cannot delete: This product has sales history. Archive or rename it instead.");
    }

    if (!confirm("Delete this product permanently?")) return;

    try {
        const { error } = await supa.from("products").delete().eq("id", id);
        if (error) throw error;
        
        alert("Product deleted.");
        await refreshProductSystem();
    } catch (err) {
        alert("Delete failed: " + err.message);
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
        await refreshProductSystem();
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