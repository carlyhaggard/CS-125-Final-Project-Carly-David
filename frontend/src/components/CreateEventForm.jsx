import React, { useState, useEffect } from 'react';

function CreateEventForm({ onEventCreated }) {
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  // Data from API
  const [eventTypes, setEventTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch event types and students on component mount
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/event-types').then(res => res.json()),
      fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ students { id firstName lastName } }'
        })
      }).then(res => res.json())
    ])
      .then(([eventTypesData, studentsData]) => {
        setEventTypes(eventTypesData || []);
        setStudents(studentsData.data?.students || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Creating event...');
    setIsError(false);

    try {
      // Step 1: Create the event
      const newEvent = {
        Description: description,
        Address: address,
        TypeID: eventTypeId ? parseInt(eventTypeId) : null
      };

      const eventResponse = await fetch('http://localhost:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });

      if (!eventResponse.ok) {
        const err = await eventResponse.json();
        throw new Error(err.detail || 'Failed to create event');
      }

      const eventData = await eventResponse.json();
      const eventId = eventData.Id;

      // Step 2: Register selected students for the event
      if (selectedStudents.length > 0) {
        setStatus('Registering students...');

        const registrationPromises = selectedStudents.map(studentId =>
          fetch('http://localhost:8000/registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              EventID: eventId,
              StudentID: studentId
            })
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Failed to register student ${studentId}`);
            }
            return res.json();
          })
        );

        const registrationResults = await Promise.all(registrationPromises);

        setStatus(`Event "${eventData.Description}" created with ${registrationResults.length} student(s) registered! Go to "Events & Check-In" tab to view.`);
      } else {
        setStatus(`Event "${eventData.Description}" created successfully!`);
      }

      // Reset form
      setDescription('');
      setAddress('');
      setEventTypeId('');
      setSelectedStudents([]);
      onEventCreated(eventData);

    } catch (error) {
      setStatus(error.message);
      setIsError(true);
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <div className="text-center py-8 bg-white dark:bg-gray-800">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <h2 className="text-xl font-bold">Create New Event</h2>
        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          Fill in the details to create a new event and register students
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 bg-white dark:bg-gray-800 space-y-6">
        <div>
          <label htmlFor="event-description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Description *
          </label>
          <input
            type="text"
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Summer Retreat 2024"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="event-address" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Address *
          </label>
          <input
            type="text"
            id="event-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Camp Road, Santa Barbara, CA"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="event-type" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Event Type
          </label>
          <select
            id="event-type"
            value={eventTypeId}
            onChange={(e) => setEventTypeId(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
          >
            <option value="">-- Select Event Type (Optional) --</option>
            {eventTypes.map(type => (
              <option key={type.typeId} value={type.typeId}>
                {type.name} - {type.description}
              </option>
            ))}
          </select>
          {eventTypes.length === 0 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No event types available. Create one first!</p>
          )}
        </div>

        <div>
          <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
            Register Students
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto p-4 bg-gray-50 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600">
            {students.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No students available</p>
            ) : (
              students.map(student => (
                <label key={student.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudentSelection(student.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    {student.firstName} {student.lastName}
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedStudents.length} student(s) selected
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Event'}
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

export default CreateEventForm;
