window.db = {

users: [],
employees: [],
products: [],
retailers: [],
orders: [],
corporateOrders: [],
messages: []

}

window.currentUser = null

console.log("Core system loaded")

window.addEventListener("load", () => {

if (typeof loadMessages === "function") {
loadMessages()
}

if (typeof subscribeToMessages === "function") {
subscribeToMessages()
}

})