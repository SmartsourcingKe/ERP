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
        console.error("Chat Error:", err.message);
    }
}

// Function to load all messages
// Variable to track message count for the notification badge
let lastMessageCount = 0;

async function loadInternalMessages() {
    const chatBox = document.getElementById("internalChatBox");
    if (!chatBox) return;

    // Fetch all messages from Supabase ordered by time
    const { data: messages, error } = await supa
        .from("internal_messages")
        .select("*")
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error loading messages:", error.message);
        return;
    }

    // 1. NOTIFICATION BADGE LOGIC
    // Get the current active tab name
    const activeTabBtn = document.querySelector('.tab-btn.active');
    const activeTabName = activeTabBtn ? activeTabBtn.innerText.trim() : "";

    // If new messages arrived and the user is NOT looking at the Messages tab
    if (messages.length > lastMessageCount && activeTabName !== 'Messages') {
        const badge = document.getElementById('msgBadge');
        if (badge) {
            badge.classList.remove('hidden');
            // Update the badge with the number of new messages
            badge.innerText = messages.length - lastMessageCount;
        }
    }
    
    // Update the tracker to the current total
    lastMessageCount = messages.length;

    // 2. RENDERING LOGIC
    chatBox.innerHTML = messages.map(msg => {
        // Check if the current logged-in user sent this message
        const isMe = msg.sender_id === window.currentUser.id;
        
        return `
            <div style="
                align-self: ${isMe ? 'flex-end' : 'flex-start'}; 
                max-width: 75%; 
                padding: 12px; 
                border-radius: 15px; 
                margin-bottom: 5px;
                background: ${isMe ? 'var(--blue)' : '#e9e9eb'}; 
                color: ${isMe ? 'white' : 'black'};
                border-bottom-${isMe ? 'right' : 'left'}-radius: 2px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                position: relative;">
                
                <small style="font-size: 0.75em; display: block; margin-bottom: 5px; opacity: 0.8; font-weight: bold;">
                    ${isMe ? 'You' : msg.sender_name} • ${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </small>
                
                <div style="word-wrap: break-word;">
                    ${msg.content}
                </div>
            </div>
        `;
    }).join("");

    // 3. AUTO-SCROLL LOGIC
    // Always keep the latest messages in view
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Set up the auto-refresh (Polling)
// This checks for new messages every 3 seconds to give a "live" feel
setInterval(loadInternalMessages, 3000);

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