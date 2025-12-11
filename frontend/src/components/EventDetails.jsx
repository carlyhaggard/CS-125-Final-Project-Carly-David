import React from 'react';

function EventDetails({ event, registrations, onCheckIn, checkInStatus, checkedInStudents }) {
  if (!event) {
    return (
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
          <h2 className="text-xl font-bold">Event Details</h2>
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Select an event to see its registrations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <h2 className="text-xl font-bold">Registrations for {event.Description}</h2>
        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          Manage student check-ins for this event
        </p>
      </div>

      {/* Status Alert */}
      {checkInStatus && (
        <div className="p-4 mx-5 mt-5 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-700 dark:text-green-400" role="alert">
          {checkInStatus}
        </div>
      )}

      {/* Registrations Table */}
      {registrations.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          No registrations for this event yet.
        </div>
      ) : (
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Student Name</th>
              <th scope="col" className="px-6 py-3">Grade</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(reg => {
              const isCheckedIn = checkedInStudents.has(reg.StudentID);
              return (
                <tr key={reg.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    {reg.FirstName} {reg.LastName}
                  </th>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                      {reg.Grade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isCheckedIn ? (
                      <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                        Checked In
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                        Not Checked In
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onCheckIn(reg.StudentID)}
                      className={`font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none ${
                        isCheckedIn
                          ? 'text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800'
                          : 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
                      }`}
                    >
                      {isCheckedIn ? 'Checked In' : 'Check In'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EventDetails;