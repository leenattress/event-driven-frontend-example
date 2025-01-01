import React, { useRef, useEffect } from 'react';
import './LogTerminal.css';

function LogTerminal({ logs }) {
  const logRef = useRef();

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="log-terminal" ref={logRef}>
      {logs.map((log, index) => (
        <div key={index} className="log-item">{log}</div>
      ))}
    </div>
  );
}

export default LogTerminal; 