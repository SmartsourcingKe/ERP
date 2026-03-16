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
    const product = window.db.products.find(p => p.id === id);
    if (!product) return;

    const newStock = prompt(`Update stock for ${product.name}:`, product.stock);
    
    if (newStock !== null && !isNaN(newStock)) {
        try {
            const { error } = await supa
                .from("products")
                .update({ stock: parseInt(newStock) })
                .eq("id", id);

            if (error) throw error;

            alert("Stock updated successfully!");
            await sync(); // Refresh data and UI
        } catch (err) {
            console.error("Update Error:", err);
            alert("Failed to update: " + err.message);
        }
    }
}