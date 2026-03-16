
async function addRetailer() {
    const name = document.getElementById("retailerName").value.trim();
    const phone = document.getElementById("retailerPhone").value.trim();
    const location = document.getElementById("retailerLocation").value.trim();

    if (!name || !phone) {
        return alert("Please enter at least a name and phone number.");
    }

    try {
        const { error } = await supa.from("retailers").insert([{ 
            name, 
            phone, 
            location,
            created_by: window.currentUser.id 
        }]);

        if (error) throw error;

        alert("Retailer saved successfully!");
        
        // Clear the input fields
        document.getElementById("retailerName").value = "";
        document.getElementById("retailerPhone").value = "";
        document.getElementById("retailerLocation").value = "";

        // REFRESH DATA: This makes the new retailer appear in the list
        await sync(); 
        renderRetailers(); 
    } catch (err) {
        console.error("Error saving retailer:", err.message);
        alert("Save failed: " + err.message);
    }
}

function viewRetailer(id) {
    const retailer = window.db.retailers.find(r => r.id === id);
    if (retailer) {
        alert(`Retailer: ${retailer.name}\nPhone: ${retailer.phone}\nLocation: ${retailer.location}`);
    }
}