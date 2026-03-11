function showDashboard(){

  const loginPage = document.getElementById("loginPage");
  const dashboard = document.getElementById("dashboard");

  if(loginPage) loginPage.style.display = "none";
  if(dashboard) dashboard.style.display = "block";

}


function showSection(sectionId){

  const sections = document.querySelectorAll(".section");

  if(!sections) return;

  sections.forEach(sec=>{
    sec.style.display = "none";
  });

  const target = document.getElementById(sectionId);

  if(target){
    target.style.display = "block";
  }

}


function toggleMenu(){

  const sidebar = document.getElementById("sidebar");

  if(!sidebar) return;

  sidebar.classList.toggle("open");

}


function renderAll(){

  if(!window.db) return;

  try{

    if(typeof renderProducts === "function"){
      renderProducts();
    }

    if(typeof renderRetailers === "function"){
      renderRetailers();
    }

    if(typeof renderRetailerOrders === "function"){
      renderRetailerOrders();
    }

    if(typeof renderCorporate === "function"){
      renderCorporate();
    }

    if(typeof renderCorporateOrders === "function"){
      renderCorporateOrders();
    }

    if(typeof renderEmployees === "function"){
      renderEmployees();
    }

    if(typeof renderPayroll === "function"){
      renderPayroll();
    }

    if(typeof renderReports === "function"){
      renderReports();
    }

    if(typeof renderMessages === "function"){
      renderMessages();
    }

    if(typeof renderBranding === "function"){
      renderBranding();
    }

  }catch(err){
    console.error("Render error:", err);
  }

}