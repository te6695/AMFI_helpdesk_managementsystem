// components/resolver/AssignedTickets.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App'; // Corrected path
import axios from 'axios'; // Assuming `api` is a wrapper around axios, but using axios directly for clarity
import { API_BASE_URL } from '../../config/api'; // Corrected path


// Custom Modal Component to replace alert/confirm
const CustomModal = ({ title, message, type, onConfirm, onCancel, showCancel = false }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className={type === 'error' ? 'text-red-600' : 'text-green-600'}>
          {title}
        </h3>
        <p>{message}</p>
        <div className="modal-actions">
          {showCancel && <button onClick={onCancel} className="cancel-btn">Cancel</button>}
          <button onClick={onConfirm} className="submit-btn">OK</button>
        </div>
      </div>
    </div>
  );
};

function AssignedTickets() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for custom modal
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  useEffect(() => {
    fetchAssignedTickets();
  }, []);

  const fetchAssignedTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/tickets/index.php?assigned=true&resolver_id=${auth.user.id}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      if (response.data && response.data.tickets) {
        setTickets(response.data.tickets || []);
      } else {
        setTickets([]);
        setError('No assigned tickets found or invalid response format');
      }
    } catch (err) {
      console.error('Error fetching assigned tickets:', err);
      setError('Failed to fetch assigned tickets');
    } finally {
      setLoading(false);
    }
  };

  const resolveTicket = async (ticketId, solution) => {
    if (!solution.trim()) {
      setModalConfig({
        title: 'Error',
        message: 'Please enter a solution before resolving the ticket.',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/tickets/index.php?id=${ticketId}&resolve=true`, { solution, resolver_id: auth.user.id }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      if (response.data.status === 'success') {
        setModalConfig({
          title: 'Success',
          message: 'Ticket resolved successfully!',
          type: 'success',
          onConfirm: () => {
            setShowModal(false);
            fetchAssignedTickets(); // Refresh the list
          }
        });
        setShowModal(true);
      } else {
        setModalConfig({
          title: 'Error',
          message: response.data.message || 'Failed to resolve ticket.',
          type: 'error',
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error resolving ticket:', err);
      setModalConfig({
        title: 'Error',
        message: 'Failed to resolve ticket due to a server error.',
        type: 'error',
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading assigned tickets...</div>;

  return (
    <div className="assigned-tickets">
      <h2>Assigned Tickets</h2>
      
      {error && <div className="error-message">{error}</div>}

      {tickets.length === 0 ? (
        <p className="info-message card">No tickets currently assigned to you.</p>
      ) : (
        <div className="tickets-table card"> {/* Apply card styling */}
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Description</th> {/* Added Description Header */}
                <th>Priority</th>
                <th>Category</th>
                <th>Submitted By</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <TicketRow key={ticket.id} ticket={ticket} onResolve={resolveTicket} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <CustomModal {...modalConfig} />}
    </div>
  );
}

function TicketRow({ ticket, onResolve }) {
  const [solution, setSolution] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  const handleResolve = () => {
    onResolve(ticket.id, solution);
    setSolution('');
    setShowResolveForm(false);
  };

  return (
    <tr>
      <td>{ticket.id}</td>
      <td>{ticket.subject}</td>
      <td className="ticket-description-cell">{ticket.description}</td> {/* Added Description Cell */}
      <td><span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span></td>
      <td>{ticket.category}</td>
      <td>{ticket.submitted_by?.username || 'N/A'}</td>
      <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
      <td>
        {!showResolveForm ? (
          <button onClick={() => setShowResolveForm(true)} className="submit-btn">Resolve</button>
        ) : (
          <div className="resolve-form">
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Enter solution..."
              rows={3}
              className="w-full p-2 border rounded"
            />
            <div className="resolve-actions mt-2 flex gap-2">
              <button onClick={handleResolve} className="submit-btn">Submit</button>
              <button onClick={() => setShowResolveForm(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export default AssignedTickets;
