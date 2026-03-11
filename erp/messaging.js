function subscribeToMessages() {

if(!window.supa) return;

supa
.channel('messages-channel')
.on(
'postgres_changes',
{
event: 'INSERT',
schema: 'public',
table: 'messages'
},
(payload) => {

if(!window.db) window.db = {};
if(!Array.isArray(db.messages)) db.messages = [];

db.messages.push(payload.new);

renderMessages();

const tab = document.getElementById("messagesTab");

if(tab && tab.classList.contains("hidden")){
console.log("New message received while tab closed");
}

}
)
.subscribe();

}


async function loadMessages(){

if(!window.supa) return;

const {data,error} = await supa
.from("messages")
.select("*")
.order("created_at",{ascending:true})

if(error){
console.error(error)
return
}

if(!window.db) window.db = {};

db.messages = data || []

renderMessages()

}


async function sendMessage(){

const input = document.getElementById("messageInput")

if(!input || !window.currentUser) return

const text = input.value.trim()

if(!text) return

const {error} = await supa
.from("messages")
.insert({
sender_id: currentUser.id,
body: text
})

if(error){
console.error(error)
alert("Message failed")
return
}

input.value=""

await loadMessages()

}


function renderMessages(){

const box = document.getElementById("messages")

if(!box) return
if(!window.db) return
if(!Array.isArray(db.messages)) return

box.innerHTML = ""

db.messages.forEach(m=>{

const div = document.createElement("div")
div.className = "message"

div.innerHTML = `
<b>${m.sender_id}</b>
<p>${m.body}</p>
`

box.appendChild(div)

})

}


function setupMessageInput(){

const input = document.getElementById("messageInput")

if(!input) return

input.addEventListener("keypress",(e)=>{

if(e.key==="Enter"){
e.preventDefault()
sendMessage()
}

})

}


function cleanupMessaging(){

const box = document.getElementById("messages")

if(box) box.innerHTML=""

}


function showTypingIndicator(name){

const el = document.getElementById("typingIndicator")

if(!el) return

el.innerText = name + " typing..."

setTimeout(()=>{
el.innerText=""
},2000)

}


async function sendBroadcastMessage(){

const input = document.getElementById("messageInput")

if(!input || !window.currentUser || !window.db || !Array.isArray(db.users)) return

const text = input.value.trim()

if(!text) return

const messages = db.users.map(u=>({
sender_id: currentUser.id,
receiver_id: u.id,
body: text
}))

const {error} = await supa
.from("messages")
.insert(messages)

if(error){
console.error(error)
return
}

input.value=""

await loadMessages()

}


async function sendPrivateMessage(receiverId){

const input = document.getElementById("messageInput")

if(!input || !window.currentUser) return

const text = input.value.trim()

if(!text) return

const {error} = await supa
.from("messages")
.insert({
sender_id: currentUser.id,
receiver_id: receiverId,
body: text
})

if(error){
console.error(error)
return
}

input.value=""

await loadMessages()

}

