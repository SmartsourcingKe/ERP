/**
 * ADD PRODUCT
 * Saves a new item to the products table and refreshes UI.
 */
async function addProduct() {
    const name = document.getElementById("productName").value;
    const stock = Number(document.getElementById("productStock").value);
    const price = Number(document.getElementById("productBasePrice").value);
    const fee = Number(document.getElementById("productCompanyFee").value);

    if (!name || stock < 0 || price <= 0) {
        return alert("Please fill in all product details correctly.");
    }

    try {
        const { error } = await supa.from("products").insert([{
            name: name,
            stock: stock,
            base_price: price,
            company_fee: fee
        }]);

        if (error) throw error;

        alert("Product added successfully!");

        // Clear inputs
        document.getElementById("productName").value = "";
        document.getElementById("productStock").value = "";
        document.getElementById("productBasePrice").value = "";
        document.getElementById("productCompanyFee").value = "";

        // REFRESH DATA & LIST
        await sync(); 
        if (typeof renderProducts === "function") {
            renderProducts(); 
        } else {
            // Fallback if function is in render.js
            await renderInventory(); 
        }
    } catch (err) {
        alert("Error adding product: " + err.message);
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
    // Get the new values from the input fields in the card
    const newPrice = document.getElementById(`price-${id}`).value;
    const newFee = document.getElementById(`fee-${id}`).value;
    const newStock = document.getElementById(`stock-${id}`).value;

    // Basic validation
    if (newPrice === "" || newFee === "" || newStock === "") {
        return alert("Please ensure all fields are filled out.");
    }

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
        
        // This refreshes your data so the rest of the app sees the new price
        if (typeof sync === 'function') {
            await sync(); 
        }
    } catch (err) {
        console.error("Update Error:", err);
        alert("Failed to update: " + err.message);
    }
}