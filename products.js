/**
 * ADD PRODUCT
 * Saves a new item to the products table and refreshes UI.
 */
async function addProduct() {
    const name = document.getElementById("productName").value;
    const stock = document.getElementById("productStock").value;
    const price = document.getElementById("base_price").value;
    const fee = document.getElementById("productCompanyFee").value;

    try {
        const { error } = await supa.from("products").insert([{
            name: name,
            stock: parseInt(stock),
            base_price: parseFloat(price),
            company_fee: parseFloat(fee)
        }]);

        if (error) throw error;

        alert("Product Added!");
        clearInputs(['productName', 'productStock', 'base_price', 'productCompanyFee']);
        await sync();
    } catch (err) {
        alert("Error: " + err.message);
    }
}


/**
 * DELETE PRODUCT
 */
async function deleteProduct(id) {
    if (window.currentUser?.role !== 'admin') return alert("Admin access required.");
    
    const inOrders = (window.db.order_items || []).some(item => item.product_id === id);
    if (inOrders) {
        return alert("Cannot delete: This product has sales history. Try renaming it instead.");
    }

    if (!confirm("Delete this product permanently?")) return;

    try {
        const { error } = await supa.from("products").delete().eq("id", id);
        if (error) throw error;
        await sync();
    } catch (err) {
        alert("Delete failed: " + err.message);
    }
}

async function editProduct(id) {
    const newPrice = document.getElementById(`price-${id}`).value;
    const newFee = document.getElementById(`fee-${id}`).value;
    const newStock = document.getElementById(`stock-${id}`).value;

    try {
        const { error } = await supa
            .from("products")
            .update({ 
                // These MUST match your Supabase column names exactly
                base_price: parseFloat(newPrice), 
                company_fee: parseFloat(newFee),
                stock: parseInt(newStock)
            })
            .eq("id", id);

        if (error) throw error;

        alert("Product updated successfully!");
        await sync(); // Refresh the data on the page
    } const { error } = await supa
    .from("products")
    .update({ 
        base_price: parseFloat(newPrice), // Use lowercase/snake_case
        company_fee: parseFloat(newFee),
        stock: parseInt(newStock)
    })
    .eq("id", id);
}