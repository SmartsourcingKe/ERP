async function sync() {

  if(!window.supa){
    console.error("Supabase client not initialized");
    return;
  }

  if(!window.db){
    window.db = {};
  }

  const tables = {
    users: () => supa.from("users").select("*"),
    products: () => supa.from("products").select("*"),
    retailers: () => supa.from("retailers").select("*"),
    orders: () => supa.from("orders").select("*").order("created_at", { ascending:false }),
    order_items: () => supa.from("order_items").select("*"),
    schools: () => supa.from("schools").select("*"),
    corporate_orders: () => supa.from("corporate_orders").select("*").order("created_at",{ ascending:false }),
    corporate_order_items: () => supa.from("corporate_order_items").select("*"),
    payroll: () => supa.from("payroll").select("*"),
    messages: () => supa.from("messages").select("*"),
    employee_finance: () => supa.from("employee_finance").select("*"),
    branding: () => supa.from("branding").select("*").maybeSingle()
  };

  const keys = Object.keys(tables || {});

  const responses = await Promise.allSettled(
    keys.map(k => tables[k]())
  );

  responses.forEach((result, i) => {

    const key = keys[i];

    if (result.status === "rejected") {
      console.error(`SYNC QUERY FAILED [${key}]`, result.reason);
      db[key] = key === "branding" ? null : [];
      return;
    }

    const res = result.value;

    if (res.error) {
      console.error(`SYNC TABLE ERROR [${key}]`, res.error);
      db[key] = key === "branding" ? null : [];
      return;
    }

    db[key] = key === "branding"
      ? (res.data || null)
      : (res.data || []);

    console.log(`SYNC OK [${key}]`, res.data ? res.data.length : 0);

  });

  try {

    if(typeof renderUserDropdown === "function"){
      renderUserDropdown();
    }

    if(typeof renderMessages === "function"){
      renderMessages();
    }

    if(typeof renderAll === "function"){
      renderAll();
    }

    window.dataLoaded = true;

  } catch (e) {

    console.error("Render error:", e);
    window.dataLoaded = true;

  }

}

