import React, { useState } from 'react';

function CreateEventForm({ onEventCreated }) {
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('Creating...');
    setIsError(false);

    const newEvent = { Description: description, Address: address };

    fetch('http://localhost:8000/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.detail || 'An unknown server error occurred.');
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.Id) {
          setStatus(`Event "${data.Description}" created successfully!`);
          setDescription('');
          setAddress('');
          onEventCreated(data); // Notify parent component
        }
      })
      .catch(error => {
        setStatus(error.message);
        setIsError(true);
      });
  };

  return (
    <div className="panel">
      <h2>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="event-description">Description</label>
          <input
            type="text"
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="event-address">Address</label>
          <input
            type="text"
            id="event-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <button type="submit">Create Event</button>
      </form>
      {status && (
        <p className={`status-message ${isError ? 'error' : 'success'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export default CreateEventForm;