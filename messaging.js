let lastCount = 0;

// This ensures the chat starts as soon as the file loads
async function initChat() {
    console.log("Chat system initializing...");
    await loadInternalMessages();
    // Refresh every 3 seconds
    setInterval(loadInternalMessages, 3000);
}

async function sendInternalMessage() {
    const input = document.getElementById("internalMsgInput");
    if (!input) return;
    const content = input.value.trim();

    // Check if user is logged in
    if (!window.currentUser) {
        return alert("You must be logged in to send messages.");
    }

    if (!content) return;

    try {
        const { error } = await supa.from("internal_messages").insert([{
            sender_id: window.currentUser.id,
            sender_name: window.currentUser.full_name || "Staff",
            content: content
        }]);

        if (error) throw error;
        input.value = ""; // Clear box
        await loadInternalMessages(); // Refresh immediately
    } catch (err) {
        console.error("Failed to send:", err.message);
    }
}

async function loadInternalMessages() {
    const chatBox = document.getElementById("internalChatBox");
    if (!chatBox) return;

    const { data: messages, error } = await supa
        .from("internal_messages")
        .select("*")
        .order('created_at', { ascending: true });

    if (error) return;

    // Badge Logic
    const activeTab = document.querySelector('.tab-btn.active')?.innerText || "";
    if (messages.length > lastCount && !activeTab.includes("Messages")) {
        const badge = document.getElementById("msgBadge");
        if (badge) {
            badge.classList.remove("hidden");
            badge.innerText = messages.length - lastCount;
        }
    } else if (activeTab.includes("Messages")) {
        // Clear badge if we are looking at the chat
        const badge = document.getElementById("msgBadge");
        if (badge) badge.classList.add("hidden");
        lastCount = messages.length;
    }

    // Render bubbles
    chatBox.innerHTML = messages.map(m => {
        const isMe = m.sender_id === window.currentUser.id;
        return `
            <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; 
                        background: ${isMe ? 'var(--blue)' : 'white'}; 
                        color: ${isMe ? 'white' : '#333'};
                        padding: 10px 15px; border-radius: 15px; max-width: 80%;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: ${isMe ? 'none' : '1px solid #ddd'};">
                <small style="display: block; font-size: 0.7em; margin-bottom: 4px; opacity: 0.8;">
                    ${m.sender_name} • ${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </small>
                ${m.content}
            </div>
        `;
    }).join("");

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Run the initialization
initChat();