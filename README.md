# Event Driven Frontends

This project is a basic HTML application designed to teach how to use WebSockets and update an event-driven backend with eventual consistency. It demonstrates how real-time communication can be achieved between a client and server, and how data consistency is managed over time.

Fir any service in AWS where the data reaches the store (any kind of database) behind a queue, a direct confirmation of the data being save is not possible. The best we can do is to return a 202 (request accepted) and then later, the service responsible for saving the record will emit an event that messages the frontend somehow.

In this example, we decouple the HTTP reception of the command (See CQRS pattern), from the processing in the backend. WE create a fake queue and some fake delays to simulate a lengthly queue processing of a command.

For good measure, we also simulate random 500 errors, as well as exponential backoff for all the API calls, to simulate terrible internet or a transient service issue.


## Features

- Real-time updates using WebSockets
- (Fake) Event-driven backend architecture, with queues
- Demonstrates eventual consistency in a web application
- Random deliberate 500 errors that we recover from

## Prerequisites

- Node.js installed on your machine

## Usage

### NPM Scripts

- **Start the server**: 

  ```bash
  npm run api
  ```

  This script will start the backend server and serve the HTML application.

- **Start the project**: 

  ```bash
  npm run dev
  ```

## Project Structure

- `api.cjs`: Contains the server-side logic for handling WebSocket connections and events.
- `src/ToDoApi.js`: Manages the API calls related to the ToDo functionality.
- `src/main.js`: The main entry point for the example client-side JavaScript.
- `styles.css`: Contains the styles for the application.
- `index.html`: The main HTML file for the application.

## License

This project is licensed under the MIT License.