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
// Function to send message to Supabase
async function sendInternalMessage() {
    const input = document.getElementById("internalMsgInput");
    const content = input.value.trim();

    if (!content) return;

    try {
        const { error } = await supa.from("internal_messages").insert([{
            sender_name: window.currentUser.full_name || "Staff",
            sender_id: window.currentUser.id,
            content: content
        }]);

        if (error) throw error;
        
        input.value = ""; // Clear input
        await loadInternalMessages(); // Refresh chat
    } catch (err) {
        console.error("Chat error:", err);
    }
}

// Function to load and display messages
async function loadInternalMessages() {
    const chatBox = document.getElementById("internalChatBox");
    if (!chatBox) return;

    const { data: messages, error } = await supa
        .from("internal_messages")
        .select("*")
        .order('created_at', { ascending: true });

    if (error) return console.error(error);

    chatBox.innerHTML = messages.map(msg => `
        <div style="align-self: ${msg.sender_id === window.currentUser.id ? 'flex-end' : 'flex-start'}; 
                    background: ${msg.sender_id === window.currentUser.id ? '#dcf8c6' : '#fff'}; 
                    padding: 8px 12px; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); max-width: 70%;">
            <strong style="font-size: 0.8em; color: #555;">${msg.sender_name}</strong><br>
            <span>${msg.content}</span>
            <div style="font-size: 0.6em; color: #999; text-align: right;">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
    `).join("");

    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
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