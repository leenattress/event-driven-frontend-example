# Event Driven Frontends

This project is a simple React application that demonstrates using WebSockets to update an event-driven backend with eventual consistency. It shows how real-time communication can be established between a client and server, and how data consistency is maintained over time. In AWS, when data is stored behind a queue, direct confirmation of data being saved is not possible. Instead, a 202 (request accepted) is returned, and later, the service responsible for saving the record emits an event to notify the frontend.

This example separates the HTTP reception of commands from backend processing, following the CQRS pattern. It uses a simulated queue and delays to mimic lengthy command processing. To enhance realism, random 500 errors and exponential backoff for API calls are simulated, representing poor internet or transient service issues. This repo is not an exercise in creating a sophisticated frontend or API. It uses a basic Rect app to illustrate eventual consistency and error recovery concepts.

## Features

- Real-time updates using WebSockets
- (Fake) Event-driven backend architecture, with queues
- Demonstrates eventual consistency in a web application
- Random deliberate 500 errors that we recover from with retrys in the frontend

## Start the demo

```bash
npm i
npm run api
npm run start
```

# 🤔 Why Though?

## Problems

In an event driven system using cqrs or similar, we do not receive confirmation that a command has changed the data as requested via the HTTP layer. The best we can hope for is strong contract validation and a 202, request accepted for processing.

If an error occurs related to your command, such as an internal failure in a downstream service then we cannot be informed due to the decoupled nature of even driven microservices. 

## Opportunities 

If somebody else changes either the record you are looking at, the page you are on, or even a single field you both occupy then we can now let them know, enabling real time collaboration. The same mechanism used to confirm your update went through can also be used to inform others who care about the record you uodated that it has changed. If we play it smart, we get multiplayer for almost free.

## Moving parts

To allow the user to receive messages from internal services we are going to need a few things

First, on the frontend application we will need a mechanism to receive websocket messages. This is so that real time messages from services, either success messages or failure messages can be displayed to the user, or used to influence the UX. Well need some somponents here, such as toast popups with appropriate colours to handle both errors and successes. 

Next we need a service to handle our websocket connections. In cloud providers such as AWS their API gateway offers this out of the box. Web sockets are a standard so whatever your architecture you'll be able to create something for your front end to connect to and receive messages from. 

Your web-socket enabled endpoint will need to store the active connections so that other services in your event driven system don't need to worry about it. Here are the goals of your web-socket service:

- To allow users to connect to a web-socket
- To store their socket id alongside their internal user id
- To listen to events in the system destined for a specific user id and send it to their socket id

### Why translate the socket id into a user id? 

A socket id is ephemeral. Regardless of the user logged in state, refreshing the browser will change the socket id. A user across two different windows won't share the same socket id either. We need a way to determine the id from the user. So we use a lookup. It only makes sense to store a list of active sockets against a user since it's possible they have more than one window open to the application. 

This means that any other service we have in our platform no longer needs to worry about web-sockets. All it has to do is take the outcome of a command and the id of a user who cares about that outcome and emit a regular event to the service bus about it. We've decoupled the web sockets and delegated the complexity to a single service and fulfilled the single responsibility principle. 

## Standards

Let's t agree on a message passing standard between the frontend and the backend socket server. In out main use case which is receiving updates about database interactions were going to need two schema. 

### The internal status schema

This is an object that can be emitted by any service in the platform. It must contain the user I'd of the target user and a payload of data destined for that user. 

### The front end socket schema

After we have traded our user id for our socket id we can now target the correct browser window for that user. This schema will be the payload from the first schema. We will add some structure to this payload so the front end has an easier time using it, with things such as the success or failure of the command, and helpful keys like a timestamp and the entity id we target to update in the UX.