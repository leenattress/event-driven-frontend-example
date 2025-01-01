import React, { useRef } from 'react';
import './LogTerminal.css';

function LogTerminal({ logs }) {
  const logRef = useRef();

  return (
    <div className="log-terminal" ref={logRef}>
      {logs.map((log, index) => (
        <div key={index} className="log-item">{log}</div>
      ))}
    </div>
  );
}

export default LogTerminal; 