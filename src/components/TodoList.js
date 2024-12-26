import React from 'react';

function TodoList({ todos, loading, onDelete }) {
  return (
    <ul>
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="skeleton"></li>
        ))
      ) : (
        todos.map(todo => (
          <li key={todo.id}>
            {todo.text} {todo?.confirmed ? '🌈' : ''} {todo?.http ? '🌉' : ''}
            <button onClick={() => onDelete(todo.id)}>✖</button>
          </li>
        ))
      )}
    </ul>
  );
}

export default TodoList; 