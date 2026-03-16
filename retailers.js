
async function addRetailer() {
    const name = document.getElementById("retailerName").value.trim();
    const phone = document.getElementById("retailerPhone").value.trim();
    const location = document.getElementById("retailerLocation").value.trim();

    if (!name || !phone) return alert("Name and Phone are required.");

    try {
        const { error } = await supa.from("retailers").insert([{ 
            name: name, 
            phone: phone, 
            location: location,
            // Use the ID of the person currently logged in
            created_by: window.currentUser.id 
        }]);

        if (error) throw error;

        alert("Retailer saved!");
        await sync(); // Refresh the list immediately
        renderRetailers(); 
    } catch (err) {
        console.error(err);
        alert("Save failed: " + err.message);
    }
}

function viewRetailer(id) {
    const retailer = window.db.retailers.find(r => r.id === id);
    if (retailer) {
        alert(`Retailer: ${retailer.name}\nPhone: ${retailer.phone}\nLocation: ${retailer.location}`);
    }
}