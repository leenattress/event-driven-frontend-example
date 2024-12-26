const API_URL = 'http://localhost:7686/todos';

const handleResponse = async (response) => {
  if ([200, 201, 202].includes(response.status)) {
    return await response.json();
  } else {
    throw new Error(`Request failed with status: ${response.status}`);
  }
};

const exponentialBackoff = async (fn, onFailure, retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed. Retrying...`);
      if (i === retries - 1) {
        console.error('Network Error:', error);
        onFailure(error);
      }
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
};

const handleError = (error, onFailure) => {
  console.error('🛜 Network Error:', error);
  onFailure(error);
};

export const fetchTodos = async (onSuccess, onFailure) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(API_URL);
      return await handleResponse(response, onSuccess, onFailure) || [];
    });
  } catch (error) {
    handleError(error, onFailure);
    return [];
  }
};

export const createTodo = async (newTodo, onSuccess, onFailure) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      });
      return await handleResponse(response, onSuccess, onFailure);
    });
  } catch (error) {
    handleError(error, onFailure);
    return null;
  }
};

export const updateTodo = async (id, updatedTodo, onSuccess, onFailure) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo),
      });
      return await handleResponse(response, onSuccess, onFailure);
    });
  } catch (error) {
    handleError(error, onFailure);
    return null;
  }
};

export const deleteTodo = async (id, onSuccess, onFailure) => {
  try {
    return await exponentialBackoff(async () => {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      if ([200, 201, 202].includes(response.status)) {
        onSuccess();
        return true;
      } else {
        const errorMessage = 'Failed to delete todo';
        console.error(errorMessage);
        onFailure(errorMessage);
        return false;
      }
    });
  } catch (error) {
    handleError(error, onFailure);
    return false;
  }
};
