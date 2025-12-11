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
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <h2 className="text-xl font-bold">Create New Event Type</h2>
        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          Define a new event type for organizing events
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 bg-white dark:bg-gray-800 space-y-6">
        <div>
          <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
            placeholder="e.g., Youth Retreat"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Description
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
            placeholder="e.g., Annual youth retreat event"
          />
        </div>

        <button
          type="submit"
          className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Create Event Type
        </button>
      </form>

      {/* Status Message */}
      {status && (
        <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <div className={`p-4 text-sm rounded-lg ${
            isError
              ? 'text-red-800 bg-red-50 dark:bg-gray-700 dark:text-red-400'
              : 'text-green-800 bg-green-50 dark:bg-gray-700 dark:text-green-400'
          }`} role="alert">
            {status}
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateEventTypeForm;