import React, { useState, useEffect } from 'react';
import { fetchTodos, createTodo, deleteTodo } from './todoApi';
import useWebSocket from 'react-use-websocket';
import TodoInput from './components/TodoInput';
import TodoButton from './components/TodoButton';
import TodoList from './components/TodoList';
import randomTodos from './randomTodos';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [loading, setLoading] = useState(true);

  useWebSocket('ws://localhost:7687', {
    onOpen: () => console.log('WebSocket connection opened'),
    onClose: () => console.log('WebSocket connection closed'),
    onError: (error) => console.error('WebSocket error:', error),
    onMessage: (event) => {
      const { verb, payload } = JSON.parse(event.data);
      
      switch (verb) {
        case 'create':
          if (payload && payload.id) {
            setTodos(prevTodos => {
              const todoExists = prevTodos.some(todo => todo.id === payload.id);
              if (todoExists) {
                return prevTodos.map(todo => 
                  todo.id === payload.id ? { ...todo, confirmed: true, text: `${payload.text} ⚡️` } : todo
                );
              } else {
                return [...prevTodos, { id: payload.id, text: `${payload.text} ⚡️`, confirmed: true }];
              }
            });
          }
          break;
        case 'update':
          if (payload && payload.id) {
            setTodos(prevTodos =>
              prevTodos.map(todo =>
                todo.id === payload.id ? { ...todo, text: payload.text, completed: payload.completed } : todo
              )
            );
          }
          break;
        case 'delete':
          if (payload) {
            setTodos(prevTodos => prevTodos.filter(todo => todo.id !== payload));
          }
          break;
        default:
          console.warn(`Unhandled verb: ${verb}`);
      }
    },
    shouldReconnect: () => true,
  });

  useEffect(() => {
    setNewTodoText(randomTodos[Math.floor(Math.random() * randomTodos.length)]);
    fetchTodos().then(fetchedTodos => {
      setTodos(fetchedTodos);
      setLoading(false);      
    });
  }, []);

  const handleAddTodo = async () => {
    if (newTodoText.trim()) {
      const tempId = Date.now();
      setTodos([...todos, { id: tempId, text: newTodoText, confirmed: false, className: 'new-item' }]);
      setNewTodoText('');
      
      try {
        setNewTodoText(randomTodos[Math.floor(Math.random() * randomTodos.length)]);
        const newTodo = await createTodo({ text: newTodoText });
        setTodos(prevTodos => 
          prevTodos.map(todo => 
            todo.id === tempId ? { ...newTodo, confirmed: true, className: '' } : todo
          )
        );
      } catch (error) {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== tempId));
        console.error('Failed to create todo:', error);
      }
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === id ? { ...todo, className: 'deleting' } : todo
        )
      );
      await deleteTodo(id);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  return (
    <div className="App">
      <div className="todolist">
        <TodoInput value={newTodoText || ''} onChange={(e) => setNewTodoText(e.target.value)} />
        <TodoButton onClick={handleAddTodo} />
        <TodoList todos={todos} loading={loading} onDelete={handleDeleteTodo} />
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
