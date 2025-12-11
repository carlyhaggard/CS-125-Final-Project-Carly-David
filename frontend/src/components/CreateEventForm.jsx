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
          })
        );

        await Promise.all(registrationPromises);

        setStatus(`Event "${eventData.Description}" created with ${selectedStudents.length} student(s) registered!`);
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
    return <div className="panel"><p>Loading...</p></div>;
  }

  return (
    <div className="panel">
      <h2>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="event-description">Description *</label>
          <input
            type="text"
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Summer Retreat 2024"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-address">Address *</label>
          <input
            type="text"
            id="event-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Camp Road, Santa Barbara, CA"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-type">Event Type</label>
          <select
            id="event-type"
            value={eventTypeId}
            onChange={(e) => setEventTypeId(e.target.value)}
          >
            <option value="">-- Select Event Type (Optional) --</option>
            {eventTypes.map(type => (
              <option key={type.typeId} value={type.typeId}>
                {type.name} - {type.description}
              </option>
            ))}
          </select>
          {eventTypes.length === 0 && (
            <p className="help-text">No event types available. Create one first!</p>
          )}
        </div>

        <div className="form-group">
          <label>Register Students</label>
          <div className="student-checkbox-list">
            {students.length === 0 ? (
              <p className="help-text">No students available</p>
            ) : (
              students.map(student => (
                <label key={student.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudentSelection(student.id)}
                  />
                  {student.firstName} {student.lastName}
                </label>
              ))
            )}
          </div>
          <p className="help-text">
            {selectedStudents.length} student(s) selected
          </p>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Create Event'}
        </button>
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
