const API_URL = 'http://localhost:7686/todos';

const handleResponse = async (response) => {
  if (response.ok) {
    return await response.json();
  }
  throw new Error(`Request failed with status: ${response.status}`);
};

const exponentialBackoff = async (fn, retries = 5, delay = 500) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed. Retrying...`);
      if (i === retries - 1) {
        throw error;
      }
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
};

const handleError = (error) => {
  console.error('🛜 Network Error:', error);
};

export const fetchTodos = async ({ onFailure }) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(API_URL);
      return await handleResponse(response) || [];
    });
  } catch (error) {
    handleError(error);
    onFailure();
    return [];
  }
};

export const createTodo = async (newTodo) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      });
      return await handleResponse(response);
    });
  } catch (error) {
    handleError(error);
    return null;
  }
};

export const updateTodo = async (id, updatedTodo) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo),
      });
      return await handleResponse(response);
    });
  } catch (error) {
    handleError(error);
    return null;
  }
};

export const deleteTodo = async (id) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        return true;
      }
      throw new Error('Failed to delete todo');
    });
  } catch (error) {
    handleError(error);
    return false;
  }
};
