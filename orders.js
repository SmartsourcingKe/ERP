/**
 * RENDER ORDERS
 * Pulls from window.db.orders and window.db.order_items
 */
function renderOrders() {
    const tbody = document.getElementById("orderBody");
    if (!tbody) {
        console.warn("Order table body (orderBody) not found in HTML.");
        return;
    }

    const orders = window.db.orders || [];
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders found.</td></tr>';
        return;
    }

    // Sort by newest first
    const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    tbody.innerHTML = sortedOrders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const statusClass = `status-${order.status?.toLowerCase() || 'pending'}`;
        
        return `
           tbody.innerHTML = orders.map(order => `
    <tr>
        <td>${order.id.slice(0,8)}</td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
        <td>KES ${order.total}</td>
        <td>${order.status}</td>
        <td>${new Date(order.created_at).toLocaleTimeString()}</td>
        <td>
            <button class="btn btn-blue" onclick="viewOrder('${order.id}')" style="padding:2px 5px; font-size:10px;">View</button>
            ${order.status === 'disbursed' ? `<button class="btn btn-green" onclick="generateAndStoreReceipt('${order.id}')" style="padding:2px 5px; font-size:10px;">Receipt</button>` : ''}
        </td>
    </tr>
`).join("");
}