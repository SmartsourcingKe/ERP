/**
 * SUBSCRIBE TO MESSAGES (Real-time)
 * Listens for new entries in the 'messages' table.
 */
function subscribeToMessages() {
    if (!window.supa) return;

    supa.channel('messages-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            if (!window.db.messages) window.db.messages = [];
            
            // Check if it's already there to prevent double-showing
            const exists = window.db.messages.some(m => m.id === payload.new.id);
            if (!exists) {
                window.db.messages.push(payload.new);
                renderMessages(); // Re-draw the chat box
            }
        })
        .subscribe();
}

/**
 * SEND MESSAGE
 */
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const receiverId = document.getElementById("messageStaffSelect")?.value; // Get selected staff
    
    if (!input || !window.currentUser) return;

    const textValue = input.value.trim();
    if (!textValue) return;

    try {
        // Use 'body' to match your render logic, and include a receiver_id
        const { error } = await supa.from("messages").insert({
            sender_id: currentUser.id, // Use .id which is the UUID
            receiver_id: receiverId || null, // Optional: for private or group chat
            body: textValue, 
            created_at: new Date()
        });

        if (error) throw error;

        input.value = ""; // Clear input on success
        // No need to manually push to db.messages; the subscription handles it!
    } catch (err) {
        console.error("Send Error:", err);
        alert("Failed to send: " + err.message);
    }
}

/**
 * RENDER MESSAGES
 * Displays the chat and converts IDs to Names.
 */
function renderMessages() {
    const box = document.getElementById("messageBox");
    if (!box || !window.db.messages) return;

    box.innerHTML = window.db.messages.map(m => {
        // Find who sent it
        const sender = (window.db.users || []).find(u => u.auth_user_id === m.sender_id || u.id === m.sender_id);
        const senderName = sender ? sender.full_name : "System";
        
        // Check if the current user is the sender
        const isMe = m.sender_id === window.currentUser.id;

        return `
            <div class="chat-bubble ${isMe ? 'chat-right' : 'chat-left'}">
                <small style="font-size: 10px; opacity: 0.7;">${senderName}</small>
                <div class="message-text">${m.body || m.text}</div>
            </div>
        `;
    }).join("");

    // Auto-scroll to the latest message
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
    const box = document.getElementById("messagesContainer");
    if (box) box.innerHTML = "";
    
    // Safer way to remove channel
    if (window.supa && typeof supa.removeChannel === 'function') {
        const channel = supa.channel('messages-channel');
        supa.removeChannel(channel);
    }
}