import React from 'react';

function EventDetails({ event, registrations, onCheckIn, checkInStatus }) {
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
        {registrations.map(reg => (
          <li key={reg.Id}>
            <span>{reg.FirstName} {reg.LastName} ({reg.Grade})</span>
            <button onClick={() => onCheckIn(reg.StudentID)}>Check-in</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EventDetails;