/**
 * ADD PRODUCT
 * Saves a new item to the products table and refreshes UI.
 */
async function addProduct() {
    // 1. Safety Checks
    if (!window.supa || !window.currentUser) {
        return alert("Session expired. Please log in again.");
    }

    const nameInput = document.getElementById("productName");
    const stockInput = document.getElementById("productStock");
    const priceInput = document.getElementById("productBasePrice");
    const feeInput = document.getElementById("productFee");
    const productForm = document.getElementById("productForm");

    if (!nameInput.value.trim()) return alert("Product name is required.");

    // 2. Prepare Payload (Matches renamed 'name' column)
    const payload = {
        name: nameInput.value.trim(),
        stock: Number(stockInput.value) || 0,
        price: Number(priceInput.value) || 0,
        company_fee: Number(feeInput.value) || 0
    };

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
function renderProducts() {
    // Ensure we are looking for the correct tbody ID from your HTML
    const tableBody = document.getElementById("productBody") || document.getElementById("productsTable");
    if (!tableBody || !window.db.products) return;

    const searchTerm = (document.getElementById("productSearch")?.value || "").toLowerCase();

    const filtered = window.db.products.filter(p => 
        (p.name || "").toLowerCase().includes(searchTerm)
    );

    tableBody.innerHTML = filtered.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.stock || 0}</td>
            <td>KES ${Number(p.price).toLocaleString()}</td>
            <td>KES ${Number(p.company_fee).toLocaleString()}</td>
            <td>
                <button class="btn btn-blue" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-red" onclick="deleteProduct('${p.id}')">Delete</button>
            </td>
        </tr>
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