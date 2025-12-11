import React from 'react';

function EventDetails({ event, registrations, onCheckIn, checkInStatus, checkedInStudents }) {
  if (!event) {
    return (
      <div className="panel">
        <h2>Event Details</h2>
        <p>Select an event to see its registrations.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Registrations for {event.Description}</h2>
      {checkInStatus && <p className="status-message">{checkInStatus}</p>}
      <ul className="item-list">
        {registrations.map(reg => {
          const isCheckedIn = checkedInStudents.has(reg.StudentID);
          return (
            <li key={reg.Id} className={isCheckedIn ? 'checked-in' : ''}>
              <span>{reg.FirstName} {reg.LastName} ({reg.Grade})</span>
              <button
                onClick={() => onCheckIn(reg.StudentID)}
                className={isCheckedIn ? 'checked-in-btn' : ''}
              >
                {isCheckedIn ? 'Checked In ✓' : 'Check-in'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default EventDetails;