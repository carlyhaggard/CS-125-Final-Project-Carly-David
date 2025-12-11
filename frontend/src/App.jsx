import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import EventList from './components/EventList';
import EventDetails from './components/EventDetails';
import CreateEventTypeForm from './components/CreateEventTypeForm';
import CreateEventForm from './components/CreateEventForm';
import GraphQLDemo from './components/GraphQLDemo';
import StudentManagement from './components/StudentManagement';
import ParentManagement from './components/ParentManagement';
import SmallGroupManagement from './components/SmallGroupManagement';
import LeaderManagement from './components/LeaderManagement';
import VolunteerManagement from './components/VolunteerManagement';
import FunFeatures from './components/FunFeatures';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('events');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    fetchEvents();
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

    fetch(`${API_URL}/events/${event.Id}/registrations`)
      .then(response => response.json())
      .then(data => setRegistrations(data))
      .catch(error => console.error('Error fetching registrations:', error));

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

      setEvents(prevEvents => prevEvents.filter(e => e.Id !== eventId));

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
    <div className="dark">
      <div className="bg-gray-900 min-h-screen">
        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content */}
        <div className="p-4 sm:ml-64 mt-14">
          <div className="p-4">
          {activeTab === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EventList
                events={events}
                selectedEvent={selectedEvent}
                onEventSelect={handleEventSelect}
                onEventDelete={handleEventDelete}
              />
              <EventDetails
                event={selectedEvent}
                registrations={registrations}
                onCheckIn={handleCheckIn}
                checkInStatus={checkInStatus}
                checkedInStudents={checkedInStudents}
              />
            </div>
          )}

          {activeTab === 'students' && <StudentManagement />}
          {activeTab === 'parents' && <ParentManagement />}
          {activeTab === 'groups' && <SmallGroupManagement />}
          {activeTab === 'leaders' && <LeaderManagement />}
          {activeTab === 'volunteers' && <VolunteerManagement />}
          {activeTab === 'fun' && <FunFeatures />}
          {activeTab === 'graphql' && <GraphQLDemo />}

          {activeTab === 'manage' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CreateEventForm onEventCreated={handleEventCreated} />
              <CreateEventTypeForm />
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
