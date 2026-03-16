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

    const { error } = await supa.from("internal_messages").insert([{
        sender_name: window.currentUser.full_name || "Staff",
        sender_id: window.currentUser.id,
        content: content
    }]);

    if (error) return console.error(error);
    input.value = "";
    await loadInternalMessages(); 
}

async function loadInternalMessages() {
    const chatBox = document.getElementById("internalChatBox");
    if (!chatBox) return;

    const { data: messages } = await supa.from("internal_messages").select("*").order('created_at', { ascending: true });

    chatBox.innerHTML = messages.map(msg => `
        <div style="align-self: ${msg.sender_id === window.currentUser.id ? 'flex-end' : 'flex-start'}; 
                    background: ${msg.sender_id === window.currentUser.id ? '#dcf8c6' : '#fff'}; 
                    padding: 8px; border-radius: 8px; max-width: 80%;">
            <small>${msg.sender_name}</small><br>${msg.content}
        </div>
    `).join("");
    chatBox.scrollTop = chatBox.scrollHeight;
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