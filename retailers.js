/**
 * ADD RETAILER
 * Saves new retailer info to the database.
 */
async function addRetailer() {
    if (!window.supa) return;

    // Direct DOM selection for stability
    const nameEl = document.getElementById("retailerName");
    const phoneEl = document.getElementById("retailerPhone");
    const locEl = document.getElementById("retailerLocation");
    const kycEl = document.getElementById("retailerKyc");

    if (!nameEl?.value.trim()) return alert("Enter retailer name");

    const payload = {
        name: nameEl.value.trim(),
        phone: phoneEl?.value || "",
        location: locEl?.value || "",
        kyc_id: kycEl?.value || ""
    };

    try {
        const { error } = await supa.from("retailers").insert([payload]);
        if (error) throw error;

        // Clear inputs
        [nameEl, phoneEl, locEl, kycEl].forEach(el => { if(el) el.value = ""; });
        
        await sync();
        alert("Retailer added successfully");
    } catch (err) {
        alert("Error: " + err.message);
    }
}

/**
 * RENDER RETAILERS TABLE
 * Includes search filtering and action buttons.
 */
function renderRetailers() {
    const tbody = document.getElementById("retailerBody");
    if (!tbody) return;

    // Fix: Always check if the data exists first
    const data = window.db.retailers || [];
    const search = document.getElementById("retailerSearch")?.value.toLowerCase() || "";

    const filtered = data.filter(r => 
        r.name?.toLowerCase().includes(search) || 
        r.phone?.includes(search)
    );

    tbody.innerHTML = filtered.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.phone}</td>
            <td>${r.location}</td>
        </tr>
    `).join("");
}

/**
 * RENDER RETAILER DROPDOWN
 * Updates the select input used in the Order creation form.
 */
function renderRetailerDropdown() {
    const select = document.getElementById("retailerSelect");
    if (!select || !db.retailers) return;

    const options = db.retailers.map(r => 
        `<option value="${r.id}">${r.name} (${r.location || 'No Loc'})</option>`
    ).join("");

    select.innerHTML = '<option value="">Select Retailer</option>' + options;
}

/**
 * DELETE RETAILER
 * Prevents deletion if the retailer has order history.
 */
async function deleteRetailer(id) {
    if (window.currentUser?.role !== 'admin') return alert("Admin only");

    // Integrity Check: See if retailer has orders
    const hasOrders = (db.orders || []).some(o => o.retailer_id === id);
    if (hasOrders) {
        return alert("Cannot delete: This retailer has order history. Try renaming them to 'Inactive' instead.");
    }

    if (!confirm("Are you sure you want to delete this retailer?")) return;

    try {
        const { error } = await supa.from("retailers").delete().eq("id", id);
        if (error) throw error;
        await sync();
    } catch (err) {
        alert("Delete failed: " + err.message);
    }
}