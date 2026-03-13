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
            <tr>
                <td>${order.order_number || order.id.slice(0,8)}</td>
                <td>${date}</td>
                <td>KES ${Number(order.total_amount || 0).toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${order.status || 'Pending'}</span></td>
                <td>
                    <button class="btn-view" onclick="viewOrderDetails('${order.id}')">View</button>
                    <button class="btn-print" onclick="printReceipt('${order.id}')">Receipt</button>
                </td>
            </tr>
        `;
    }).join("");
}