import React, { useState, useEffect } from 'react';
import { fetchTodos, createTodo, deleteTodo } from './todoApi';
import useWebSocket from 'react-use-websocket';
import TodoInput from './components/TodoInput';
import TodoButton from './components/TodoButton';
import TodoList from './components/TodoList';
import LogTerminal from './components/LogTerminal';
import randomTodos from './randomTodos';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [mode, setMode] = useState('Safe'); // State to toggle between modes

  useWebSocket('ws://localhost:7687', {
    onOpen: () => setLogs(prevLogs => [...prevLogs, '⚡️ WebSocket - Connection opened']),
    onClose: () => setLogs(prevLogs => [...prevLogs, '⚡️ WebSocket - Connection closed']),
    onError: (error) => setLogs(prevLogs => [...prevLogs, `⚡️ WebSocket - Error: ${error}`]),
    onMessage: (event) => {
      const { verb, payload } = JSON.parse(event.data);
      setLogs(prevLogs => [...prevLogs, `⚡️ WebSocket - Received message '${verb}' for todo '${payload.text}'`]);

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
    handleModeChange('Safe');
    setNewTodoText(randomTodos[Math.floor(Math.random() * randomTodos.length)]);
    const fetchTodosWrapper = async () => {
      setLogs(prevLogs => [...prevLogs, "☁️ HTTP - Fetching todos via HTTP..."]);
      const fetchedTodos = await fetchTodos({
        onFailure: () => {
          setLogs(prevLogs => [...prevLogs, "☁️ HTTP - Failed to fetch todos, please check your network connection."]);
          toast.error("Failed to fetch todos, please check your network connection.")
        }
      });
      setTodos(fetchedTodos);
      setLoading(false);
      setLogs(prevLogs => [...prevLogs, "☁️ HTTP - Todos fetched successfully via HTTP"]);
    };
    fetchTodosWrapper();
  }, []);

  const handleAddTodo = async () => {
    if (newTodoText.trim()) {
      const tempId = Date.now();
      setTodos([...todos, { id: tempId, text: newTodoText, confirmed: false, className: 'new-item' }]);
      setNewTodoText('');

      try {
        setNewTodoText(randomTodos[Math.floor(Math.random() * randomTodos.length)]);
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Creating todo: ${newTodoText}`]);
        const newTodo = await createTodo({ text: newTodoText });
        setTodos(prevTodos =>
          prevTodos.map(todo =>
            todo.id === tempId ? { ...newTodo, confirmed: true, className: '' } : todo
          )
        );
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Todo created: ${newTodoText}`]);
      } catch (error) {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== tempId));
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Failed to create todo: ${error}`]);
      }
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Deleting todo with id: ${id}`]);
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === id ? { ...todo, className: 'deleting' } : todo
        )
      );
      await deleteTodo(id);
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Todo deleted with id: ${id}`]);
    } catch (error) {
      setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Failed to delete todo with id: ${id}`]);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setLogs(prevLogs => {
      let explanation = '';
      switch (newMode) {
        case 'Safe':
          explanation = 'Safe mode waits for websocket confirmation before updating the UX. It is the most reliable mode.';
          break;
        case 'Optimistic':
          explanation = 'Optimistic mode waits for HTTP confirmation before updating the UX and ignores websocket confirmation.';
          break;
        case 'Brave':
          explanation = 'Brave mode waits for neither websocket nor HTTP confirmation before updating the UX. This is the most performant mode.';
          break;
        default:
          explanation = 'Unknown mode.';
      }
      return [...prevLogs, `🔄 Mode changed to: ${newMode}. ${explanation}`];
    });
  };

  return (
    <div className="App">
      <div className="mode-toggle">
        <label>
          <input
            type="radio"
            value="Safe"
            checked={mode === 'Safe'}
            onChange={() => handleModeChange('Safe')}
          />
          Safe Mode
        </label>
        <label>
          <input
            type="radio"
            value="Optimistic"
            checked={mode === 'Optimistic'}
            onChange={() => handleModeChange('Optimistic')}
          />
          Optimistic Mode
        </label>
        <label>
          <input
            type="radio"
            value="Brave"
            checked={mode === 'Brave'}
            onChange={() => handleModeChange('Brave')}
          />
          Brave Mode
        </label>
      </div>
      <div className="main-content">
        <div className="todolist">
          <TodoInput value={newTodoText || ''} onChange={(e) => setNewTodoText(e.target.value)} />
          <TodoButton onClick={handleAddTodo} />
          <TodoList todos={todos} loading={loading} onDelete={handleDeleteTodo} />
        </div>
        <LogTerminal logs={logs} />
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
