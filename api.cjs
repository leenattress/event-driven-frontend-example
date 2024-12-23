const express = require('express');
const cors = require('cors');
const app = express();
const port = 7686;
const WebSocket = require('ws');

app.use(express.json());
app.use(cors());

let todos = [];
let queue = [];

// Middleware to add a random delay between 1 and 5 seconds to all requests
app.use((req, res, next) => {
    const delay = Math.random() * 4000 + 1000; // Random delay between 1000ms (1s) and 5000ms (5s)
    setTimeout(() => {
        next();
    }, delay);
});

// Middleware to simulate random 500 errors
app.use((req, res, next) => {
    if (Math.random() < 0.1) { // 10% chance to return a 500 error
        console.log(`Simulated 500 error for request to ${req.path}`);
        return res.status(500).send('Internal Server Error');
    }
    next();
});

// Process queue with a delay between 2 and 6 seconds
setInterval(() => {
    if (queue.length > 0) {
        const { verb, action, data } = queue.shift();
        console.log(`Processing queue item with data: ${JSON.stringify(data)}`);
        setTimeout(() => {
            action(data);
            console.log(`Processed queue item with data: ${JSON.stringify(data)}`);
            // Optionally broadcast the updated todos
            broadcastUpdate(verb, data);
        }, Math.random() * 2000 + 3000); // Random delay between 3000ms (3s) and 6000ms (6s)
    }
}, 500);

// Get all todos
app.get('/todos', (req, res) => {
    console.log('Fetching all todos');
    res.json(todos);
});

// Add a new todo
app.post('/todos', (req, res) => {
    const { text } = req.body;
    const id = Date.now(); // Use timestamp as a unique ID
    const newTodo = { id, text, completed: false };
    console.log(`Adding new todo: ${JSON.stringify(newTodo)}`);

    // Add the new todo to the queue
    queue.push({
        verb: 'create',
        action: (todo) => todos.push(todo),
        data: newTodo
    });

    // Send the new todo back in the response
    res.status(201).json(newTodo);
});

// Update a todo
app.put('/todos/:id', (req, res) => {
    const todoId = parseInt(req.params.id, 10);
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
        const updatedTodo = {
            ...todo,
            text: req.body.text !== undefined ? req.body.text : todo.text,
            completed: req.body.completed !== undefined ? req.body.completed : todo.completed
        };
        console.log(`Updating todo with ID ${todoId}: ${JSON.stringify(updatedTodo)}`);
        queue.push({
            verb: 'update',
            action: (updated) => {
                const index = todos.findIndex(t => t.id === updated.id);
                todos[index] = updated;
            },
            data: updatedTodo
        });
        res.status(202).send('Todo update is being processed');
    } else {
        console.log(`Todo with ID ${todoId} not found for update`);
        res.status(404).send('Todo not found');
    }
});

// Delete a todo
app.delete('/todos/:id', (req, res) => {
    const todoId = parseInt(req.params.id, 10);
    console.log(`Request to delete todo with ID ${todoId} received`);

    queue.push({
        verb: 'delete',
        action: (todoId) => {
            const todoIndex = todos.findIndex(t => t.id === todoId);
            if (todoIndex !== -1) {
                console.log(`Deleting todo with ID ${todoId}`);
                todos.splice(todoIndex, 1);
            } else {
                console.log(`Todo with ID ${todoId} not found for deletion`);
            }
        },
        data: todoId
    });

    res.status(202).send({ id: todoId });
});

const server = app.listen(port, () => {
    console.log(`Todo API server running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ port: 7687 });

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Example of sending back the processed item ID
    ws.on('message', (message) => {
        console.log(`Received message from client: ${message}`);
        const processedItemId = processMessage(message); // Assume this function processes the message
        const responseMessage = createWebSocketMessage('processedItem', { processedItemId });
        ws.send(responseMessage);
        console.log(`Sent processed item ID: ${processedItemId} to client`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

function processMessage(message) {
    // Process the message and return the ID of the processed item
    const item = JSON.parse(message);
    console.log(`Processing message: ${message}`);
    // Assuming the item has an ID
    return item.id;
}

// Broadcast updated todos to all connected clients
function broadcastUpdate(action, payload) {
    const data = createWebSocketMessage(action, payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

/**
 * Creates a standardized WebSocket message.
 * @param {string} type - The type of the message (e.g., 'processedItem', 'broadcast').
 * @param {object} payload - The payload of the message.
 * @returns {string} - The JSON stringified message.
 */
function createWebSocketMessage(verb, payload) {
    return JSON.stringify({ verb, payload });
}