import React from 'react';
import './TodoList.css';
function TodoList({ todos, loading, onDelete }) {
  return (
    <ul>
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="skeleton"></li>
        ))
      ) : todos.length === 0 ? (
        <li>No todos available</li>
      ) : (
        todos.map(todo => (
          <li key={todo.id} className={todo?.className ? todo?.className : ''}>
            {todo.text}
            {/* {todo?.confirmed ? '🌈' : ''} */}        
                
            {todo && todo.waiting ? (
              <span className="waiting">⧗</span>
            ) : (
              <button onClick={() => onDelete(todo.id)}>✖</button>
            )}
          </li>
        ))
      )}
    </ul>
  );
}

export default TodoList; 