const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 5000 });
let clients = {};

wss.on('connection', (ws) => {
    const clientId = Math.floor(Math.random() * 10000).toString(); // Generate a unique ID for the client
    clients[clientId] = ws;
    ws.id = clientId;

    console.log(`Client connected with ID: ${clientId}`); // Log the client ID when they connect

    // Send the ID back to the client
    ws.send(JSON.stringify({ type: 'assign-id', id: clientId }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const target = clients[data.target];

        console.log(`Message received from ID: ${clientId}`); // Log the sender's ID
        console.log(`Target ID: ${data.target}`); // Log the target's ID

        if (target) {
            console.log(`Forwarding message to target ID: ${data.target}`);
            target.send(JSON.stringify({ ...data, sender: clientId }));
        } else {
            console.log(`Target ID not found: ${data.target}`);
        }
    });

    ws.on('close', () => {
        console.log(`Client with ID: ${clientId} disconnected`); // Log when a client disconnects
        delete clients[clientId];
    });
});

console.log('WebSocket server running on ws://localhost:5000');
