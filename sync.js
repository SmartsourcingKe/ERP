/**
 * SYNC DATA FROM SUPABASE
 * Fetches all tables in parallel and updates the global window.db cache.
 */
async function sync() {
    if (!window.supa) {
        console.error("Sync aborted: Supabase client not initialized.");
        return;
    }

    // Ensure db structure exists
    if (!window.db) window.db = {};

    // Map of tables to their Supabase queries
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
        branding: () => supa.from("branding").select("*").maybeSingle()
    };

    const keys = Object.keys(tables);

    try {
        // Fetch everything at once for maximum speed
        const responses = await Promise.allSettled(keys.map(k => tables[k]()));

        responses.forEach((result, i) => {
            const key = keys[i];

            // Handle Promise Rejection
            if (result.status === "rejected") {
                console.error(`SYNC REJECTED [${key}]:`, result.reason);
                db[key] = (key === "branding") ? null : [];
                return;
            }

            const res = result.value;

            // Handle Supabase Error Response
            if (res.error) {
                console.error(`SYNC DATABASE ERROR [${key}]:`, res.error.message);
                db[key] = (key === "branding") ? null : [];
                return;
            }

            // Assign data (defaulting to empty array/null if empty)
            db[key] = (key === "branding") ? (res.data || null) : (res.data || []);
            
            if (key !== "branding") {
                console.log(`SYNC OK [${key}]: ${db[key].length} records`);
            }
        });

        // Trigger UI updates safely
        triggerUIUpdates();
        window.dataLoaded = true;

    } catch (err) {
        console.error("Global Sync Failure:", err);
    }
	const { data: corpOrders } = await supa.from("corporate_orders").select("*");
    window.db.corporate_orders = corpOrders;
    
    // Call the specific renderers
    renderSchools();
    renderCorporateHistory(); // Create this to show the table in image_20cc22.png
}

/**
 * TRIGGER UI UPDATES
 * Helper to call render functions only if they are defined.
 */
function triggerUIUpdates() {
    const renderTasks = [
        { name: "renderUserDropdown", fn: typeof renderUserDropdown === "function" ? renderUserDropdown : null },
        { name: "renderMessages", fn: typeof renderMessages === "function" ? renderMessages : null },
        { name: "renderAll", fn: typeof renderAll === "function" ? renderAll : null }
    ];

    renderTasks.forEach(task => {
        if (task.fn) {
            try {
                task.fn();
            } catch (e) {
                console.error(`Render Error in ${task.name}:`, e);
            }
        }
    });
}