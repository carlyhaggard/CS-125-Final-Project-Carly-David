import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'flowbite-react';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

const API_URL = 'http://localhost:8000';

function LeaderManagement() {
  const [leaders, setLeaders] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [deletingLeader, setDeletingLeader] = useState(null);

  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    SmallGroupID: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadersRes, groupsRes] = await Promise.all([
        fetch(`${API_URL}/leaders`),
        fetch(`${API_URL}/small-groups`)
      ]);

      if (!leadersRes.ok || !groupsRes.ok) throw new Error('Failed to fetch data');

      const leadersData = await leadersRes.json();
      const groupsData = await groupsRes.json();

      setLeaders(leadersData);
      setGroups(groupsData);
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
      const payload = {
        FirstName: formData.FirstName,
        LastName: formData.LastName,
        SmallGroupID: formData.SmallGroupID ? parseInt(formData.SmallGroupID) : null
      };

      const response = await fetch(`${API_URL}/leaders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create leader');

      const saved = await response.json();
      setSuccessMessage(`${saved.FirstName} ${saved.LastName} added successfully!`);
      setFormData({ FirstName: '', LastName: '', SmallGroupID: '' });
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
      const payload = {
        FirstName: formData.FirstName,
        LastName: formData.LastName,
        SmallGroupID: formData.SmallGroupID ? parseInt(formData.SmallGroupID) : null
      };

      const response = await fetch(`${API_URL}/leaders/${editingLeader.Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to update leader');

      const saved = await response.json();
      setSuccessMessage(`${saved.FirstName} ${saved.LastName} updated successfully!`);
      setShowEditModal(false);
      setShowSuccessModal(true);
      setEditingLeader(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (leader) => {
    setEditingLeader(leader);
    setFormData({
      FirstName: leader.FirstName,
      LastName: leader.LastName || '',
      SmallGroupID: leader.SmallGroupID || ''
    });
    setShowEditModal(true);
    setError(null);
  };

  const openDeleteModal = (leader) => {
    setDeletingLeader(leader);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/leaders/${deletingLeader.Id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete leader');

      setSuccessMessage(`${deletingLeader.FirstName} ${deletingLeader.LastName} deleted successfully!`);
      setShowDeleteModal(false);
      setShowSuccessModal(true);
      setDeletingLeader(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <div>
          <h2 className="text-xl font-bold">Leaders</h2>
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Manage small group leaders
          </p>
        </div>
        <button
          onClick={() => setShowCreateDrawer(true)}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Add Leader
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
          <div className="text-gray-500 dark:text-gray-400">Loading leaders...</div>
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          No leaders found. Add your first leader above!
        </div>
      ) : (
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Assigned Group</th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((leader) => (
              <tr key={leader.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {leader.FirstName} {leader.LastName}
                </th>
                <td className="px-6 py-4">
                  {leader.Grade ? (
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">
                      {leader.Grade} Grade
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEditModal(leader)}
                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(leader)}
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
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Add New Leader</h3>
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
              <label htmlFor="SmallGroupID" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Assigned Small Group
              </label>
              <select
                name="SmallGroupID"
                id="SmallGroupID"
                value={formData.SmallGroupID}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
              >
                <option value="">Unassigned</option>
                {groups.map(group => (
                  <option key={group.Id} value={group.Id}>{group.Grade} Grade</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Add Leader
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} size="md" onClose={() => setShowEditModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleUpdate} className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Edit Leader</h3>
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
              <label htmlFor="edit-SmallGroupID" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Assigned Small Group
              </label>
              <select
                name="SmallGroupID"
                id="edit-SmallGroupID"
                value={formData.SmallGroupID}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
              >
                <option value="">Unassigned</option>
                {groups.map(group => (
                  <option key={group.Id} value={group.Id}>{group.Grade} Grade</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Update Leader
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} size="md" onClose={() => setShowDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to delete {deletingLeader?.FirstName} {deletingLeader?.LastName}?
            </h3>
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

export default LeaderManagement;
