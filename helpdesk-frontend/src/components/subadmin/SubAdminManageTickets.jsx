// components/subadmin/SubAdminManageTickets.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaTicketAlt, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaUserCheck, FaCheckSquare } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Custom Modal Component
const CustomModal = ({ title, message, type, onConfirm, onCancel, showCancel = false }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className={`modal-title ${type === 'error' ? 'text-error' : type === 'success' ? 'text-success' : 'text-info'}`}>
          {type === 'success' && <FaCheckCircle className="modal-icon" />}
          {type === 'error' && <FaExclamationTriangle className="modal-icon" />}
          {type === 'info' && <FaInfoCircle className="modal-icon" />}
          {title}
        </h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          {showCancel && (
            <button onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
          )}
          <button onClick={onConfirm} className="submit-btn">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

function SubAdminManageTickets() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [directorateResolvers, setDirectorateResolvers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedResolverForAssignment, setSelectedResolverForAssignment] = useState({});
  const [solutionInput, setSolutionInput] = useState({});
  const [showResolveForm, setShowResolveForm] = useState({});

  // Custom modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '', message: '', type: 'info', onConfirm: () => {}, onCancel: () => {}, showCancel: false
  });

  const showCustomModal = (title, message, type, onConfirm, onCancel = () => {}, showCancel = false) => {
    setModalConfig({ title, message, type, onConfirm, onCancel, showCancel });
    setShowModal(true);
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || !auth.user.id) {
      showCustomModal('Authentication Error', 'Authentication failed or user information is missing.', 'error', () => navigate('/login'));
      setLoading(false);
      return;
    }
    fetchSubAdminTickets();
  }, [auth.isAuthenticated, auth.user?.id, auth.token, navigate]);

  const fetchSubAdminTickets = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };

      // Fetch tickets submitted to this specific sub-admin
      const ticketsRes = await axios.get(`${API_BASE_URL}/tickets/index.php?submitted_to=${auth.user.id}`, { headers });

      if (ticketsRes.data.status === 'success') {
        // Filter out resolved tickets
        const relevantTickets = ticketsRes.data.tickets.filter(ticket => 
          ticket.status !== 'resolved'
        );
        setTickets(relevantTickets || []);
      } else {
        setError(ticketsRes.data.message || 'Failed to fetch tickets.');
        setTickets([]);
      }

      // Fetch resolvers within THIS sub-admin's directorate
      if (auth.user.directorate) {
        const resolversRes = await axios.get(`${API_BASE_URL}/users/index.php?roles=resolver&directorate=${auth.user.directorate}`, { headers });

        if (resolversRes.data.status === 'success') {
          setDirectorateResolvers(resolversRes.data.users || []);
        } else {
          setError(prev => prev + (prev ? ' | ' : '') + (resolversRes.data.message || 'Failed to fetch resolvers for your directorate.'));
          setDirectorateResolvers([]);
        }
      }

    } catch (err) {
      console.error("Error fetching sub-admin data:", err);
      setError(err.response?.data?.message || 'An error occurred while fetching data.');
      setTickets([]);
      setDirectorateResolvers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async (ticketId) => {
    const resolverId = selectedResolverForAssignment[ticketId];
    if (!resolverId) {
      showCustomModal('Assignment Error', 'Please select a resolver for assignment.', 'error', () => setShowModal(false));
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(
        `${API_BASE_URL}/tickets/index.php?id=${ticketId}`,
        { assigned_to: resolverId, status: 'assigned' },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      if (response.data.status === 'success') {
        setSuccess(`Ticket ${ticketId} assigned successfully.`);
        fetchSubAdminTickets();
        setSelectedResolverForAssignment(prev => ({ ...prev, [ticketId]: '' }));
        
        // Send notification to resolver
        await axios.post(`${API_BASE_URL}/notifications/index.php`, {
          message: `You have been assigned to ticket #${ticketId}`,
          user_id: resolverId
        }, { headers: { Authorization: `Bearer ${auth.token}` } });
        
      } else {
        setError(response.data.message || 'Failed to assign ticket.');
      }
    } catch (err) {
      console.error("Assign ticket error:", err);
      setError(err.response?.data?.message || 'An error occurred during assignment.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    const solution = solutionInput[ticketId]?.trim();
    if (!solution) {
      showCustomModal('Resolution Error', 'Please enter a solution before resolving the ticket.', 'error', () => setShowModal(false));
      return;
    }

    showCustomModal(
      'Confirm Resolution',
      'Are you sure you want to resolve this ticket? This action cannot be undone.',
      'info',
      async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
          const response = await axios.put(
            `${API_BASE_URL}/tickets/index.php?id=${ticketId}`,
            { solution: solution, status: 'resolved' },
            { headers: { Authorization: `Bearer ${auth.token}` } }
          );

          if (response.data.status === 'success') {
            setSuccess(`Ticket ${ticketId} resolved successfully.`);
            
            // Send notification to user
            const ticket = tickets.find(t => t.id === ticketId);
            if (ticket && ticket.submitted_by) {
              await axios.post(`${API_BASE_URL}/notifications/index.php`, {
                message: `Your ticket #${ticketId} has been resolved. Solution: ${solution}`,
                user_id: ticket.submitted_by
              }, { headers: { Authorization: `Bearer ${auth.token}` } });
            }
            
            fetchSubAdminTickets();
            setSolutionInput(prev => ({ ...prev, [ticketId]: '' }));
            setShowResolveForm(prev => ({ ...prev, [ticketId]: false }));
          } else {
            setError(response.data.message || 'Failed to resolve ticket.');
          }
        } catch (err) {
          console.error("Resolve ticket error:", err);
          setError(err.response?.data?.message || 'An error occurred during resolution.');
        } finally {
          setLoading(false);
          setShowModal(false);
        }
      },
      () => setShowModal(false),
      true
    );
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading tickets submitted to you...</div>;

  return (
    <div className="subadmin-manage-tickets card">
      <div className="page-header">
        <h2 className="page-title">
          <FaTicketAlt className="header-icon" />
          Tickets Submitted to Me ({auth.user?.username || 'N/A'})
        </h2>
        <p className="page-subtitle">Manage tickets submitted directly to you</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tickets-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Submitted By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No tickets currently submitted to you.
                </td>
              </tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id} className="ticket-row">
                  <td className="ticket-id">{ticket.id}</td>
                  <td className="ticket-subject">{ticket.subject}</td>
                  <td className="ticket-category">{ticket.category}</td>
                  <td className="ticket-priority">
                    <span className={`priority-badge ${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="ticket-status">
                    <span className={`status-badge ${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="ticket-submitter">{ticket.submitted_by_name || 'N/A'}</td>
                  <td className="ticket-actions">
                    {ticket.status === 'open' && (
                      <>
                        {/* Assign to Resolver functionality */}
                        {!ticket.assigned_to ? (
                          <div className="assignment-section">
                            {directorateResolvers.length > 0 ? (
                              <>
                                <select
                                  onChange={(e) => setSelectedResolverForAssignment(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                  value={selectedResolverForAssignment[ticket.id] || ""}
                                  className="resolver-select"
                                >
                                  <option value="" disabled>Assign to resolver...</option>
                                  {directorateResolvers.map(resolver => (
                                    <option key={resolver.id} value={resolver.id}>
                                      {resolver.username}
                                    </option>
                                  ))}
                                </select>
                                {selectedResolverForAssignment[ticket.id] && (
                                  <button
                                    onClick={() => handleAssignTicket(ticket.id)}
                                    className="assign-btn"
                                    disabled={loading}
                                  >
                                    <FaUserCheck /> Assign
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="assigned-info">No resolvers available in your directorate</p>
                            )}
                          </div>
                        ) : (
                          <p className="assigned-info">Assigned to {ticket.assigned_to_name}</p>
                        )}

                        {/* Resolve Ticket functionality */}
                        {!showResolveForm[ticket.id] ? (
                          <button
                            onClick={() => setShowResolveForm(prev => ({ ...prev, [ticket.id]: true }))}
                            className="resolve-btn"
                          >
                            <FaCheckSquare /> Resolve
                          </button>
                        ) : (
                          <div className="resolve-form">
                            <textarea
                              value={solutionInput[ticket.id] || ''}
                              onChange={(e) => setSolutionInput(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              placeholder="Enter solution..."
                              rows="3"
                              className="solution-textarea"
                            />
                            <div className="resolve-actions">
                              <button
                                onClick={() => handleResolveTicket(ticket.id)}
                                className="submit-solution-btn"
                                disabled={loading}
                              >
                                Submit Solution
                              </button>
                              <button
                                onClick={() => setShowResolveForm(prev => ({ ...prev, [ticket.id]: false }))}
                                className="cancel-resolve-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CustomModal
          {...modalConfig}
          onConfirm={() => { modalConfig.onConfirm(); setShowModal(false); }}
          onCancel={() => { modalConfig.onCancel(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

export default SubAdminManageTickets;