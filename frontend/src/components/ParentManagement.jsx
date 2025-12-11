import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'flowbite-react';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

const API_URL = 'http://localhost:8000';
const RELATIONSHIPS = ['Parent', 'Mother', 'Father', 'Guardian', 'Grandparent', 'Other'];

function ParentManagement() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [deletingParent, setDeletingParent] = useState(null);
  const [linkingParent, setLinkingParent] = useState(null);

  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    Relationship: 'Parent',
    Email: '',
    Phone: ''
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [parentsRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/parents`),
        fetch(`${API_URL}/students`)
      ]);

      if (!parentsRes.ok || !studentsRes.ok) throw new Error('Failed to fetch data');

      const parentsData = await parentsRes.json();
      const studentsData = await studentsRes.json();

      setParents(parentsData);
      setStudents(studentsData);
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
      const response = await fetch(`${API_URL}/parents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create parent');

      const saved = await response.json();
      setSuccessMessage(`${saved.FirstName} ${saved.LastName} has been added successfully!`);
      setFormData({ FirstName: '', LastName: '', Relationship: 'Parent', Email: '', Phone: '' });
      setShowCreateModal(false);
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
      const response = await fetch(`${API_URL}/parents/${editingParent.Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update parent');

      const saved = await response.json();
      setSuccessMessage(`${saved.FirstName} ${saved.LastName} has been updated successfully!`);
      setShowEditModal(false);
      setShowSuccessModal(true);
      setEditingParent(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (parent) => {
    setEditingParent(parent);
    setFormData({
      FirstName: parent.FirstName,
      LastName: parent.LastName || '',
      Relationship: parent.Relationship,
      Email: parent.Email || '',
      Phone: parent.Phone
    });
    setShowEditModal(true);
    setError(null);
  };

  const openDeleteModal = (parent) => {
    setDeletingParent(parent);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/parents/${deletingParent.Id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete parent');

      setSuccessMessage(`${deletingParent.FirstName} ${deletingParent.LastName} has been deleted.`);
      setShowDeleteModal(false);
      setShowSuccessModal(true);
      setDeletingParent(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const startLinking = async (parent) => {
    setLinkingParent(parent);

    try {
      const response = await fetch(`${API_URL}/parents/${parent.Id}`);
      const data = await response.json();
      setSelectedStudentIds(data.students?.map(s => s.Id) || []);
      setShowLinkModal(true);
    } catch (err) {
      setError('Failed to load parent details');
    }
  };

  const toggleStudentLink = async (studentId) => {
    const isLinked = selectedStudentIds.includes(studentId);

    try {
      if (isLinked) {
        await fetch(`${API_URL}/family/${studentId}/${linkingParent.Id}`, { method: 'DELETE' });
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
      } else {
        await fetch(`${API_URL}/family`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ StudentID: studentId, ParentID: linkingParent.Id })
        });
        setSelectedStudentIds(prev => [...prev, studentId]);
      }
    } catch (err) {
      setError('Failed to update link');
    }
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <div>
          <h2 className="text-xl font-bold">Parents & Guardians</h2>
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Manage parent and guardian information
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Add Parent
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
          <div className="text-gray-500 dark:text-gray-400">Loading parents...</div>
        </div>
      ) : parents.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          No parents found. Add your first parent above!
        </div>
      ) : (
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Relationship</th>
              <th scope="col" className="px-6 py-3">Contact</th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {parents.map((parent) => (
              <tr key={parent.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {parent.FirstName} {parent.LastName}
                </th>
                <td className="px-6 py-4">
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">
                    {parent.Relationship}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div>{parent.Email || '—'}</div>
                    <div className="text-gray-500 dark:text-gray-400">{parent.Phone}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => startLinking(parent)}
                    className="font-medium text-green-600 dark:text-green-500 hover:underline mr-4"
                  >
                    Link
                  </button>
                  <button
                    onClick={() => openEditModal(parent)}
                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(parent)}
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
      <Modal show={showCreateModal} size="md" onClose={() => setShowCreateModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleCreate} className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Add New Parent/Guardian</h3>
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
              <label htmlFor="Relationship" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Relationship
              </label>
              <select
                name="Relationship"
                id="Relationship"
                value={formData.Relationship}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              >
                {RELATIONSHIPS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
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
              Add Parent
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} size="md" onClose={() => setShowEditModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleUpdate} className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Edit Parent/Guardian</h3>
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
              <label htmlFor="edit-Relationship" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Relationship
              </label>
              <select
                name="Relationship"
                id="edit-Relationship"
                value={formData.Relationship}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              >
                {RELATIONSHIPS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
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
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Update Parent
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Link Students Modal */}
      <Modal show={showLinkModal} size="md" onClose={() => setShowLinkModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Link Students to {linkingParent?.FirstName} {linkingParent?.LastName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select students to link to this parent:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {students.map(student => (
                <label key={student.Id} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.Id)}
                    onChange={() => toggleStudentLink(student.Id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    {student.FirstName} {student.LastName} ({student.Grade})
                  </span>
                </label>
              ))}
            </div>
            <Button onClick={() => setShowLinkModal(false)} className="w-full">
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
              Are you sure you want to delete {deletingParent?.FirstName} {deletingParent?.LastName}?
            </h3>
            <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
              This will remove all family links.
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

export default ParentManagement;
