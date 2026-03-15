/**
 * ADD PRODUCT
 * Saves a new item to the products table and refreshes UI.
 */
async function addProduct() {
    const nameInput = document.getElementById("productName");
    const stockInput = document.getElementById("productStock");
    const priceInput = document.getElementById("productBasePrice");
    const feeInput = document.getElementById("productCompanyFee"); // Fixed ID

    if (!nameInput.value.trim()) return alert("Product name is required.");
    
    const payload = {
        name: nameInput.value.trim(),
        stock: Number(stockInput.value) || 0,
        price: Number(priceInput.value) || 0,
        company_fee: Number(feeInput.value) || 0
    };

const productForm = document.getElementById("productForm");
if (productForm) {
    productForm.reset();
} else {
    // Manually clear if no form wrapper exists
    document.getElementById("productName").value = "";
    document.getElementById("productStock").value = "";
    document.getElementById("productBasePrice").value = "";
    document.getElementById("productCompanyFee").value = "";
}

    try {
        // 3. Insert to Supabase
        const { error } = await supa.from("products").insert([payload]);
        if (error) throw error;

        // 4. Success Flow
        alert("Product added successfully");

        // Reset form safely
        if (productForm) {
            productForm.reset();
        } else {
            nameInput.value = "";
            stockInput.value = "";
            priceInput.value = "";
            feeInput.value = "";
        }

        // 5. REFRESH: Pull fresh data and redraw UI
        await sync(); 

    } catch (err) {
        console.error("Product Insert Error:", err);
        alert("Error: " + (err.message || "Failed to save product"));
    }
}

/**
 * RENDER PRODUCTS TABLE
* Uses the global window.db.products
 */
/**
 * RENDER PRODUCTS
 * Pulls data from window.db.products
 */
function renderProducts() {
    const container = document.getElementById("inventoryGrid");
    if (!container) return;

    const products = window.db.products || [];
    if (products.length === 0) {
        container.innerHTML = '<div class="no-data">No products available in inventory.</div>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-info">
                <h4>${product.name}</h4>
                <p class="sku">ID: ${product.id.slice(0,8)}</p>
                <p class="price">KES ${Number(product.price).toLocaleString()}</p>
                <p class="stock">Stock: <span class="${product.stock < 10 ? 'text-red' : ''}">${product.stock}</span></p>
            </div>
            <div class="product-actions">
                <button onclick="editProduct('${product.id}')" class="btn-edit">Edit Stock</button>
            </div>
        </div>
    `).join("");
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