import React from 'react';

function TodoInput({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Enter Item"
    />
  );
}

export default TodoInput; 