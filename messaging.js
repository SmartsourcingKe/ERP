/**
 * MESSAGING LOGIC
 * Handles internal team chat, notification badges, and real-time feel.
 */

let lastMessageCount = 0;

// 1. SEND MESSAGE
async function sendInternalMessage() {
    const input = document.getElementById("internalMsgInput");
    const content = input.value.trim();

    if (!content || !window.currentUser) return;

    try {
        const { error } = await supa.from("internal_messages").insert([{
            sender_name: window.currentUser.full_name || "Staff Member",
            sender_id: window.currentUser.id,
            content: content
        }]);

        if (error) throw error;
        
        input.value = ""; // Clear input
        await loadInternalMessages(); // Refresh immediately after sending
    } catch (err) {
        console.error("Chat Error:", err.message);
        alert("Could not send message. Check connection.");
    }
}

// 2. LOAD & RENDER MESSAGES
async function loadInternalMessages() {
    const chatBox = document.getElementById("internalChatBox");
    if (!chatBox) return;

    // Fetch from internal_messages (the correct table)
    const { data: messages, error } = await supa
        .from("internal_messages")
        .select("*")
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error loading messages:", error.message);
        return;
    }

    // 3. NOTIFICATION BADGE LOGIC
    const activeTabBtn = document.querySelector('.tab-btn.active');
    const activeTabName = activeTabBtn ? activeTabBtn.innerText.trim() : "";

    // Show red badge if user is on a different tab
    if (messages.length > lastMessageCount && !activeTabName.includes("Messages")) {
        const badge = document.getElementById('msgBadge');
        if (badge) {
            badge.classList.remove('hidden');
            badge.innerText = messages.length - lastMessageCount;
        }
    }
    
    // Reset badge if we are currently looking at the Messages tab
    if (activeTabName.includes("Messages")) {
        const badge = document.getElementById('msgBadge');
        if (badge) badge.classList.add('hidden');
        lastMessageCount = messages.length; 
    }

    // 4. GENERATE HTML
    chatBox.innerHTML = messages.map(msg => {
        const isMe = msg.sender_id === window.currentUser.id;
        
        return `
            <div style="
                align-self: ${isMe ? 'flex-end' : 'flex-start'}; 
                max-width: 75%; 
                padding: 10px 14px; 
                border-radius: 12px; 
                margin-bottom: 8px;
                background: ${isMe ? 'var(--blue)' : '#e9e9eb'}; 
                color: ${isMe ? 'white' : 'black'};
                border-bottom-${isMe ? 'right' : 'left'}-radius: 2px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                position: relative;">
                
                <small style="font-size: 0.7em; display: block; margin-bottom: 4px; opacity: 0.8; font-weight: bold;">
                    ${isMe ? 'You' : msg.sender_name} • ${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </small>
                
                <div style="word-wrap: break-word; font-size: 0.95em;">
                    ${msg.content}
                </div>
            </div>
        `;
    }).join("");

    // 5. AUTO-SCROLL
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 6. INITIALIZATION & REFRESH
// Automatically check for new messages every 4 seconds
setInterval(loadInternalMessages, 4000);

// Also check for 'Enter' key press in the input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById("internalMsgInput");
    if (input) {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendInternalMessage();
            }
        });
    }
});