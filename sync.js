/**
 * SYNC DATA FROM SUPABASE
 * Fetches all tables in parallel and updates the global window.db cache.
 */
async function sync() {
    try {
        // Example: load branding from Supabase
        // Inside sync() function in sync.js
const { data: brandingData, error: bError } = await supa.from("branding").select("*").single();

if (!bError) {
    window.db.branding = brandingData; // Store it in window.db to match render.js
    window.branding = brandingData;    // Keep this for backward compatibility
}

    if (!window.db) {
        window.db = {};
    }

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
        branding: () => supa.from("branding").select("*").limit(1),
    };

    const keys = Object.keys(tables);

    try {
        const responses = await Promise.allSettled(keys.map(k => tables[k]()));

        responses.forEach((result, i) => {
            const key = keys[i];

            if (result.status === "rejected") {
                console.error(`SYNC REJECTED [${key}]:`, result.reason);
                window.db[key] = key === "branding" ? {} : [];
                return;
            }

            const res = result.value;

            if (res.error) {
                console.error(`SYNC ERROR [${key}]:`, res.error.message);
                window.db[key] = key === "branding" ? {} : [];
                return;
            }

            const data = res.data || [];

            if (key === "branding") {
    window.db.branding = res.data?.[0] || {};
} else {
    window.db[key] = res.data || [];
}
        });

        if (typeof triggerUIUpdates === "function") {
            triggerUIUpdates();
        } else if (typeof renderAll === "function") {
            renderAll();
        }

        window.dataLoaded = true;

    } catch (err) {
        console.error("Global Sync Failure:", err);
    }
	await triggerUIUpdates();
    } catch (err) {
        console.error("SYNC FAILED:", err);
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