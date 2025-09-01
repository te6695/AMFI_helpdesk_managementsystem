import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

function ResolverTicket() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [auth.user?.id, filter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching tickets for resolver ID:', auth.user.id);
      
      // Use the correct endpoint for resolvers
      let url = `${API_BASE_URL}/tickets/index.php`;
      
      // For resolvers, we need to specify what type of tickets to fetch
      if (filter === 'assigned') {
        url += '?assigned=true'; // Tickets assigned to this resolver
      } else if (filter === 'resolved') {
        url += '?resolved=true'; // Tickets resolved by this resolver
      } else if (filter === 'submitted') {
        url += `?user_id=${auth.user.id}`; // Tickets submitted by this resolver
      } else {
        url += '?resolver_overview=true'; // All tickets relevant to this resolver
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      console.log('Tickets API response:', response.data);
      
      if (response.data && response.data.tickets) {
        setTickets(response.data.tickets);
      } else {
        setTickets([]);
        setError('No tickets found or invalid response format');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to load tickets');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Handle unauthorized access
        console.error('Authentication error - please log in again');
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
        <label htmlFor="ticket-filter">Filter by Type:</label>
        <select 
          id="ticket-filter" 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="ml-2 p-2 border rounded-md"
        >
          <option value="all">All My Tickets</option>
          <option value="assigned">Assigned to Me</option>
          <option value="resolved">Resolved by Me</option>
          <option value="submitted">Submitted by Me</option>
        </select>
      </div>

      {tickets.length === 0 ? (
        <p className="info-message card">No tickets found matching the selected filter.</p>
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
                <p><strong>Status:</strong> {ticket.status}</p>
                <p><strong>Submitted:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                {ticket.assigned_to_name && <p><strong>Assigned To:</strong> {ticket.assigned_to_name}</p>}
                {ticket.submitted_by_name && <p><strong>Submitted By:</strong> {ticket.submitted_by_name}</p>}
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

export default ResolverTicket;