import React, { useState, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

function ManageRoles() {
  const { auth } = useContext(AuthContext);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API_BASE_URL}/roles/index.php`,
        { 
          name: roleName,
          description: roleDescription 
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      if (response.data.status === 'success') {
        setSuccess('Role added successfully!');
        setError('');
        setRoleName('');
        setRoleDescription('');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to add role');
        setSuccess('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add role');
      setSuccess('');
    }
  };

  return (
    <div className="card">
      <h2>Add New Role</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="roleName">Role Name:</label>
          <input
            type="text"
            id="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="roleDescription">Description (optional):</label>
          <textarea
            id="roleDescription"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            rows="3"
          />
        </div>
        
        <button type="submit" className="btn btn-primary">Add Role</button>
      </form>
    </div>
  );
}

export default ManageRoles;