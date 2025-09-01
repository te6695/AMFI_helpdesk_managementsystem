// components/resolver/ResolvedTickets.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { api } from '../../utils/api';

function ResolvedTickets() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResolvedTickets();
  }, []);

  const fetchResolvedTickets = async () => {
    const result = await api.get('/tickets/index.php?resolved=true');
    
    if (result.success) {
      setTickets(result.data.tickets || []);
    } else {
      setError(result.error || 'Failed to fetch resolved tickets');
    }
    
    setLoading(false);
  };

  if (loading) return <div className="loading">Loading resolved tickets...</div>;

  return (
    <div className="resolved-tickets">
      <h2>Resolved Tickets</h2>
      
      {error && <div className="error-message">{error}</div>}

      {tickets.length === 0 ? (
        <p>No resolved tickets yet.</p>
      ) : (
        <div className="tickets-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Submitted By</th>
                <th>Resolved Date</th>
                <th>Solution</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.subject}</td>
                  <td><span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span></td>
                  <td>{ticket.category}</td>
                  <td>{ticket.submitted_by?.username || 'N/A'}</td>
                  <td>{new Date(ticket.resolved_at).toLocaleDateString()}</td>
                  <td className="solution-text">{ticket.solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ResolvedTickets;