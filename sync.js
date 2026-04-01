/**
 * SYNC DATA FROM SUPABASE
 * Fetches all tables in parallel and updates the global window.db cache.
 */
async function sync() {
    console.log("Starting Data Sync...");
    
    // Ensure the database object exists
    if (!window.db) window.db = {};

    const tables = {
        users: () => supa.from("users").select("*"),
        products: () => supa.from("products").select("*"),
        retailers: () => supa.from("retailers").select("*"),
        orders: () => supa.from("orders").select("*").order("created_at", { ascending: false }),
        order_items: () => supa.from("order_items").select("*"),
        schools: () => supa.from("schools").select("*"),
        corporate_orders: () => supa.from("corporate_orders").select("*").order("created_at", { ascending: false }),
        corporate_order_items: () => supa.from("corporate_order_items").select("*"),
        payroll: () => supa.from("payroll").select("*"),
        messages: () => supa.from("messages").select("*").order("created_at", { ascending: true }),
        employee_finance: () => supa.from("employee_finance").select("*"),
        branding: () => supa.from("branding").select("*").limit(1) // Avoids the 406 error
    };

    const keys = Object.keys(tables);

    try {
        // Run all requests at once for speed
        const responses = await Promise.allSettled(keys.map(k => tables[k]()));

        responses.forEach((result, i) => {
            const key = keys[i];

            // If a specific table fails (like the 406 error on branding)
            if (result.status === "rejected" || result.value.error) {
                console.warn(`SYNC WARNING [${key}]:`, result.reason || result.value.error.message);
                
                // Fallback: Don't let a single table crash the whole app
                if (key === "branding") {
                    window.db.branding = { company_name: "SmartsourcingKe" };
                } else {
                    window.db[key] = [];
                }
                return;
            }

            // Success Path
            const data = result.value.data;
            if (key === "branding") {
                window.db.branding = data?.[0] || { company_name: "SmartsourcingKe" };
                window.branding = window.db.branding; // Compatibility
            } else {
                window.db[key] = data || [];
            }
        });

        console.log("Sync Complete. Data loaded into window.db");
        window.dataLoaded = true;

        // Trigger UI updates
        if (typeof triggerUIUpdates === "function") {
            await triggerUIUpdates();
        } else if (typeof renderAll === "function") {
            renderAll();
        }

    } catch (err) {
        console.error("Critical Sync Failure:", err);
    }
}

async function triggerUIUpdates() {
    // Define your render tasks with optional "requiredData" checks
    const renderTasks = [
        { name: "renderUserDropdown", fn: typeof renderUserDropdown === "function" ? renderUserDropdown : null },
        { name: "renderMessages", fn: typeof renderMessages === "function" ? renderMessages : null },
        { 
            name: "renderAll", 
            fn: typeof renderAll === "function" ? renderAll : null,
            requiredData: () => typeof branding !== "undefined"  // Only run if branding exists
        }
    ];

    for (const task of renderTasks) {
        if (!task.fn) continue;

        // Check if requiredData exists
        if (task.requiredData && !task.requiredData()) {
            console.warn(`${task.name} skipped: required data not ready`);
            continue;
        }

        try {
            await task.fn(); // support async render functions
        } catch (err) {
            console.error(`Error running ${task.name}:`, err);
        }
    }
}