// components/user/NewTicket.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

// Defined here for convenience, ideally from a shared utility file
const ADMIN_ROLES = ["admin", "boardadmin", "ceoadmin", "cooadmin", "ccoadmin", "IRadmin", "ITadmin", "operatonadmin", "marketadmin", "branchadmin", "financeadmin", "planandstrategyadmin", "shareadmin", "lawadmin", "riskadmin", "auditadmin"];
const SUB_ADMIN_ROLES = ADMIN_ROLES.filter(role => role !== 'admin'); // All non-top-level admin roles

function NewTicket() {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium',
    submitted_to: '', // For submitting to a sub-admin
  });
  const [recipients, setRecipients] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Determine if the current user is a sub-admin based on their role
  const isCurrentUserSubAdmin = auth.user && SUB_ADMIN_ROLES.includes(auth.user.role);

  // Fetch potential recipients based on logged-in user's role
  useEffect(() => {
    const fetchRecipients = async () => {
      if (!auth.isAuthenticated || !auth.user) return;

      setLoading(true);
      setError('');

      try {
        let rolesToFetch = [];
        let filterParams = '';
        const headers = { Authorization: `Bearer ${auth.token}` };

        if (isCurrentUserSubAdmin) {
          // If current user is a sub-admin, they submit to other sub-admins (excluding themselves)
          rolesToFetch = SUB_ADMIN_ROLES; 
          filterParams = `&exclude_user_id=${auth.user.id}`; // Exclude self
        } else if (auth.user.role === 'user') {
          // If current user is a regular user, they submit to sub-admins
          rolesToFetch = SUB_ADMIN_ROLES;
        } else {
          // For 'admin' or 'resolver' roles, if they were to use this component
          // decide what recipients they should see, e.g., all resolvers.
          // For this scenario, we primarily focus on 'user' and 'sub-admin' roles.
          // If no specific logic, default to no recipients for now.
          setRecipients([]);
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/users/index.php?roles=${rolesToFetch.join(',')}${filterParams}`, { headers });

        if (response.data.status === 'success' && response.data.users) {
          setRecipients(response.data.users);
        } else {
          setError(response.data.message || 'Failed to load recipients.');
        }
      } catch (err) {
        console.error('Failed to fetch recipients:', err);
        setError(err.response?.data?.message || 'Failed to load users for submission. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipients();
  }, [auth.isAuthenticated, auth.user, auth.token, isCurrentUserSubAdmin]); 

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        ...formData,
        submitted_by: auth.user.id,
      };

      console.log('Submitting ticket with data:', payload); // Debug log

      // For NewTicket, we always use 'submitted_to'.
      // Convert empty string to null for database
      if (!formData.submitted_to || formData.submitted_to === '') {
        payload.submitted_to = null;
      }

      const response = await axios.post(`${API_BASE_URL}/tickets/index.php`, payload, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}` 
        }
      });

      console.log('Ticket submission response:', response.data); // Debug log

      if (response.data.status === 'success') {
        setMessage('Ticket submitted successfully!');
        setFormData({ 
          subject: '',
          description: '',
          category: '',
          priority: 'medium',
          submitted_to: '',
        });
      } else {
        setError(response.data.message || 'Failed to submit ticket.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        setError(err.response.data.message || 'An error occurred. Please try again later.');
      } else if (err.request) {
        console.error('Error request:', err.request);
        setError('No response from server. Please check your network connection.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Submit New Ticket</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="new-ticket-form">
        <div className="form-group">
          <label htmlFor="subject">Subject *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select Category</option>
            <option value="Technical">Technical</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Network</option>
            <option value="Account">Account</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="submitted_to">
            Submitted To 
          </label>
          <select
            id="submitted_to"
            name="submitted_to"
            value={formData.submitted_to}
            onChange={handleChange}
          >
            <option value="">Select a sub-admin</option>
            {recipients.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role}) - {user.directorate || 'No Directorate'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority *</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            placeholder='Describe your issue detail...'

            value={formData.description}
            onChange={handleChange}
            rows="5"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? (
            <>
              <div className="spinner"></div>
              Submitting...
            </>
          ) : (
            'Submit Ticket'
          )}
        </button>
      </form>
    </div>
  );
}

export default NewTicket;