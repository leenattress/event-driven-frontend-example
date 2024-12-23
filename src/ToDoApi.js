class ToDoApi {
    constructor() {
        this.baseUrl = 'http://localhost:7686/todos';
    }

    async getTodos() {
        return this.retryFetch(this.baseUrl);
    }

    async addTodo(todo) {
        return this.retryFetch(this.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todo)
        });
    }

    async deleteTodo(id) {
        return this.retryFetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE'
        });
    }

    async retryFetch(url, options = {}, retries = 5, delay = 500) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response.json();
            }
            if (response.status === 500 && retries > 0) {
                console.log(`Retrying... (${retries} attempts left)`);
                await this.delay(delay);
                return this.retryFetch(url, options, retries - 1, delay * 2);
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default ToDoApi; 