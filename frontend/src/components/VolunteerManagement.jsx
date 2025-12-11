import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'flowbite-react';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

const API_URL = 'http://localhost:8000';

function VolunteerManagement() {
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [deletingVolunteer, setDeletingVolunteer] = useState(null);
  const [assigningVolunteer, setAssigningVolunteer] = useState(null);

  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    Email: '',
    Phone: ''
  });

  // Assignment state
  const [selectedEventIds, setSelectedEventIds] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [volunteersRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/volunteers`),
        fetch(`${API_URL}/events`)
      ]);

      if (!volunteersRes.ok || !eventsRes.ok) throw new Error('Failed to fetch data');

      const volunteersData = await volunteersRes.json();
      const eventsData = await eventsRes.json();

      setVolunteers(volunteersData);
      setEvents(eventsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_URL}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create volunteer');

      const saved = await response.json();
      setSuccessMessage(`${saved.FirstName} ${saved.LastName} added successfully!`);
      setFormData({ FirstName: '', LastName: '', Email: '', Phone: '' });
      setShowCreateDrawer(false);
      setShowSuccessModal(true);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_URL}/volunteers/${editingVolunteer.Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update volunteer');

      const saved = await response.json();
      setSuccessMessage(`${saved.FirstName} ${saved.LastName} updated successfully!`);
      setShowEditModal(false);
      setShowSuccessModal(true);
      setEditingVolunteer(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      FirstName: volunteer.FirstName,
      LastName: volunteer.LastName || '',
      Email: volunteer.Email || '',
      Phone: volunteer.Phone
    });
    setShowEditModal(true);
    setError(null);
  };

  const openDeleteModal = (volunteer) => {
    setDeletingVolunteer(volunteer);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/volunteers/${deletingVolunteer.Id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete volunteer');

      setSuccessMessage(`${deletingVolunteer.FirstName} ${deletingVolunteer.LastName} deleted successfully!`);
      setShowDeleteModal(false);
      setShowSuccessModal(true);
      setDeletingVolunteer(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const startAssigning = async (volunteer) => {
    setAssigningVolunteer(volunteer);

    // Fetch volunteer's current events
    try {
      const response = await fetch(`${API_URL}/volunteers/${volunteer.Id}`);
      const data = await response.json();
      setSelectedEventIds(data.events?.map(e => e.Id) || []);
      setShowAssignModal(true);
    } catch (err) {
      setError('Failed to load volunteer details');
    }
  };

  const toggleEventAssignment = async (eventId) => {
    const isAssigned = selectedEventIds.includes(eventId);

    try {
      if (isAssigned) {
        // Unassign
        await fetch(`${API_URL}/volunteers/assign/${assigningVolunteer.Id}/${eventId}`, { method: 'DELETE' });
        setSelectedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        // Assign
        await fetch(`${API_URL}/volunteers/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ VolunteerID: assigningVolunteer.Id, EventID: eventId })
        });
        setSelectedEventIds(prev => [...prev, eventId]);
      }
      setSuccessMessage(`Event ${isAssigned ? 'removed' : 'assigned'}!`);
    } catch (err) {
      setError('Failed to update assignment');
    }
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <div>
          <h2 className="text-xl font-bold">Volunteers</h2>
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Manage event volunteers
          </p>
        </div>
        <button
          onClick={() => setShowCreateDrawer(true)}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Add Volunteer
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800">
          <div className="text-gray-500 dark:text-gray-400">Loading volunteers...</div>
        </div>
      ) : volunteers.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          No volunteers found. Add your first volunteer above!
        </div>
      ) : (
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Contact</th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((volunteer) => (
              <tr key={volunteer.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {volunteer.FirstName} {volunteer.LastName}
                </th>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div>{volunteer.Email || '—'}</div>
                    <div className="text-gray-500 dark:text-gray-400">{volunteer.Phone}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => startAssigning(volunteer)}
                    className="font-medium text-green-600 dark:text-green-500 hover:underline mr-4"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => openEditModal(volunteer)}
                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(volunteer)}
                    className="font-medium text-red-600 dark:text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create Modal */}
      <Modal show={showCreateDrawer} size="md" onClose={() => setShowCreateDrawer(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleCreate} className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Add New Volunteer</h3>
            <div>
              <label htmlFor="FirstName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                First Name
              </label>
              <input
                type="text"
                name="FirstName"
                id="FirstName"
                value={formData.FirstName}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="LastName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Last Name
              </label>
              <input
                type="text"
                name="LastName"
                id="LastName"
                value={formData.LastName}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="Email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Email
              </label>
              <input
                type="email"
                name="Email"
                id="Email"
                value={formData.Email}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="Phone" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Phone
              </label>
              <input
                type="tel"
                name="Phone"
                id="Phone"
                value={formData.Phone}
                onChange={handleInputChange}
                placeholder="1234567890"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Add Volunteer
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} size="md" onClose={() => setShowEditModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleUpdate} className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Edit Volunteer</h3>
            <div>
              <label htmlFor="edit-FirstName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                First Name
              </label>
              <input
                type="text"
                name="FirstName"
                id="edit-FirstName"
                value={formData.FirstName}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-LastName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Last Name
              </label>
              <input
                type="text"
                name="LastName"
                id="edit-LastName"
                value={formData.LastName}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="edit-Email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Email
              </label>
              <input
                type="email"
                name="Email"
                id="edit-Email"
                value={formData.Email}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="edit-Phone" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Phone
              </label>
              <input
                type="tel"
                name="Phone"
                id="edit-Phone"
                value={formData.Phone}
                onChange={handleInputChange}
                placeholder="1234567890"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Update Volunteer
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Assign Events Modal */}
      <Modal show={showAssignModal} size="md" onClose={() => setShowAssignModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Assign Events to {assigningVolunteer?.FirstName} {assigningVolunteer?.LastName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select events to assign to this volunteer:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map(event => (
                <label key={event.Id} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEventIds.includes(event.Id)}
                    onChange={() => toggleEventAssignment(event.Id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    {event.Description} - {event.Address}
                  </span>
                </label>
              ))}
              {events.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No events available
                </div>
              )}
            </div>
            <Button onClick={() => setShowAssignModal(false)} className="w-full">
              Done
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} size="md" onClose={() => setShowDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to delete {deletingVolunteer?.FirstName} {deletingVolunteer?.LastName}?
            </h3>
            <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
              This will remove all event assignments.
            </p>
            <div className="flex justify-center gap-4">
              <Button color="failure" onClick={handleDelete}>
                Yes, I'm sure
              </Button>
              <Button color="gray" onClick={() => setShowDeleteModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Success Modal */}
      <Modal show={showSuccessModal} size="md" onClose={() => setShowSuccessModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <svg className="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
            </svg>
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              {successMessage}
            </h3>
            <Button onClick={() => setShowSuccessModal(false)}>
              Continue
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default VolunteerManagement;
