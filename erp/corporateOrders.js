function renderCorporateOrders(){

  if(!window.db || !Array.isArray(db.corporate_orders)) return;

  const table = document.getElementById("corporateOrdersTable");

  if(!table) return;

  const orders = db.corporate_orders || [];
  const schools = db.schools || [];

  table.innerHTML = orders.map(o=>{

    const school = schools.find(s => String(s.id) === String(o.school_id));

    return `
      <tr>
        <td>${o.id}</td>
        <td>${school ? school.name : "-"}</td>
        <td>${o.total || 0}</td>
        <td>${o.status || "-"}</td>
        <td>${o.created_at || ""}</td>
      </tr>
    `;

  }).join("");

}


async function createCorporateOrder(){

  if(!window.supa){
    console.error("Supabase not initialized");
    return;
  }

  const schoolSelect = document.getElementById("corporateSchool");
  const totalInput = document.getElementById("corporateTotal");

  if(!schoolSelect || !totalInput){
    console.error("Corporate order inputs missing");
    return;
  }

  const school_id = schoolSelect.value;
  const total = Number(totalInput.value) || 0;

  if(!school_id){
    alert("Select a school");
    return;
  }

  try{

    const { error } = await supa
      .from("corporate_orders")
      .insert({
        school_id: school_id,
        total: total
      });

    if(error){
      console.error("Insert failed:", error);
      alert("Order creation failed");
      return;
    }

    if(typeof sync === "function"){
      await sync();
    }

  }catch(err){
    console.error("Corporate order error:", err);
  }

}