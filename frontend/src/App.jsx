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

  const fetchEvents = () => {
    fetch(`${API_URL}/events`)
      .then(response => response.json())
      .then(data => setEvents(data))
      .catch(error => console.error('Error fetching events:', error));
  };

  useEffect(() => {
    fetchEvents(); // Fetch events on initial load
  }, []);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setCheckInStatus('');
    fetch(`${API_URL}/events/${event.Id}/registrations`)
      .then(response => response.json())
      .then(data => setRegistrations(data))
      .catch(error => console.error('Error fetching registrations:', error));
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
        setCheckInStatus(`Student ${studentId} status: ${data.status}`);
      })
      .catch(() => setCheckInStatus('Error during check-in.'));
  };

  const handleEventCreated = (newEvent) => {
    setEvents(prevEvents => [...prevEvents, newEvent]);
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
              />
            </div>
            <div className="column">
              <EventDetails
                event={selectedEvent}
                registrations={registrations}
                onCheckIn={handleCheckIn}
                checkInStatus={checkInStatus}
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