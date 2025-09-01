import React, { useState, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

function ManageDirectorates() {
  const { auth } = useContext(AuthContext);
  const [directorateName, setDirectorateName] = useState('');
  const [directorateDescription, setDirectorateDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API_BASE_URL}/directorates/index.php`,
        { 
          name: directorateName,
          description: directorateDescription 
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      if (response.data.status === 'success') {
        setSuccess('Directorate added successfully!');
        setError('');
        setDirectorateName('');
        setDirectorateDescription('');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to add directorate');
        setSuccess('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add directorate');
      setSuccess('');
    }
  };

  return (
    <div className="card">
      <h2>Add New Directorate</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="directorateName">Directorate Name:</label>
          <input
            type="text"
            id="directorateName"
            value={directorateName}
            onChange={(e) => setDirectorateName(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="directorateDescription">Description (optional):</label>
          <textarea
            id="directorateDescription"
            value={directorateDescription}
            onChange={(e) => setDirectorateDescription(e.target.value)}
            rows="3"
          />
        </div>
        
        <button type="submit" className="btn btn-primary">Add Directorate</button>
      </form>
    </div>
  );
}

export default ManageDirectorates;