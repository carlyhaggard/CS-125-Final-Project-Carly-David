import React from 'react';

function EventList({ events, onEventSelect, selectedEvent, onEventDelete }) {
  const handleDelete = (e, eventId) => {
    e.stopPropagation(); // Prevent triggering onEventSelect
    if (window.confirm('Are you sure you want to delete this event? This will also delete all registrations.')) {
      onEventDelete(eventId);
    }
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <h2 className="text-xl font-bold">Events</h2>
        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          Select an event to view registrations and manage check-ins
        </p>
      </div>

      {/* Events Grid */}
      <div className="p-5 bg-white dark:bg-gray-900 grid grid-cols-1 gap-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No events found. Create an event to get started!
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.Id}
              onClick={() => onEventSelect(event)}
              className={`p-6 rounded-lg border cursor-pointer transition-all ${
                selectedEvent?.Id === event.Id
                  ? 'bg-blue-50 border-blue-500 dark:bg-blue-900 dark:border-blue-500'
                  : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {event.Description}
                  </h3>
                  {event.Address && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.Address}
                    </p>
                  )}
                  {selectedEvent?.Id === event.Id && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mt-2">
                      Selected
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, event.Id)}
                  title="Delete event"
                  className="ml-4 font-medium text-red-600 dark:text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EventList;