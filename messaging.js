let lastCount = 0;

// This ensures the chat starts as soon as the file loads
async function initChat() {
    console.log("Chat system initializing...");
    await loadInternalMessages();
    // Refresh every 3 seconds
    setInterval(loadInternalMessages, 3000);
}

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();

    if (!message || !window.currentUser) return;

    try {
        const { error } = await supa.from("messages").insert([{
            content: message,
            sender_id: window.currentUser.id,
            sender_name: window.currentUser.full_name || window.currentUser.email
        }]);

        if (error) throw error;

        input.value = ""; // Clear input field
        await loadMessages(); // This will now work because we defined it above!
        
    } catch (err) {
        alert("Failed to send message: " + err.message);
    }
}

async function loadMessages() {
    const chatBox = document.getElementById("chatMessages"); // Ensure this ID exists in your HTML
    if (!chatBox) return;

    try {
        // 1. Fetch the last 50 messages from Supabase
        const { data: messages, error } = await supa
            .from("messages")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(50);

        if (error) throw error;

        // 2. Render messages to the UI
        chatBox.innerHTML = messages.map(msg => {
            const isMe = msg.sender_id === window.currentUser.id;
            return `
                <div class="message ${isMe ? 'sent' : 'received'}">
                    <small><strong>${msg.sender_name}</strong></small>
                    <p>${msg.content}</p>
                    <span class="time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            `;
        }).join("");

        // 3. Auto-scroll to the bottom
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
        console.error("Error loading messages:", err);
    }
}

// Run the initialization
initChat();