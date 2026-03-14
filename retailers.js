/**
 * RENDER RETAILERS
 * Aligns Name, Phone, and Location to match the 3 columns in index.html
 */
function renderRetailers() {
    const tbody = document.getElementById("retailerBody");
    if (!tbody) return;

    const searchTerm = document.getElementById("retailerSearch")?.value.toLowerCase() || "";
    
    // Filter retailers based on search input
    const retailers = (window.db.retailers || []).filter(r => 
        r.name.toLowerCase().includes(searchTerm) || 
        (r.phone && r.phone.includes(searchTerm))
    );

    // Generate rows to match the <thead>: Name | Phone | Location
    tbody.innerHTML = retailers.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.phone || 'N/A'}</td>
            <td>${r.location || 'N/A'}</td>
        </tr>
    `).join("");
}

/**
 * ADD RETAILER
 * Correctly captures Name, Phone, and Location from the new inputs
 */
async function addRetailer() {
    const name = document.getElementById("retailerName").value;
    const phone = document.getElementById("retailerPhone").value;
    const location = document.getElementById("retailerLocation").value;

    if (!name || !phone) {
        alert("Please enter at least a Name and Phone number.");
        return;
    }

    const { error } = await supa.from("retailers").insert([{
        name: name,
        phone: phone,
        location: location,
        created_by: window.currentUser.id
    }]);

    if (error) {
        alert("Error saving retailer: " + error.message);
    } else {
        alert("Retailer saved successfully!");
        // Clear inputs
        document.getElementById("retailerName").value = "";
        document.getElementById("retailerPhone").value = "";
        document.getElementById("retailerLocation").value = "";
        await sync(); // Refresh data and redraw table
    }
}