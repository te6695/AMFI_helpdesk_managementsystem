import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { API_BASE_URL } from '../../config/api';
import axios from 'axios';
import { FaCog, FaCheck, FaTimes, FaEdit, FaKey, FaTrash } from 'react-icons/fa';

function ManageUsers() {
  const { auth } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for role assignment modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // State for reset password modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
  const [resetPasswordUsername, setResetPasswordUsername] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Add password validation function
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };
  
  const fetchUsers = async () => {
  try {
    setLoading(true);
    setError('');
    const response = await axios.get(`${API_BASE_URL}/users/index.php`, {
      headers: {
        "Authorization": `Bearer ${auth.token}`
      }
    });

    if (response.data.status === 'success') {
      // For each user, fetch their roles
      const usersWithRoles = await Promise.all(
        response.data.users.map(async (user) => {
          try {
            const rolesResponse = await axios.get(
              `${API_BASE_URL}/users/index.php?id=${user.id}&action=get_roles`,
              { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            return {
              ...user,
              roles: rolesResponse.data.roles || [user.role]
            };
          } catch (err) {
            console.error(`Failed to fetch roles for user ${user.id}:`, err);
            return { ...user, roles: [user.role] };
          }
        })
      );
      
      setUsers(usersWithRoles);
    } else {
      setError(response.data.message || 'Failed to fetch users');
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Connection to server failed');
    console.error("Fetch users error:", err);
  } finally {
    setLoading(false);
  }
};

  const fetchRoles = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/roles/index.php`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      if (response.data.status === 'success') {
        setRoles(response.data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      // If roles endpoint doesn't exist, use default roles
      setRoles([
        { id: 1, name: 'admin' },
        { id: 2, name: 'sub_admin' },
        { id: 3, name: 'resolver' },
        { id: 4, name: 'user' }
      ]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (editingUser) {
      setEditingUser({ ...editingUser, [name]: value });
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user }); // Create a copy to edit
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!editingUser) return;

    try {
      const response = await axios.put(`${API_BASE_URL}/users/index.php?id=${editingUser.id}`, editingUser, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.token}`
        }
      });

      if (response.data.status === 'success') {
        setSuccess(response.data.message);
        setEditingUser(null);
        fetchUsers();
      } else {
        setError(response.data.message || 'Failed to update user');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
      console.error("Update user error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  // Open role assignment modal
  const handleAssignRolesClick = (user) => {
    setSelectedUser(user);
    // Initialize with current user roles (assuming user.roles is an array of role names)
    // If your backend doesn't support multiple roles yet, this will need to be adjusted
    const currentRoles = user.roles || [user.role].filter(Boolean);
    setUserRoles(currentRoles);
    setShowRoleModal(true);
  };

  // Handle role checkbox changes
  const handleRoleChange = (roleName, isChecked) => {
    if (isChecked) {
      setUserRoles(prev => [...prev, roleName]);
    } else {
      setUserRoles(prev => prev.filter(role => role !== roleName));
    }
  };

  // Save assigned roles
const handleSaveRoles = async () => {
  if (!selectedUser) return;
  
  setSavingRoles(true);
  setError('');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/users/index.php?id=${selectedUser.id}&action=update_roles`,
      { roles: userRoles },
      { headers: { Authorization: `Bearer ${auth.token}` } }
    );
    
    if (response.data.status === 'success') {
      setSuccess('User roles updated successfully!');
      setShowRoleModal(false);
      
      // Update the user in the local state with all roles
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, roles: userRoles } 
          : user
      ));
    } else {
      setError(response.data.message || 'Failed to update user roles');
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to update user roles');
    console.error("Update roles error:", err);
  } finally {
    setSavingRoles(false);
  }
};

  const handleResetPasswordClick = (userId, username) => {
    setResetPasswordUserId(userId);
    setResetPasswordUsername(username);
    setNewResetPassword('');
    setConfirmResetPassword('');
    setResetPasswordError('');
    setResetPasswordSuccess('');
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetPasswordError('');
    setResetPasswordSuccess('');

    // Validate password strength
    const passwordError = validatePassword(newResetPassword);
    if (passwordError) {
      setResetPasswordError(passwordError);
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setResetPasswordError('New password and confirm password do not match.');
      return;
    }

    if (!resetPasswordUserId) {
      setResetPasswordError('User ID for password reset is missing.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/index.php?id=${resetPasswordUserId}&action=reset_password`,
        { password: newResetPassword },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.status === 'success') {
        setResetPasswordSuccess(response.data.message);
        // Auto-close modal after 2 seconds
        setTimeout(() => {
          setShowResetPasswordModal(false);
        }, 2000);
        fetchUsers();
      } else {
        setResetPasswordError(response.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setResetPasswordError(err.response?.data?.message || 'Error resetting password.');
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.delete(`${API_BASE_URL}/users/index.php?id=${userId}`, {
        headers: {
          "Authorization": `Bearer ${auth.token}`
        }
      });

      if (response.data.status === 'success') {
        setSuccess(response.data.message);
        fetchUsers();
      } else {
        setError(response.data.message || 'Failed to delete user');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      console.error("Delete user error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Format roles for display (show first 2 roles + count of additional roles)
  const formatRolesForDisplay = (user) => {
    // If your backend doesn't support multiple roles yet, use the single role
    const userRoles = user.roles || [user.role].filter(Boolean);
    
    if (userRoles.length === 0) return 'No roles';
    if (userRoles.length <= 2) return userRoles.join(', ');
    
    return `${userRoles.slice(0, 2).join(', ')} +${userRoles.length - 2} more`;
  };

  if (loading && !showResetPasswordModal && !showRoleModal) {
    return <div className="loading-spinner"><div className="spinner"></div>Loading users...</div>;
  }

  return (
    <div className="manage-users">
      <h2>Manage Users</h2>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {editingUser && (
        <div className="add-edit-user-form card mb-8">
          <h3>Edit User: {editingUser.username}</h3>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={editingUser.username}
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
                value={editingUser.email}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Primary Role *</label>
              <select
                id="role"
                name="role"
                value={editingUser.role}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="submit-btn" disabled={loading}>
                Update User
              </button>
              <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-list card">
        <h3>Existing Users</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Directorate</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="roles-display">
                      {formatRolesForDisplay(user)}
                    </span>
                  </td>
                  <td>{user.directorate || 'N/A'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons flex space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="edit-btn"
                        title="Edit User"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleAssignRolesClick(user)}
                        className="role-btn"
                        title="Assign Roles"
                      >
                        <FaCog />
                      </button>
                      <button 
                        onClick={() => handleResetPasswordClick(user.id, user.username)}
                        className="reset-btn"
                        title="Reset Password"
                      >
                        <FaKey />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="delete-btn"
                        disabled={user.id === auth.user.id}
                        title="Delete User"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Assign Roles to {selectedUser.username}</h3>
              <button 
                onClick={() => setShowRoleModal(false)} 
                className="modal-close-btn"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Select the roles to assign to this user. A user can have multiple roles.
              </p>
              
              <div className="roles-checkbox-list">
                {roles.map(role => (
                  <label key={role.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={userRoles.includes(role.name)}
                      onChange={(e) => handleRoleChange(role.name, e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    {role.name}
                  </label>
                ))}
              </div>
              
              {userRoles.length > 0 && (
                <div className="selected-roles">
                  <h4>Selected Roles:</h4>
                  <div className="selected-roles-list">
                    {userRoles.map(role => (
                      <span key={role} className="role-tag">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={handleSaveRoles}
                className="submit-btn"
                disabled={savingRoles || userRoles.length === 0}
              >
                {savingRoles ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                onClick={() => setShowRoleModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password for: {resetPasswordUsername}</h3>
              <button 
                onClick={() => setShowResetPasswordModal(false)} 
                className="modal-close-btn"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="newResetPassword">New Password *</label>
                <input
                  type="password"
                  id="newResetPassword"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters with uppercase and number"
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Must be at least 8 characters with uppercase letter and number
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmResetPassword">Confirm New Password *</label>
                <input
                  type="password"
                  id="confirmResetPassword"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              {resetPasswordError && <div className="error-message">{resetPasswordError}</div>}
              {resetPasswordSuccess && <div className="success-message">{resetPasswordSuccess}</div>}
            </form>
            
            <div className="modal-actions">
              <button 
                type="submit" 
                onClick={handleResetPasswordSubmit}
                className="submit-btn" 
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowResetPasswordModal(false)} 
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;