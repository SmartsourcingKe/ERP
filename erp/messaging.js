function subscribeToMessages(){

supa
.channel("messages")
.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"messages"
},
payload=>{

db.messages.push(payload.new)

renderMessages()

}
)
.subscribe()

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


function renderMessages(){

const box = document.getElementById("messages")

if(!box) return

box.innerHTML=""

db.messages.forEach(msg=>{

const div=document.createElement("div")

div.className="message"

div.innerHTML=`
<b>${msg.sender}</b>
<p>${msg.body}</p>
`

box.appendChild(div)

})

}

async function loadMessages(){

const { data, error } = await supa
.from("messages")
.select("*")
.order("created_at",{ascending:true})

if(error){
console.error(error)
return
}

db.messages = data

renderMessages()

}

async function sendMessage(text){

if(!text) return

await supa
.from("messages")
.insert([{
sender: currentUser.id,
body: text
}])

loadMessages()

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


function showTypingIndicator(){

const el = document.getElementById("typing")

if(!el) return

el.style.display="block"

setTimeout(()=>{
el.style.display="none"
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

