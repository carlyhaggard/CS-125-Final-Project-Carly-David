import React, { useState, useEffect } from 'react';
import EventList from './components/EventList';
import EventDetails from './components/EventDetails';
import CreateEventTypeForm from './components/CreateEventTypeForm';
import CreateEventForm from './components/CreateEventForm';
import GraphQLDemo from './components/GraphQLDemo';
import StudentList from './components/StudentList';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState('');
  const [checkedInStudents, setCheckedInStudents] = useState(new Set());

  const fetchEvents = () => {
    fetch(`${API_URL}/events`)
      .then(response => response.json())
      .then(data => setEvents(data))
      .catch(error => console.error('Error fetching events:', error));
  };

  useEffect(() => {
    fetchEvents(); // Fetch events on initial load
  }, []);

  const fetchLiveAttendance = (eventId) => {
    fetch(`${API_URL}/redis/events/${eventId}/attendance`)
      .then(response => response.json())
      .then(data => {
        const checkedInIds = new Set(data.students.map(s => s.student_id));
        setCheckedInStudents(checkedInIds);
      })
      .catch(error => console.error('Error fetching attendance:', error));
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setCheckInStatus('');

    // Fetch registrations
    fetch(`${API_URL}/events/${event.Id}/registrations`)
      .then(response => response.json())
      .then(data => setRegistrations(data))
      .catch(error => console.error('Error fetching registrations:', error));

    // Fetch live attendance status
    fetchLiveAttendance(event.Id);
  };

  const handleCheckIn = (studentId) => {
    if (!selectedEvent) return;

    setCheckInStatus('Processing...');
    fetch(`${API_URL}/redis/events/${selectedEvent.Id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    })
      .then(response => response.json())
      .then(data => {
        setCheckInStatus(`${data.status}`);

        // Update the checked-in status locally
        setCheckedInStudents(prev => {
          const newSet = new Set(prev);
          if (data.status === 'CHECKED IN') {
            newSet.add(studentId);
          } else {
            newSet.delete(studentId);
          }
          return newSet;
        });
      })
      .catch(() => setCheckInStatus('Error during check-in.'));
  };

  const handleEventCreated = (newEvent) => {
    setEvents(prevEvents => [...prevEvents, newEvent]);
  };

  const handleEventDelete = async (eventId) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        alert(`Failed to delete event: ${err.detail}`);
        return;
      }

      // Remove from local state
      setEvents(prevEvents => prevEvents.filter(e => e.Id !== eventId));

      // Clear selected event if it was deleted
      if (selectedEvent?.Id === eventId) {
        setSelectedEvent(null);
        setRegistrations([]);
      }

      alert('Event deleted successfully!');
    } catch (error) {
      alert(`Error deleting event: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>🏫 Youth Group Management System</h1>
        <p className="header-subtitle">Multi-Database Architecture with GraphQL</p>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📅 Events & Check-In
        </button>
        <button
          className={`tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👥 Students
        </button>
        <button
          className={`tab ${activeTab === 'graphql' ? 'active' : ''}`}
          onClick={() => setActiveTab('graphql')}
        >
          🚀 GraphQL Demo
        </button>
        <button
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          ⚙️ Manage
        </button>
      </nav>

      {/* Tab Content */}
      <main className="main-layout">
        {activeTab === 'events' && (
          <>
            <div className="column">
              <EventList
                events={events}
                selectedEvent={selectedEvent}
                onEventSelect={handleEventSelect}
                onEventDelete={handleEventDelete}
              />
            </div>
            <div className="column">
              <EventDetails
                event={selectedEvent}
                registrations={registrations}
                onCheckIn={handleCheckIn}
                checkInStatus={checkInStatus}
                checkedInStudents={checkedInStudents}
              />
            </div>
          </>
        )}

        {activeTab === 'students' && (
          <div className="column-full">
            <StudentList />
          </div>
        )}

        {activeTab === 'graphql' && (
          <div className="column-full">
            <GraphQLDemo />
          </div>
        )}

        {activeTab === 'manage' && (
          <>
            <div className="column">
              <CreateEventForm onEventCreated={handleEventCreated} />
            </div>
            <div className="column">
              <CreateEventTypeForm />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          <strong>Tech Stack:</strong> React + Vite | FastAPI + GraphQL | MySQL + MongoDB + Redis
        </p>
        <p className="footer-links">
          <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">
            REST API Docs
          </a>
          {' | '}
          <a href="http://localhost:8000/graphql" target="_blank" rel="noopener noreferrer">
            GraphiQL Interface
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;