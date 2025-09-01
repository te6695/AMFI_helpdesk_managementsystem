import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App'; // Corrected path
import axios from 'axios';
import { API_BASE_URL } from '../../config/api'; // Corrected path


function MyTickets() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [auth.user?.id, filter]); // Re-fetch when filter changes

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching tickets for user ID:', auth.user.id);
      const response = await axios.get(`${API_BASE_URL}/tickets/index.php?user_id=${auth.user.id}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      console.log('Tickets API response:', response.data);
      
      if (response.data && response.data.tickets) {
        let filteredTickets = response.data.tickets;
        if (filter !== 'all') {
          filteredTickets = filteredTickets.filter(ticket => ticket.status === filter);
        }
        setTickets(filteredTickets);
      } else {
        setTickets([]);
        setError('No tickets found or invalid response format');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to load tickets');
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Handle unauthorized access, e.g., redirect to login
        // auth.logout(); // This would log the user out
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading your tickets...</div>;

  return (
    <div className="my-tickets">
      <h2>My Tickets</h2>
      
      {error && <div className="error-message">{error}</div>}

      <div className="filter-controls card">
        <label htmlFor="ticket-filter">Filter by Status:</label>
        <select 
          id="ticket-filter" 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="ml-2 p-2 border rounded-md"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {tickets.length === 0 ? (
        <p className="info-message card">You haven't submitted any tickets yet, or no tickets match the filter.</p>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket.id} className="ticket-card card">
              <div className="ticket-header">
                <h3>{ticket.subject}</h3>
                <span className={`status-badge ${ticket.status}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="ticket-details">
                <p><strong>ID:</strong> {ticket.id}</p>
                <p><strong>Category:</strong> {ticket.category}</p>
                <p><strong>Priority:</strong> 
                  <span className={`priority-badge ${ticket.priority}`}>
                    {ticket.priority}
                  </span>
                </p>
                <p><strong>Submitted:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                {ticket.assigned_to_name && <p><strong>Assigned To:</strong> {ticket.assigned_to_name}</p>}
                {ticket.resolved_at && <p><strong>Resolved:</strong> {new Date(ticket.resolved_at).toLocaleString()}</p>}
              </div>
              <div className="ticket-description">
                <p><strong>Description:</strong> {ticket.description}</p>
              </div>
              {ticket.solution && (
                <div className="ticket-solution">
                  <p><strong>Solution:</strong> {ticket.solution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTickets;
