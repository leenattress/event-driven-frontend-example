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

const MODE_EXPLANATIONS = {
  Safe: 'Safe mode waits for websocket confirmation before updating the UX. It is the slowest but most reliable mode.',
  Optimistic: 'Optimistic mode waits for HTTP confirmation before updating the UX and ignores websocket confirmation. This is how most web apps work.',
  Brave: 'Brave mode waits for neither websocket nor HTTP confirmation before updating the UX. This is the most performant and dangerous mode.',
};

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
      setLogs(prevLogs => [...prevLogs, `⚡️ WebSocket - Received confirmation for '${verb}' for todo ${payload.id}`]);

      switch (verb) {
        case 'create':
          if (payload && payload.id && mode === 'Safe') {
            const existingTodo = todos.find(todo => todo.id === payload.id);
            if (existingTodo) {
              setTodos(prevTodos => prevTodos.map(todo =>
                todo.id === payload.id ? { ...payload, confirmed: true } : todo
              ));
            } else {
              setTodos(prevTodos => [...prevTodos, payload]);
            }
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
          if (payload && mode === 'Safe') {
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
      setLogs(prevLogs => [...prevLogs, "☁️ HTTP - Fetching all todos via HTTP..."]);
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
      const newTodo = { id: tempId, text: newTodoText, confirmed: true };
      
      if (mode === 'Brave') {
        setTodos(prevTodos => [...prevTodos, newTodo]);
        setNewTodoText(randomTodos[Math.floor(Math.random() * randomTodos.length)]);
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Creating todo: ${newTodoText} with id: ${tempId}`]);
        createTodo(newTodo).catch(error => {
          setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Failed to create todo: ${error}`]);
        });
      } else {
        setTodos([...todos, { ...newTodo, waiting: true, confirmed: false, className: 'new-item' }]);
        setNewTodoText('');

        try {
          setNewTodoText(randomTodos[Math.floor(Math.random() * randomTodos.length)]);
          setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Creating todo: ${newTodoText} with id: ${tempId}`]);
          const createdTodo = await createTodo(newTodo);
          if (mode === 'Optimistic') {
            setTodos(prevTodos =>
              prevTodos.map(todo =>
                todo.id === tempId ? { ...createdTodo, confirmed: true, className: '' } : todo
              )
            );
          }
          setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Todo created: ${newTodoText}`]);
        } catch (error) {
          setTodos(prevTodos => prevTodos.filter(todo => todo.id !== tempId));
          setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Failed to create todo: ${error}`]);
        }
      }
    }
  };

  const handleDeleteTodo = async (id) => {
    if (mode === 'Brave') {
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Deleting todo with id: ${id}`]);
      deleteTodo(id).catch(error => {
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Failed to delete todo with id: ${id}`]);
      });
    } else {
      try {
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Deleting todo with id: ${id}`]);
        setTodos(prevTodos =>
          prevTodos.map(todo =>
            todo.id === id ? { ...todo, className: 'deleting', waiting: true } : todo
          )
        );
        await deleteTodo(id);
        if (mode === 'Optimistic') {
          setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
        }
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Todo deleted with id: ${id}`]);
      } catch (error) {
        setLogs(prevLogs => [...prevLogs, `☁️ HTTP - Failed to delete todo with id: ${id}`]);
      }
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setLogs(prevLogs => [...prevLogs, `🔄 Mode changed to: ${newMode}. ${MODE_EXPLANATIONS[newMode] || 'Unknown mode.'}`]);
  };

  return (
    <div className="App">
      <h1>🚀 Resilient Todo App</h1>
      <h2>An app that pretends to suffer from terrible network and scale issues</h2>
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
      <blockquote>
        {MODE_EXPLANATIONS[mode] || 'Unknown mode.'}
      </blockquote>
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
