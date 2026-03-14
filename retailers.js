/**
 * RENDER RETAILERS
 * Aligns data correctly: Name | Phone | Location | Action
 */
function renderRetailers() {
    const tbody = document.getElementById("retailerBody");
    if (!tbody) return;

    const searchTerm = document.getElementById("retailerSearch")?.value.toLowerCase() || "";
    
    // Filter from global state
    const retailers = (window.db.retailers || []).filter(r => 
        r.name.toLowerCase().includes(searchTerm) || 
        (r.phone && r.phone.includes(searchTerm))
    );

    // Create rows to match the 4 columns in the HTML
    tbody.innerHTML = retailers.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.phone || 'N/A'}</td>
            <td>${r.location || 'N/A'}</td>
            <td>
                <button class="btn btn-blue" onclick="viewRetailer('${r.id}')" style="padding:2px 5px; font-size:10px;">View</button>
            </td>
        </tr>
    `).join("");
}

/**
 * ADD RETAILER
 * Saves Name, Phone, and Location to Supabase
 */
async function addRetailer() {
    const name = document.getElementById("retailerName").value;
    const phone = document.getElementById("retailerPhone").value;
    const location = document.getElementById("retailerLocation").value;

    if (!name || !phone) return alert("Business Name and Phone are required.");

    const { error } = await supa.from("retailers").insert([{
        name,
        phone,
        location,
        created_by: window.currentUser.id
    }]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Retailer added successfully!");
        // Clear inputs
        document.getElementById("retailerName").value = "";
        document.getElementById("retailerPhone").value = "";
        document.getElementById("retailerLocation").value = "";
        await sync(); // Refresh data using app.js sync
    }
}