import React, { useState, useContext } from 'react';
import { AuthContext } from '../../App';
import { API_BASE_URL } from '../../config/api';
import axios from 'axios';
import { ADMIN_ROLES } from '../../utils/roleUtils'; // Import ADMIN_ROLES

function AddUser() {
  const { auth } = useContext(AuthContext);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user',
    directorate: '' // NEW STATE FOR DIRECTORATE
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/users/index.php`, newUser, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.token}`
        }
      });

      if (response.data.status === 'success') {
        setSuccess(response.data.message);
        setNewUser({ // Clear form
          username: '',
          password: '',
          email: '',
          role: 'user',
          directorate: '' // Clear directorate as well
        });
      } else {
        setError(response.data.message || 'Failed to add user.');
      }
    } catch (err) {
      console.error("Add user error:", err);
      setError(err.response?.data?.message || 'An error occurred while adding the user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Combine all roles for the dropdown, ensuring 'user' and 'resolver' are also available
  const allRoles = ['user', 'resolver', ...ADMIN_ROLES];

  return (
    <div className="add-user-container card">
      <h2>Add New User</h2>
      
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleAddUser}>
        <div className="form-group">
          <label htmlFor="username">Username *</label>
          <input
            type="text"
            id="username"
            name="username"
            value={newUser.username}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={newUser.email}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={newUser.password}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        {/* NEW FORM GROUP FOR DIRECTORATE */}
        <div className="form-group">
          <label htmlFor="directorate">Directorate</label>
          <input
            type="text"
            id="directorate"
            name="directorate"
            value={newUser.directorate}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        {/* END NEW FORM GROUP */}
        <div className="form-group">
          <label htmlFor="role">Role *</label>
          <select
            id="role"
            name="role"
            value={newUser.role}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          >
            {allRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <><div className="spinner"></div>Adding User...</> : 'Add User'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddUser;
