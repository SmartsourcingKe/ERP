// GLOBAL DATABASE CACHE
window.db = window.db || {};

// CURRENT USER
window.currentUser = window.currentUser || null;

// SYSTEM FLAGS
window.dataLoaded = false;


// INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {

  try {

    if(!window.supa){
      console.error("Supabase client not initialized");
      return;
    }

    // Check session
    const { data, error } = await supa.auth.getSession();

    if(error){
      console.error("Session fetch error:", error);
      return;
    }

    const session = data?.session;

    if(session){
      if(typeof handleSignedIn === "function"){
        await handleSignedIn(session);
      }
    }else{
      if(typeof handleSignedOut === "function"){
        handleSignedOut();
      }
    }

  } catch(err){
    console.error("Initialization error:", err);
  }

});


// AUTH STATE LISTENER
if(window.supa){

  supa.auth.onAuthStateChange((event, session) => {

    console.log("AUTH EVENT:", event);

    if(event === "SIGNED_IN"){

      if(typeof handleSignedIn === "function"){
        handleSignedIn(session);
      }

    }

    if(event === "SIGNED_OUT"){

      if(typeof handleSignedOut === "function"){
        handleSignedOut();
      }

    }

  });

}


// SAFE EVENT LISTENERS

const loginBtn = document.getElementById("loginBtn");

if(loginBtn){
  loginBtn.addEventListener("click", () => {

    if(typeof login === "function"){
      login();
    }

  });
}

const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){
  logoutBtn.addEventListener("click", () => {

    if(typeof logout === "function"){
      logout();
    }

  });
}

window.db = {
users: [],
employees: [],
products: [],
retailers: [],
orders: [],
messages: []
}

window.currentUser = null

console.log("Core system ready")

window.addEventListener("load",()=>{

if(typeof subscribeToMessages === "function"){
subscribeToMessages()
}

if(typeof loadMessages === "function"){
loadMessages()
}

})