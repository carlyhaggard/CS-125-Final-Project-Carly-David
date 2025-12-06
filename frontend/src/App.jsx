import React, { useState, useEffect } from 'react';
import EventList from './components/EventList';
import EventDetails from './components/EventDetails';
import CreateEventTypeForm from './components/CreateEventTypeForm';
import CreateEventForm from './components/CreateEventForm'; // Import the new form
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
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

  // This function will be called by the new form when an event is created
  const handleEventCreated = (newEvent) => {
    setEvents(prevEvents => [...prevEvents, newEvent]);
  };

  return (
    <div className="App">
      <header>
        <h1>Youth Group Dashboard</h1>
      </header>
      <main className="main-layout">
        <div className="column">
          <EventList
            events={events}
            selectedEvent={selectedEvent}
            onEventSelect={handleEventSelect}
          />
          <CreateEventForm onEventCreated={handleEventCreated} />
          <CreateEventTypeForm />
        </div>
        <div className="column">
          <EventDetails
            event={selectedEvent}
            registrations={registrations}
            onCheckIn={handleCheckIn}
            checkInStatus={checkInStatus}
          />
        </div>
      </main>
    </div>
  );
}

export default App;