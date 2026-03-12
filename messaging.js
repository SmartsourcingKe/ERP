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

    const textValue = input.value.trim();
    if (!textValue) return;

    try {
        // FIXED: Using 'text' instead of 'body' to match SQL
        const { error } = await supa.from("messages").insert({
            sender_id: currentUser.auth_user_id,
            sender_name: currentUser.full_name,
            text: textValue 
        });

        if (error) throw error;
        input.value = "";
        
    } catch (err) {
        console.error("Messaging Error:", err.message);
        alert("Failed to send message: " + err.message);
    }
}

/**
 * RENDER MESSAGES
 * Displays the chat and converts IDs to Names.
 */
function renderMessages() {
    // FIXED: Changed ID from "messages" to "messagesContainer"
    const box = document.getElementById("messagesContainer");
    if (!box || !window.db?.messages) return;

    box.innerHTML = db.messages.map(m => {
        const sender = db.users?.find(u => u.auth_user_id === m.sender_id);
        const senderName = sender ? sender.full_name : "System User";
        const isMe = m.sender_id === (currentUser?.auth_user_id || "");

        // FIXED: Using your CSS classes 'chat-left' and 'chat-right' from index.html
        return `
            <div class="chat-bubble ${isMe ? 'chat-right' : 'chat-left'}">
                <small style="display:block; font-size:10px; opacity:0.8;">${senderName}</small>
                <div>${m.text || m.body || ""}</div>
            </div>
        `;
    }).join("");

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