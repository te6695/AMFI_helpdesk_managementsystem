import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { TicketStatusChart, TicketPriorityChart, TicketCategoryChart } from './Charts'; // Relative path fix
import { ADMIN_ROLES } from '../../utils/roleUtils'; // Import ADMIN_ROLES
import { FaChartLine, FaListAlt } from 'react-icons/fa';

function ManageTickets() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [resolvers, setResolvers] = useState([]); // List of resolvers/sub-admins for assignment dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedResolvers, setSelectedResolvers] = useState({}); // State to manage selected resolver for each ticket dropdown
  const [resolutionStats, setResolutionStats] = useState({ daily: [], weekly: [], monthly: [] }); // Updated state for daily stats

  // Determine if the current user is the top-level 'admin' or another admin role (sub-admin)
  const isTopLevelAdmin = auth.user.role === 'admin';
  const isSubAdminOrResolver = ADMIN_ROLES.includes(auth.user.role) || auth.user.role === 'resolver';

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setError('You are not authorized to view this page.');
      setLoading(false);
      return;
    }
    
    // Authorization check: Only 'admin', sub-admins, or resolvers can access this component
    if (!isTopLevelAdmin && !isSubAdminOrResolver) {
        setError('Forbidden: Your role does not have access to manage or view ticket reports.');
        setLoading(false);
        return;
    }

    fetchData();
  }, [auth.isAuthenticated, auth.token, auth.user?.role]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      
      const ticketsRes = await axios.get(`${API_BASE_URL}/tickets/index.php`, { headers });

      if (ticketsRes.data.status === 'success') {
        setTickets(ticketsRes.data.tickets || []);
      } else {
        setError(ticketsRes.data.message || 'Failed to fetch tickets.');
        setTickets([]);
      }

      if (!isTopLevelAdmin) {
        const assignableRoles = ADMIN_ROLES.filter(role => role !== 'admin').join(',');
        const resolversRes = await axios.get(`${API_BASE_URL}/users/index.php?roles=resolver,${assignableRoles}`, { headers });

        if (resolversRes.data.status === 'success') {
          setResolvers(resolversRes.data.users || []);
        } else {
          setError(prev => prev + (prev ? ' | ' : '') + (resolversRes.data.message || 'Failed to fetch assignable users.'));
          setResolvers([]);
        }
      }

      if (isTopLevelAdmin) {
        try {
          // API call to fetch resolution statistics
          const statsRes = await axios.get(`${API_BASE_URL}/tickets/resolution_stats.php`, { headers });
          if (statsRes.data.status === 'success' && statsRes.data.stats) {
             setResolutionStats(statsRes.data.stats);
          } else {
             setError(prev => prev + (prev ? ' | ' : '') + (statsRes.data.message || 'Failed to fetch resolution stats.'));
             setResolutionStats({ daily: [], weekly: [], monthly: [] }); // Reset on error
          }
        } catch (statsErr) {
          console.error("Fetch resolution stats error:", statsErr);
          setError(prev => prev + (prev ? ' | ' : '') + (statsErr.response?.data?.message || 'Failed to fetch resolution statistics.'));
          setResolutionStats({ daily: [], weekly: [], monthly: [] }); // Reset on error
        }
      }

    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.response?.data?.message || 'An error occurred while fetching data.');
      setTickets([]);
      setResolvers([]);
      setResolutionStats({ daily: [], weekly: [], monthly: [] }); // Reset on main fetch error
    } finally {
      setLoading(false);
    }
  };

  const assignTicket = async (ticketId) => {
    const resolverId = selectedResolvers[ticketId];
    if (!resolverId) {
      setError('Please select a user to assign the ticket.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(
        `${API_BASE_URL}/tickets/index.php?id=${ticketId}`,
        { assigned_to: resolverId },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      if (response.data.status === 'success') {
        setSuccess(`Ticket ${ticketId} assigned successfully!`);
        fetchData(); // Re-fetch tickets to update status
        setSelectedResolvers(prev => ({ ...prev, [ticket.id]: '' })); // Clear selected resolver
      } else {
        setError(response.data.message || 'Failed to assign ticket.');
      }
    } catch (err) {
      console.error("Assign ticket error:", err);
      setError(err.response?.data?.message || 'An error occurred while assigning the ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading tickets...</div>;

  return (
    <div className="manage-tickets-container card">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isTopLevelAdmin ? (
        // Top-level 'admin' View: Show statistical reports
        <div className="admin-reports-view">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><FaChartLine /> Ticket Resolution Reports</h2>
          
          <div className="stats-section mb-8">
            <h3 className="text-xl font-medium mb-4">Daily Resolution Overview</h3>
            {resolutionStats.daily.length > 0 ? (
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Date</th>
                    <th className="py-2 px-4 border-b text-left">Tickets Submitted</th>
                    <th className="py-2 px-4 border-b text-left">Tickets Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {resolutionStats.daily.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{data.date}</td>
                      <td className="py-2 px-4 border-b">{data.submitted}</td>
                      <td className="py-2 px-4 border-b">{data.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-600">No daily resolution data available.</p>
            )}

            <h3 className="text-xl font-medium mb-4 mt-8">Weekly Resolution Overview</h3>
            {resolutionStats.weekly.length > 0 ? (
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Week</th>
                    <th className="py-2 px-4 border-b text-left">Tickets Submitted</th>
                    <th className="py-2 px-4 border-b text-left">Tickets Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {resolutionStats.weekly.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{data.week}</td>
                      <td className="py-2 px-4 border-b">{data.submitted}</td>
                      <td className="py-2 px-4 border-b">{data.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-600">No weekly resolution data available.</p>
            )}

            <h3 className="text-xl font-medium mb-4 mt-8">Monthly Resolution Overview</h3>
            {resolutionStats.monthly.length > 0 ? (
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Month</th>
                    <th className="py-2 px-4 border-b text-left">Tickets Submitted</th>
                    <th className="py-2 px-4 border-b text-left">Tickets Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {resolutionStats.monthly.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{data.month}</td>
                      <td className="py-2 px-4 border-b">{data.submitted}</td>
                      <td className="py-2 px-4 border-b">{data.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-600">No monthly resolution data available.</p>
            )}
          </div>
          
          {/* Charts for overall ticket distribution */}
          <div className="charts-section mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="chart-card card">
              <TicketStatusChart tickets={tickets} />
            </div>
            <div className="chart-card card">
              <TicketPriorityChart tickets={tickets} />
            </div>
            <div className="chart-card card">
              <TicketCategoryChart tickets={tickets} />
            </div>
          </div>
        </div>
      ) : (
        // Sub-Admin/Resolver View: Show assignable tickets table
        <div className="tickets-table-container">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><FaListAlt /> All Tickets (Management)</h2>
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">ID</th>
                <th className="py-2 px-4 border-b text-left">Subject</th>
                <th className="py-2 px-4 border-b text-left">Category</th>
                <th className="py-2 px-4 border-b text-left">Priority</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Submitted By</th>
                <th className="py-2 px-4 border-b text-left">Assigned To</th>
                {isSubAdminOrResolver && ( 
                  <th className="py-2 px-4 border-b text-left">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={isSubAdminOrResolver ? 8 : 7} className="text-center py-4 text-gray-600">No tickets found.</td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{ticket.id}</td>
                    <td className="py-2 px-4 border-b">{ticket.subject}</td>
                    <td className="py-2 px-4 border-b">{ticket.category}</td>
                    <td className="py-2 px-4 border-b"><span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span></td>
                    <td className="py-2 px-4 border-b"><span className={`status-badge ${ticket.status}`}>{ticket.status}</span></td>
                    <td className="py-2 px-4 border-b">{ticket.submitted_by_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{ticket.assigned_to_name || 'Unassigned'}</td>
                    {isSubAdminOrResolver && ( 
                      <td className="py-2 px-4 border-b">
                        {ticket.status === 'open' && (
                          <div className="flex items-center space-x-2">
                            <select
                              onChange={(e) => setSelectedResolvers(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              value={selectedResolvers[ticket.id] || ""} 
                              className="p-1 border rounded"
                            >
                              <option value="" disabled>Assign to...</option>
                              {resolvers.map(resolver => (
                                <option key={resolver.id} value={resolver.id}>
                                  {resolver.username} ({resolver.role})
                                </option>
                              ))}
                            </select>
                            {selectedResolvers[ticket.id] && ( 
                              <button
                                onClick={() => assignTicket(ticket.id)}
                                className="bg-green-500 hover:bg-green-700 text-white text-sm py-1 px-3 rounded"
                                disabled={loading} 
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        )}
                        {ticket.status === 'assigned' && (
                          <span className="text-gray-700">Assigned</span>
                        )}
                        {ticket.status === 'resolved' && (
                          <span className="text-green-600">Resolved</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageTickets;
