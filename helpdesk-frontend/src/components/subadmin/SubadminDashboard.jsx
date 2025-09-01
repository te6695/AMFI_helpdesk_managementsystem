import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaBars, FaHome, FaTicketAlt, FaPlusCircle, FaCog, FaBell, FaUserCircle, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import SubAdminDashboardOverview from './SubAdminDashboardOverview';

function SubAdminDashboard({ isPasswordChange = false }) {
  const { auth, logout } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // State for password change form
  const [showChangePassword, setShowChangePassword] = useState(isPasswordChange);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Redirect if not authenticated or not a sub-admin role
    if (!auth.isAuthenticated || auth.user.role === 'admin' || auth.user.role === 'resolver' || auth.user.role === 'user') {
      navigate('/login', { replace: true });
      return;
    }
    fetchNotifications();
    
    // Set up interval to fetch notifications every 30 seconds
    const intervalId = setInterval(fetchNotifications, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [auth.isAuthenticated, auth.user?.role, navigate, auth.token]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/index.php?user_id=${auth.user.id}&unread=true`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      if (response.data.status === 'success') {
        setNotifications(response.data.notifications || []);
      } else {
        console.error("Failed to fetch notifications:", response.data.message);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token might be expired, try to logout
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/index.php?id=${notificationId}`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Update local state to mark as read
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: '1' } : n
      ));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/index.php`, 
        { userId: auth.user.id },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      
      // Update local state to mark all as read
      setNotifications(prev => prev.map(n => ({ ...n, is_read: '1' })));
      setShowNotifications(false);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications/index.php?id=${notificationId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8 ||
        !/[A-Z]/.test(passwordForm.newPassword) ||
        !/[a-z]/.test(passwordForm.newPassword) ||
        !/[0-9]/.test(passwordForm.newPassword) ||
        !/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      setPasswordError('Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/change_password.php`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      if (response.data.status === 'success') {
        setPasswordMessage(response.data.message);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(response.data.message || 'Failed to change password.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.response?.data?.message || 'An error occurred while changing password.');
    }
  };

  const handleCancelPasswordChange = () => {
    setShowChangePassword(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
    setPasswordError('');
  };

  const unreadNotifications = notifications.filter(n => n.is_read === '0');
  const notificationCount = unreadNotifications.length;

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div>Loading sub-admin dashboard...</div>;
  }

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>HDMS</h2>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="toggle-btn">
            <FaBars />
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/subadmin" className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <FaHome /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/subadmin/my-assigned-tickets" className={`sidebar-link ${activeTab === 'my-assigned-tickets' ? 'active' : ''}`} onClick={() => setActiveTab('my-assigned-tickets')}>
                <FaTicketAlt /> <span>Manage My Tickets</span>
              </Link>
            </li>
            <li>
              <Link to="/subadmin/submit-ticket" className={`sidebar-link ${activeTab === 'submit-ticket' ? 'active' : ''}`} onClick={() => setActiveTab('submit-ticket')}>
                <FaPlusCircle /> <span>Submit New Ticket</span>
              </Link>
            </li>
            <li>
              <Link to="/subadmin/my-tickets" className={`sidebar-link ${activeTab === 'my-tickets' ? 'active' : ''}`} onClick={() => setActiveTab('my-tickets')}>
                <FaTicketAlt /> <span>View My Tickets</span>
              </Link>
            </li>
            <li>
              <button 
                className={`sidebar-link-button ${activeTab === 'change-password' ? 'active' : ''}`} 
                onClick={() => setShowChangePassword(true)}
              >
                <FaCog /> <span>Change Password</span>
              </button>
            </li>
            <li>
              <button onClick={handleLogout} className="sidebar-link-button">
                <FaSignOutAlt /> <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="main-content-wrapper">
        <header className="header">
          <div className="navbar-right">
            <div className="notification-container">
              <div className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
                <FaBell />
                {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
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
                    <p className="no-notifications">No notifications</p>
                  ) : (
                    <>
                      <div className="notification-list">
                        {notifications.map(notification => (
                          <div key={notification.id} className={`notification-item ${notification.is_read === '0' ? 'unread' : ''}`}>
                            <div className="notification-content">
                              <p>{notification.message}</p>
                              <span className="notification-time">
                                {new Date(notification.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="notification-actions">
                              {notification.is_read === '0' && (
                                <button 
                                  onClick={() => markNotificationAsRead(notification.id)}
                                  className="mark-read-btn"
                                  title="Mark as read"
                                >
                                  ✓
                                </button>
                              )}
                              <button 
                                onClick={() => deleteNotification(notification.id)}
                                className="delete-notification-btn"
                                title="Delete notification"
                              >
                                ×
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
              <span>{auth.user?.username || 'Sub-Admin'} ({auth.user?.role || 'N/A'})</span>
              <FaUserCircle />
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' ? (
            <SubAdminDashboardOverview />
          ) : (
            <Outlet />
          )}
        </div>
      </div>

      {/* Password Change Modal - Always rendered as an overlay */}
      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button 
                onClick={handleCancelPasswordChange} 
                className="close-modal"
                aria-label="Close password change modal"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handlePasswordChangeSubmit}>
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
                <button type="submit" className="submit-btn">Change Password</button>
                <button type="button" onClick={handleCancelPasswordChange} className="cancel-btn">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubAdminDashboard;