// components/admin/AdminDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaTachometerAlt, FaBars, FaUsers, FaTicketAlt, FaUserPlus, FaBell, FaUserCircle, FaHome, FaSignOutAlt, FaCog, FaBuilding, FaChartBar, FaUserCog } from 'react-icons/fa';

function AdminDashboard() {
  const { auth, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]); 
  const [tickets, setTickets] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [directorates, setDirectorates] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin') setActiveTab('dashboard');
    else if (path === '/admin/users') setActiveTab('users');
    else if (path === '/admin/add-user') setActiveTab('add-user');
    else if (path === '/admin/tickets') setActiveTab('tickets');
    else if (path === '/admin/roles') setActiveTab('roles');
    else if (path === '/admin/directorates') setActiveTab('directorates');
    else if (path === '/admin/reports') setActiveTab('reports');
  }, [location]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    
    // Ensure only admin can access this dashboard
    const adminRoles = ["admin", "sub_admin"];
    if (!adminRoles.includes(auth.user.role)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    fetchAdminOverviewData();
  }, [auth, navigate]);

  const fetchAdminOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const requests = [
        axios.get(`${API_BASE_URL}/users/index.php`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${API_BASE_URL}/tickets/index.php`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        }),
        axios.get(`${API_BASE_URL}/notifications/index.php?unread=true`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      ];

      // Add optional requests for roles and directorates
      try {
        requests.push(
          axios.get(`${API_BASE_URL}/roles/index.php`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          }).catch(err => ({ data: { status: 'error', message: err.message } }))
        );
        requests.push(
          axios.get(`${API_BASE_URL}/directorates/index.php`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          }).catch(err => ({ data: { status: 'error', message: err.message } }))
        );
      } catch (err) {
        console.error('Error setting up optional requests:', err);
      }

      const [usersRes, ticketsRes, notificationsRes, rolesRes, directoratesRes] = await Promise.all(requests);

      if (usersRes.data.status === 'success') {
        setUsers(usersRes.data.users || []);
      } else {
        setError(prev => prev ? `${prev} | Failed to fetch users` : 'Failed to fetch users');
      }

      if (ticketsRes.data.status === 'success') {
        setTickets(ticketsRes.data.tickets || []);
      } else {
        setError(prev => prev ? `${prev} | Failed to fetch tickets` : 'Failed to fetch tickets');
      }

      if (notificationsRes.data.status === 'success') {
        setNotifications(notificationsRes.data.notifications || []);
      } else {
        setError(prev => prev ? `${prev} | Failed to fetch notifications` : 'Failed to fetch notifications');
      }

      // Handle roles response
      if (rolesRes && rolesRes.data && rolesRes.data.status === 'success') {
        setRoles(rolesRes.data.roles || []);
      }

      // Handle directorates response
      if (directoratesRes && directoratesRes.data && directoratesRes.data.status === 'success') {
        setDirectorates(directoratesRes.data.directorates || []);
      }

    } catch (err) {
      console.error('Error fetching admin overview data:', err);
      setError(err.response?.data?.message || 'Failed to fetch admin overview data');
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
        setSuccess('All notifications marked as read');
        setTimeout(() => setSuccess(null), 3000);
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
        setSuccess('Notification deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.message || 'Failed to delete notification');
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading admin dashboard...</div>;

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>HDMS Admin</h2>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="toggle-btn">
            <FaBars />
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/admin" className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}>
                <FaHome /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/users" className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}>
                <FaUsers /> <span>Manage Users</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/add-user" className={`sidebar-link ${activeTab === 'add-user' ? 'active' : ''}`}>
                <FaUserPlus /> <span>Add New User</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/tickets" className={`sidebar-link ${activeTab === 'tickets' ? 'active' : ''}`}>
                <FaTicketAlt /> <span>Ticket Management</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/roles" className={`sidebar-link ${activeTab === 'roles' ? 'active' : ''}`}>
                <FaUserCog /> <span>Manage Roles</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/directorates" className={`sidebar-link ${activeTab === 'directorates' ? 'active' : ''}`}>
                <FaBuilding /> <span>Manage Directorates</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/reports" className={`sidebar-link ${activeTab === 'reports' ? 'active' : ''}`}>
                <FaChartBar /> <span>Reports & Analytics</span>
              </Link>
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
          <div className="header-left">
            <h1>Admin Dashboard</h1>
          </div>
          <div className="navbar-right flex items-center">
            <div className="notification-container" onClick={() => setShowNotifications(!showNotifications)}>
              <FaBell className="notification-icon" />
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>} 
            </div>
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  {notifications.length > 0 && (
                    <button onClick={markAllNotificationsAsRead} className="mark-read-btn">
                      Mark All as Read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="notification-empty">No new notifications.</p>
                ) : (
                  <div className="notification-list">
                    {notifications.map(notification => (
                      <div key={notification.id} className="notification-item">
                        <span>{notification.message}</span>
                        <button 
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="delete-notification-btn"
                          title="Delete notification"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="user-info">
              <span className="username">{auth.user?.username || 'Admin'}</span>
              <div className="user-role">{auth.user?.role}</div>
              <FaUserCircle className="user-avatar" />
            </div>
          </div>
        </header>

        <div className="content-area">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {activeTab === 'dashboard' && (
            <div className="dashboard-overview">
              <h2>Admin Overview</h2>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon users">
                    <FaUsers />
                  </div>
                  <div className="stat-content">
                    <h3>Total Users</h3>
                    <p className="stat-number">{users.length}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon tickets">
                    <FaTicketAlt />
                  </div>
                  <div className="stat-content">
                    <h3>Open Tickets</h3>
                    <p className="stat-number">{tickets.filter(t => t.status === 'open').length}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon assigned">
                    <FaTicketAlt />
                  </div>
                  <div className="stat-content">
                    <h3>Assigned Tickets</h3>
                    <p className="stat-number">{tickets.filter(t => t.status === 'assigned').length}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon resolved">
                    <FaTicketAlt />
                  </div>
                  <div className="stat-content">
                    <h3>Resolved Tickets</h3>
                    <p className="stat-number">{tickets.filter(t => t.status === 'resolved').length}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon roles">
                    <FaUserCog />
                  </div>
                  <div className="stat-content">
                    <h3>Available Roles</h3>
                    <p className="stat-number">{roles.length}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon directorates">
                    <FaBuilding />
                  </div>
                  <div className="stat-content">
                    <h3>Directorates</h3>
                    <p className="stat-number">{directorates.length}</p>
                  </div>
                </div>
              </div>

              <div className="recent-activity card">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="activity-item">
                      <div className="activity-icon">
                        <FaUserCircle />
                      </div>
                      <div className="activity-content">
                        <p><strong>{user.username}</strong> ({user.role}) created on {new Date(user.created_at).toLocaleDateString()}</p>
                        <span className="activity-time">{new Date(user.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="no-activity">No recent user activity.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <Outlet context={{ 
            users, 
            setUsers, 
            directorates, 
            setDirectorates, 
            roles, 
            setRoles,
            fetchAdminOverviewData 
          }} />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;