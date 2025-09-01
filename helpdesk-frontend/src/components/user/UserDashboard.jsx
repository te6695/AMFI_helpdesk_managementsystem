// components/user/UserDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App'; 
import { Link, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api'; 
import { FaBars, FaHome, FaPlusCircle, FaTicketAlt, FaBell, FaSignOutAlt, FaUserCircle, FaCog } from 'react-icons/fa'; 
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';


// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function UserDashboard() {
  const { auth, logout } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
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

    // Redirect if user is not a regular user (shouldn't happen with proper routing, but as a safeguard)
    if (auth.user.role !== 'user') {
      // For this specific case, if they are admin/resolver, they'll go to their respective dashboard
      // Otherwise, redirect to the general dashboard
      navigate('/dashboard', { replace: true });
      return;
    }

    fetchUserData();
  }, [auth, navigate]);

  // Function to fetch all user data (tickets, notifications)
  const fetchUserData = async () => {
    try {
      // Ensure auth.user.id is available before making requests
      if (!auth.user || !auth.user.id) {
        setError("User ID not found for fetching data.");
        setLoading(false);
        return;
      }

      const [ticketsRes, notificationsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/tickets/index.php?user_id=${auth.user.id}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${API_BASE_URL}/notifications/index.php?user_id=${auth.user.id}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
      ]);

      setTickets(ticketsRes.data.tickets || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (err) {
      setError('Failed to fetch dashboard data.');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/index.php`, { userId: auth.user.id }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      // Update the local state to reflect changes
      setNotifications(notifications.map(n => ({ ...n, is_read: '1' })));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

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

    // If all checks pass, clear previous errors
    setPasswordError(''); 

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

  const getTicketStatusData = () => {
    const open = tickets.filter(t => t.status === 'open').length;
    const assigned = tickets.filter(t => t.status === 'assigned').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;

    return {
      labels: ['Open', 'Assigned', 'Resolved'],
      datasets: [
        {
          data: [open, assigned, resolved],
          backgroundColor: ['#f39c12', '#3498db', '#27ae60'],
          hoverBackgroundColor: ['#e67e22', '#2980b9', '#229a56'],
        },
      ],
    };
  };

  const getTicketPriorityData = () => {
    const low = tickets.filter(t => t.priority === 'low').length;
    const medium = tickets.filter(t => t.priority === 'medium').length;
    const high = tickets.filter(t => t.priority === 'high').length;

    return {
      labels: ['Low', 'Medium', 'High'],
      datasets: [
        {
          data: [low, medium, high],
          backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'],
          hoverBackgroundColor: ['#27ae60', '#d4ac0d', '#c0392b'],
        },
      ],
    };
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading User Dashboard...</div>;

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>HDMS</h2>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">
            <FaBars /> <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
        <nav>
          <ul>
            <li>
              <Link to="/dashboard" className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <FaHome /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/dashboard/new-ticket" className={`sidebar-link ${activeTab === 'new-ticket' ? 'active' : ''}`} onClick={() => setActiveTab('new-ticket')}>
                <FaPlusCircle /> <span>Create New Ticket</span>
              </Link>
            </li>
            <li>
              <Link to="/dashboard/my-tickets" className={`sidebar-link ${activeTab === 'my-tickets' ? 'active' : ''}`} onClick={() => setActiveTab('my-tickets')}>
                <FaTicketAlt /> <span>View My Tickets</span>
              </Link>
            </li>
            <li>
              <button onClick={() => setShowChangePassword(true)} className="sidebar-link">
                <FaCog /> <span>Change Password</span>
              </button>
            </li>
            <li>
              <button onClick={logout} className="sidebar-link">
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
              {notifications.filter(n => n.is_read === '0').length > 0 && (
                <span className="notification-badge">
                  {notifications.filter(n => n.is_read === '0').length}
                </span>
              )}
            </div>
            {showNotifications && (
              <div className="notification-dropdown">
                <h4>Notifications</h4>
                {notifications.length > 0 ? (
                  <>
                    {notifications.map((n) => (
                      <div key={n.id} className={`notification-item ${n.is_read === '0' ? 'unread' : ''}`}>
                        <p>{n.message}</p>
                      </div>
                    ))}
                    <button onClick={markAllAsRead} className="mark-read-btn">Mark All as Read</button>
                  </>
                ) : (
                  <p>No new notifications.</p>
                )}
              </div>
            )}
          </div>
          <div className="user-info">
            <span>{auth.user?.username || 'User'}</span>
            <FaUserCircle />
          </div>
        </div>

        {/* Content area for nested routes */}
        <div className="content-area">
          {error && <div className="error-message">{error}</div>}
          {activeTab === 'dashboard' && (
            <div className="user-dashboard-overview card">
              <h2>User Dashboard</h2>
              <p className="welcome-message">Welcome, {auth.user.username}!</p>

              <div className="stats-cards">
                <div className="stat-card card">
                  <h3>Total Tickets</h3>
                  <p>{tickets.length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Open Tickets</h3>
                  <p>{tickets.filter(t => t.status === 'open').length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Resolved Tickets</h3>
                  <p>{tickets.filter(t => t.status === 'resolved').length}</p>
                </div>
              </div>

              <div className="charts-section">
                <div className="chart-container">
                  <h3>Ticket Status</h3>
                  <Pie data={getTicketStatusData()} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                </div>
                <div className="chart-container">
                  <h3>Ticket Priority</h3>
                  <Bar data={getTicketPriorityData()} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </div>
              </div>
            </div>
          )}

          <Outlet /> {/* Renders nested routes like NewTicket, MyTickets */}
        </div>
      </div>

      {/* Change Password Modal */}
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

export default UserDashboard;
