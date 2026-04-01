let isHandlingAuth = false; // 🔥 prevents duplicate execution

// LOGIN
async function login() {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    try {
        const { data, error } = await supa.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // DO NOT manually call showScreen here
        // Supabase will trigger SIGNED_IN event automatically

    } catch (err) {
        console.error("Login Error:", err);
        alert("Login Failed: " + err.message);
    }
}


// 🔥 SINGLE SOURCE OF TRUTH FOR SESSION HANDLING
async function handleSignedIn(session) {
    if (isHandlingAuth) return;
    isHandlingAuth = true;

    try {
        const user = session.user;

        // Try DB first
        const { data: profile, error } = await supa
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.warn("Using metadata fallback");

            window.currentUser = {
                ...user,
                role: user.user_metadata?.role || 'staff',
                full_name:
                    user.user_metadata?.full_name ||
                    user.email.split('@')[0]
            };
        } else {
            window.currentUser = { ...user, ...profile };
        }

        console.log("User ready:", window.currentUser);

        if (typeof applyPermissions === "function") {
    applyPermissions();
}
        await sync();

        showScreen('dashboardPage');

    } catch (err) {
        console.error("Session handling error:", err);
    } finally {
        isHandlingAuth = false;
    }
}


// LOGOUT
async function logout() {
    await supa.auth.signOut();
    window.currentUser = null;
    location.reload();
}



// 🔥 RESTORE SESSION (ONLY ON LOAD, NO DUPLICATION)
async function restoreSession() {
    const { data } = await supa.auth.getSession();

    if (data?.session) {
        await handleSignedIn(data.session);
    }
}


// UI RESET
function handleSignedOut() {
    document.getElementById("dashboard")?.classList.add("hidden");
    document.getElementById("loginPage")?.classList.remove("hidden");
}


// INIT
restoreSession();


// EXPORTS
window.login = login;
window.logout = logout;