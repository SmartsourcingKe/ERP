/**
 * SUBSCRIBE TO MESSAGES (Real-time)
 * Listens for new entries in the 'messages' table.
 */
function subscribeToMessages() {
    if (!window.supa) return;

    supa.channel('messages-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            if (!window.db.messages) window.db.messages = [];
            
            // Avoid duplicate messages if loadMessages and subscription trigger simultaneously
            const exists = db.messages.find(m => m.id === payload.new.id);
            if (!exists) {
                db.messages.push(payload.new);
                renderMessages();
                
                // Alert user if they aren't looking at the chat
                const messagesTab = document.getElementById("messagesTab");
                if (messagesTab && messagesTab.classList.contains("hidden")) {
                    console.log("New message received in background.");
                }
            }
        })
        .subscribe();
}

/**
 * SEND MESSAGE
 */
async function sendMessage() {
    const input = document.getElementById("messageInput");
    if (!input || !window.currentUser) return;

    const text = input.value.trim();
    if (!text) return;

    try {
        const { error } = await supa.from("messages").insert({
            sender_id: currentUser.auth_user_id, // Match the auth ID
            body: text
        });

        if (error) throw error;
        input.value = "";
        
        // No need to call loadMessages() here! 
        // The real-time subscription will pick up the new message automatically.

    } catch (err) {
        console.error("Messaging Error:", err.message);
        alert("Failed to send message.");
    }
}

/**
 * RENDER MESSAGES
 * Displays the chat and converts IDs to Names.
 */
function renderMessages() {
    const box = document.getElementById("messages");
    if (!box || !window.db?.messages) return;

    box.innerHTML = db.messages.map(m => {
        // Find sender name from local user cache
        const sender = db.users?.find(u => u.auth_user_id === m.sender_id);
        const senderName = sender ? sender.full_name : "System User";
        const isMe = m.sender_id === currentUser.auth_user_id;

        return `
            <div class="message ${isMe ? 'msg-right' : 'msg-left'}">
                <small><strong>${senderName}</strong></small>
                <div>${m.body}</div>
            </div>
        `;
    }).join("");

    // Auto-scroll to latest message
    box.scrollTop = box.scrollHeight;
}

/**
 * INITIAL SETUP
 */
function setupMessageInput() {
    const input = document.getElementById("messageInput");
    if (!input) return;

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
}

function cleanupMessaging() {
    const box = document.getElementById("messages");
    if (box) box.innerHTML = "";
    // Unsubscribe from channel to save resources
    if (window.supa) supa.removeChannel('messages-channel');
}