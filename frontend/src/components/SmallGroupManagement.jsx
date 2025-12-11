import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'flowbite-react';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

const API_URL = 'http://localhost:8000';
const GRADES = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

function SmallGroupManagement() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [assigningGroup, setAssigningGroup] = useState(null);

  const [formData, setFormData] = useState({
    Grade: '9th'
  });

  // Assignment state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/small-groups`),
        fetch(`${API_URL}/students`)
      ]);

      if (!groupsRes.ok || !studentsRes.ok) throw new Error('Failed to fetch data');

      const groupsData = await groupsRes.json();
      const studentsData = await studentsRes.json();

      setGroups(groupsData);
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
      const response = await fetch(`${API_URL}/small-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create small group');

      const saved = await response.json();
      setSuccessMessage(`${saved.Grade} Grade Small Group created successfully!`);
      setFormData({ Grade: '9th' });
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
      const response = await fetch(`${API_URL}/small-groups/${editingGroup.Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update small group');

      const saved = await response.json();
      setSuccessMessage(`${saved.Grade} Grade Small Group updated successfully!`);
      setShowEditModal(false);
      setShowSuccessModal(true);
      setEditingGroup(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setFormData({
      Grade: group.Grade
    });
    setShowEditModal(true);
    setError(null);
  };

  const openDeleteModal = (group) => {
    setDeletingGroup(group);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/small-groups/${deletingGroup.Id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete small group');

      setSuccessMessage(`${deletingGroup.Grade} Grade Small Group deleted successfully!`);
      setShowDeleteModal(false);
      setShowSuccessModal(true);
      setDeletingGroup(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const startAssigning = async (group) => {
    setAssigningGroup(group);

    // Fetch group's current students
    try {
      const response = await fetch(`${API_URL}/small-groups/${group.Id}`);
      const data = await response.json();
      setSelectedStudentIds(data.students?.map(s => s.Id) || []);
      setShowAssignModal(true);
    } catch (err) {
      setError('Failed to load group details');
    }
  };

  const toggleStudentAssignment = async (studentId) => {
    const isAssigned = selectedStudentIds.includes(studentId);

    try {
      if (isAssigned) {
        // Unassign
        await fetch(`${API_URL}/small-groups/assign/${studentId}/${assigningGroup.Id}`, { method: 'DELETE' });
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
      } else {
        // Assign
        await fetch(`${API_URL}/small-groups/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ StudentID: studentId, SmallGroupID: assigningGroup.Id })
        });
        setSelectedStudentIds(prev => [...prev, studentId]);
      }
      setSuccessMessage(`Student ${isAssigned ? 'removed from' : 'assigned to'} group!`);
    } catch (err) {
      setError('Failed to update assignment');
    }
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <div>
          <h2 className="text-xl font-bold">Small Groups</h2>
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Organize students into small groups by grade
          </p>
        </div>
        <button
          onClick={() => setShowCreateDrawer(true)}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Add Small Group
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
          <div className="text-gray-500 dark:text-gray-400">Loading small groups...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          No small groups found. Create your first group above!
        </div>
      ) : (
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Grade</th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                    {group.Grade} Grade
                  </span>
                </th>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => startAssigning(group)}
                    className="font-medium text-green-600 dark:text-green-500 hover:underline mr-4"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => openEditModal(group)}
                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(group)}
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
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Add New Small Group</h3>
            <div>
              <label htmlFor="Grade" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Grade
              </label>
              <select
                name="Grade"
                id="Grade"
                value={formData.Grade}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              >
                {GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Create Small Group
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} size="md" onClose={() => setShowEditModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleUpdate} className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Edit Small Group</h3>
            <div>
              <label htmlFor="edit-Grade" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Grade
              </label>
              <select
                name="Grade"
                id="edit-Grade"
                value={formData.Grade}
                onChange={handleInputChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                required
              >
                {GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Update Small Group
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Assign Students Modal */}
      <Modal show={showAssignModal} size="md" onClose={() => setShowAssignModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Assign Students to {assigningGroup?.Grade} Grade Small Group
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select students from {assigningGroup?.Grade} grade to assign to this group:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {students
                .filter(s => s.Grade === assigningGroup?.Grade)
                .map(student => (
                  <label key={student.Id} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.Id)}
                      onChange={() => toggleStudentAssignment(student.Id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {student.FirstName} {student.LastName} ({student.Grade})
                    </span>
                  </label>
                ))}
              {students.filter(s => s.Grade === assigningGroup?.Grade).length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No students available for this grade
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
              Are you sure you want to delete {deletingGroup?.Grade} Grade Small Group?
            </h3>
            <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
              This will remove all student assignments.
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

export default SmallGroupManagement;
