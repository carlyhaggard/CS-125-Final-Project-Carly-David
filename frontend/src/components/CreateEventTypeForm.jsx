import React, { useState } from 'react';

const API_URL = 'http://localhost:8000';

function CreateEventTypeForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('Creating...');
    setIsError(false);

    const newEventType = {
      name,
      description,
      custom_fields: [],
    };

    fetch(`${API_URL}/event-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEventType),
    })
      .then(response => {
        if (!response.ok) {
          // Try to get the detailed error from the backend
          return response.json().then(err => {
            throw new Error(err.detail || 'An unknown server error occurred.');
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.id) {
          setStatus(`Event type "${data.name}" created successfully!`);
          setName('');
          setDescription('');
        }
      })
      .catch(error => {
        // Display the specific error message
        setStatus(error.message);
        setIsError(true);
      });
  };

  return (
    <div className="panel">
      <h2>Create New Event Type</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button type="submit">Create</button>
      </form>
      {status && (
        <p className={`status-message ${isError ? 'error' : 'success'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export default CreateEventTypeForm;