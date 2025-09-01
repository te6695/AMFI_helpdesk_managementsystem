import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaBars, FaHome, FaTicketAlt, FaClipboardCheck, FaBell, FaSignOutAlt, FaUserCircle, FaCog, FaPlusCircle, FaTimes } from 'react-icons/fa';

function ResolverDashboard() {
  const { auth, logout } = useContext(AuthContext);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated
    if (!auth.isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    // Redirect if user is not a resolver
    if (auth.user.role !== 'resolver') {
      navigate('/dashboard', { replace: true });
      return;
    }

    fetchResolverData();
  }, [auth, navigate]);

  // Function to fetch all resolver data (assigned tickets, resolved tickets, notifications)
  const fetchResolverData = async () => {
    try {
      const [assignedRes, resolvedRes, notificationsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/tickets/index.php?assigned=true&resolver_id=${auth.user.id}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${API_BASE_URL}/tickets/index.php?resolved=true&resolver_id=${auth.user.id}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        // Fetch only unread notifications
        axios.get(`${API_BASE_URL}/notifications/index.php?user_id=${auth.user.id}&unread=true`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
      ]);

      setAssignedTickets(assignedRes.data.tickets || []);
      setResolvedTickets(resolvedRes.data.tickets || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (err) {
      setError('Failed to fetch dashboard data.');
      console.error('Error fetching resolver data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch only unread notifications
  const fetchUnreadNotifications = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/notifications/index.php?user_id=${auth.user.id}&unread=true`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      if (response.data.status === 'success') {
        setNotifications(response.data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (!passwordRegex.test(passwordForm.newPassword)) {
      setPasswordError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    // If all checks pass
    setPasswordError(''); // Clear any previous errors

    try {
      const response = await axios.put(`${API_BASE_URL}/auth/change_password.php?id=${auth.user.id}`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      if (response.data.status === 'success') {
        setPasswordMessage('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);
      } else {
        setPasswordError(response.data.message || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError('Failed to change password. Please try again.');
      console.error('Change password error:', err);
    }
  };

  // Function to mark a single notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/index.php?id=${notificationId}`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Remove the notification from the local state (only unread notifications are shown)
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Function to mark all notifications as read and collapse the dropdown
  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/index.php`, { 
        userId: auth.user.id,
        markAllRead: true 
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Clear all notifications from the local state
      setNotifications([]);
      
      // Collapse the notification dropdown after marking as read
      setShowNotifications(false);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading Resolver Dashboard...</div>;

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>HDMS</h2>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">
            <FaBars />
          </button>
        </div>
        <nav>
          <ul>
            <li>
              <Link to="/resolver" className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <FaHome /> <span>Dashboard</span>
              </Link>
            </li>
           
            <li>
              <Link to="/resolver/submit-ticket" className={`sidebar-link ${activeTab === 'submit-ticket' ? 'active' : ''}`} onClick={() => setActiveTab('submit-ticket')}>
                <FaPlusCircle /> <span>Submit New Ticket</span>
              </Link>
            </li>

            <li>
              <Link to="/resolver/assigned" className={`sidebar-link ${activeTab === 'assigned' ? 'active' : ''}`} onClick={() => setActiveTab('assigned')}>
                <FaTicketAlt /> <span>Assigned Tickets</span>
              </Link>
            </li>
            <li>
              <Link to="/resolver/resolved" className={`sidebar-link ${activeTab === 'resolved' ? 'active' : ''}`} onClick={() => setActiveTab('resolved')}>
                <FaClipboardCheck /> <span>Resolved Tickets</span>
              </Link>
            </li>
             <li>
              <Link to="/resolver/my-tickets" className={`sidebar-link ${activeTab === 'my-tickets' ? 'active' : ''}`} onClick={() => setActiveTab('my-tickets')}>
                <FaTicketAlt /> <span>View My Tickets</span>
              </Link>
            </li>
            <li>
              <button onClick={() => setShowChangePassword(true)} className="sidebar-link-button">
                <FaCog /> <span>Change Password</span>
              </button>
            </li>
            <li>
              <button onClick={logout} className="sidebar-link-button">
                <FaSignOutAlt /> <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content wrapper */}
      <div className="main-content-wrapper">
        {/* Header */}
        <div className="header">
          <div className="notification-container">
            <div className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
              <FaBell />
              {notifications.length > 0 && (
                <span className="notification-badge">
                  {notifications.length}
                </span>
              )}
            </div>
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  <button onClick={() => setShowNotifications(false)} className="close-notifications">
                    <FaTimes />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="no-notifications">No new notifications</p>
                ) : (
                  <>
                    <div className="notification-list">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="notification-item unread">
                          <div className="notification-content">
                            <p>{notification.message}</p>
                            <span className="notification-time">
                              {new Date(notification.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="notification-actions">
                            <button 
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="mark-read-btn"
                              title="Mark as read"
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="notification-footer">
                      <button onClick={markAllAsRead} className="mark-all-read-btn">
                        Mark All as Read
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="user-info">
            <span>{auth.user?.username || 'Resolver'}</span>
            <FaUserCircle />
          </div>
        </div>

        {/* Content area for nested routes */}
        <div className="content-area">
          {error && <div className="error-message">{error}</div>}
          {activeTab === 'dashboard' && (
            <div className="dashboard-overview card">
              <h2>Resolver Overview</h2>

              <div className="stats-cards">
                <div className="stat-card card">
                  <h3>Assigned Tickets</h3>
                  <p>{assignedTickets.length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Resolved Tickets</h3>
                  <p>{resolvedTickets.length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Resolution Rate</h3>
                  <p>
                    {(assignedTickets.length + resolvedTickets.length) > 0
                      ? Math.round((resolvedTickets.length / (assignedTickets.length + resolvedTickets.length)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="recent-tickets">
                <h3>Recent Assigned Tickets</h3>
                {assignedTickets.length === 0 ? (
                  <p>No assigned tickets.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Subject</th>
                        <th>Priority</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedTickets.slice(0, 5).map(ticket => (
                        <tr key={ticket.id}>
                          <td>{ticket.id}</td>
                          <td>{ticket.subject}</td>
                          <td><span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span></td>
                          <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <Outlet /> {/* Renders nested routes like AssignedTickets, ResolvedTickets */}
        </div>
      </div>
      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              {passwordError && <div className="error-message">{passwordError}</div>}
              {passwordMessage && <div className="success-message">{passwordMessage}</div>}
              <div className="modal-actions">
                <button type="submit">Change Password</button>
                <button type="button" onClick={() => setShowChangePassword(false)} className="cancel-btn">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResolverDashboard;