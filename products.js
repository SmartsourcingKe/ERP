/**
 * ADD PRODUCT
 * Saves a new item to the products table.
 */
async function addProduct() {
    if (!window.supa || !window.currentUser) return;

    // These IDs now match your index.html exactly
    const nameInput = document.getElementById("productName");
    const stockInput = document.getElementById("productStock");
    const priceInput = document.getElementById("productBasePrice"); // Fixed ID
    const feeInput = document.getElementById("productFee");

    if (!nameInput.value.trim()) return alert("Product name is required.");

    const payload = {
        name: nameInput.value.trim(),
        stock: Number(stockInput.value) || 0, // Added stock
        price: Number(priceInput.value) || 0,
        company_fee: Number(feeInput.value) || 0
    };

    try {
        const { error } = await supa.from("products").insert([payload]);
        if (error) throw error;

        // Reset inputs
        nameInput.value = "";
        stockInput.value = "";
        priceInput.value = "";
        feeInput.value = "";

        await sync();
        alert("Product added successfully");
    } catch (err) {
        console.error("Product Insert Error:", err);
        alert("Error: " + err.message);
    }
	
	if (error) throw error;

        // THE FIX: Immediately refresh the data and UI
        await sync(); // Fetch latest from Supabase
        renderAll();  // Redraw everything
        
        // Clear the form
        document.getElementById("productForm").reset();
        alert("Product added successfully!");
	
}
/**
 * RENDER PRODUCTS TABLE
 * Handles both the initial load and the live search filtering.
 */
function renderProducts() {
    const table = document.getElementById("productsTable");
    if (!table || !db.products) return;

    const searchTerm = (document.getElementById("productSearch")?.value || "").toLowerCase();

    const filtered = db.products.filter(p => 
        p.name.toLowerCase().includes(searchTerm)
    );

    table.innerHTML = filtered.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${Number(p.price).toLocaleString()}</td>
            <td>${Number(p.company_fee).toLocaleString()}</td>
            <td>
                <button class="btn btn-blue" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-red" onclick="deleteProduct('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join("");
}

/**
 * DELETE PRODUCT
 * Checks for order history before allowing deletion to maintain data integrity.
 */
async function deleteProduct(id) {
    if (window.currentUser?.role !== 'admin') return alert("Admin only");
    
    // Safety Check: Check if product is in order_items
    const inOrders = (db.order_items || []).some(item => item.product_id === id);
    if (inOrders) {
        return alert("Cannot delete: This product is linked to existing orders. Try renaming it instead.");
    }

    if (!confirm("Are you sure you want to permanently delete this product?")) return;

    const { error } = await supa.from("products").delete().eq("id", id);
    if (error) {
        alert("Delete failed: " + error.message);
    } else {
        await sync();
    }
}

/**
 * EDIT PRODUCT
 * Uses a cleaner flow than prompt for price/fee updates.
 */
async function editProduct(id) {
    const product = db.products.find(p => p.id === id);
    if (!product) return;

    const newName = prompt("Update Product Name:", product.name);
    if (newName === null) return; // Cancelled

    const newPrice = prompt("Update Price:", product.price);
    const newFee = prompt("Update Company Fee:", product.company_fee);

    try {
        const { error } = await supa.from("products")
            .update({
                name: newName,
                price: Number(newPrice) || 0,
                company_fee: Number(newFee) || 0
            })
            .eq("id", id);

        if (error) throw error;
        await sync();
    } catch (err) {
        alert("Update failed: " + err.message);
    }
}

// Global search listener attachment
const prodSearch = document.getElementById("productSearch");
if(prodSearch) prodSearch.addEventListener("input", renderProducts);