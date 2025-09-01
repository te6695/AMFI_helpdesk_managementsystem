// components/admin/AdminDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaTachometerAlt, FaBars, FaUsers, FaTicketAlt, FaUserPlus, FaBell, FaUserCircle, FaHome, FaSignOutAlt } from 'react-icons/fa';
import { ADMIN_ROLES } from '../../utils/roleUtils'; // Import ADMIN_ROLES

function AdminDashboard() {
  const { auth, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]); 
  const [tickets, setTickets] = useState([]); 
  const [notifications, setNotifications] = useState([]); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    
    // Ensure only top-level 'admin' can access this specific dashboard overview
    if (auth.user.role !== 'admin') {
      navigate('/dashboard', { replace: true }); // Redirect to general dashboard if not top-level admin
      return;
    }
    
    fetchAdminOverviewData();
  }, [auth, navigate]);

  const fetchAdminOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, ticketsRes, notificationsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/index.php`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${API_BASE_URL}/tickets/index.php`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${API_BASE_URL}/notifications/index.php?unread=true`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      ]);

      if (usersRes.data.status === 'success') {
        setUsers(usersRes.data.users || []);
      } else {
        setError(usersRes.data.message || 'Failed to fetch users for overview');
        setUsers([]);
      }

      if (ticketsRes.data.status === 'success') {
        setTickets(ticketsRes.data.tickets || []);
      } else {
        setError(prev => prev + (prev ? ' | ' : '') + (ticketsRes.data.message || 'Failed to fetch tickets for overview'));
        setTickets([]);
      }

      if (notificationsRes.data.status === 'success') {
        setNotifications(notificationsRes.data.notifications || []);
      } else {
        setError(prev => prev + (prev ? ' | ' : '') + (notificationsRes.data.message || 'Failed to fetch notifications'));
        setNotifications([]);
      }

    } catch (err) {
      console.error('Error fetching admin overview data:', err);
      setError(err.response?.data?.message || 'Failed to fetch admin overview data');
      setUsers([]);
      setTickets([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notifications/index.php`,
        { userId: auth.user.id },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (response.data.status === 'success') {
        setNotifications([]);
      } else {
        setError(response.data.message || 'Failed to mark notifications as read');
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      setError(err.response?.data?.message || 'Failed to mark notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/notifications/index.php?id=${notificationId}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (response.data.status === 'success') {
        setNotifications(notifications.filter(notif => notif.id !== notificationId));
      } else {
        setError(response.data.message || 'Failed to delete notification');
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>HDMS</h2>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="toggle-btn">
            <FaBars className={sidebarCollapsed ? 'hidden' : ''} />
            <FaBars className={sidebarCollapsed ? '' : 'hidden'} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/admin" className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  <FaHome /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/users" className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                <FaUsers /> <span>Manage Users</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/add-user" className={`sidebar-link ${activeTab === 'add-user' ? 'active' : ''}`} onClick={() => setActiveTab('add-user')}>
                <FaUserPlus /> <span>Add New User</span>
              </Link>
            </li>
            <li>
              {/* This link now leads to the statistical view of Manage Tickets for the main admin */}
              <Link to="/admin/tickets" className={`sidebar-link ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
                <FaTicketAlt /> <span>Ticket Reports</span>
              </Link>
            </li>
            <li>
              <button onClick={logout} className="sidebar-link">
                <FaSignOutAlt /> <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="main-content-wrapper">
        <header className="header">
          <div className="navbar-right flex items-center">
            <div className="notification-container" onClick={() => setShowNotifications(!showNotifications)}>
              <FaBell className="notification-icon" />
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>} 
            </div>
            {showNotifications && (
              <div className="notification-dropdown">
                <h4>Notifications</h4>
                {notifications.length === 0 ? (
                  <p>No new notifications.</p>
                ) : (
                  <>
                    {notifications.map(notification => (
                      <div key={notification.id} className="notification-item">
                        <span>{notification.message}</span>
                        <button 
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="delete-notification-btn"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button onClick={markAllNotificationsAsRead} className="mark-read-btn">
                      Mark All as Read
                    </button>
                  </>
                )}
              </div>
            )}
            
            <div className="user-info">
              <span>{auth.user?.username || 'Admin'}</span>
              <FaUserCircle />
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' && (
            <div className="dashboard-overview card">
              <h2>Admin Overview</h2>
              
              {error && <div className="error-message">{error}</div>}

              <div className="stats-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card card">
                  <h3>Total Users</h3>
                  <p>{users.length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Open Tickets</h3>
                  <p>{tickets.filter(t => t.status === 'open').length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Assigned Tickets</h3>
                  <p>{tickets.filter(t => t.status === 'assigned').length}</p>
                </div>
                <div className="stat-card card">
                  <h3>Resolved Tickets</h3>
                  <p>{tickets.filter(t => t.status === 'resolved').length}</p>
                </div>
              </div>

              <div className="recent-data card mt-8">
                <h3>Recent Activity</h3>
                {/* Placeholder for detailed recent activity or quick links */}
              </div>
            </div>
          )}
          
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
