// components/DashboardHome.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../App'; 

function DashboardHome() {
  const { auth } = useContext(AuthContext);

  const getRoleSpecificContent = () => {
    switch (auth.user.role) {
      case 'admin':
        return {
          title: 'Admin Dashboard',
          description: 'Manage users, tickets, and system settings',
          features: ['User Management', 'Ticket Assignment', 'System Analytics']
        };
      case 'resolver':
        return {
          title: 'Resolver Dashboard',
          description: 'Handle assigned tickets and provide solutions',
          features: ['View Assigned Tickets', 'Resolve Issues', 'Track Progress']
        };
      case 'user':
        return {
          title: 'User Dashboard',
          description: 'Submit and track your support tickets',
          features: ['Create New Tickets', 'View Ticket Status', 'Check Solutions']
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Welcome to the help desk system',
          features: []
        };
    }
  };

  const content = getRoleSpecificContent();

  return (
    <div className="card"> {/* Apply card styling */}
      <h2>{content.title}</h2>
      <p className="welcome-message">Welcome, {auth.user.username}!</p>
      <p className="description">{content.description}</p>
      
      <div className="quick-stats">
        <div className="stat-card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            {auth.user.role === 'admin' && (
              <>
                <button className="submit-btn" onClick={() => window.location.href = '/admin/users'}>
                  Manage Users
                </button>
                <button className="submit-btn" onClick={() => window.location.href = '/admin/tickets'}>
                  Manage Tickets
                </button>
              </>
            )}
            {auth.user.role === 'resolver' && (
              <>
               <button className="submit-btn" onClick={() => window.location.href = '/dashboard/new-ticket'}>
                  Create New Ticket
                </button>
                <button className="submit-btn" onClick={() => window.location.href = '/resolver/assigned'}>
                  View Assigned Tickets
                </button>
                <button className="submit-btn" onClick={() => window.location.href = '/resolver/resolved'}>
                  View Resolved Tickets
                </button>
              </>
            )}
            {auth.user.role === 'user' && (
              <>
                <button className="submit-btn" onClick={() => window.location.href = '/dashboard/new-ticket'}>
                  Create New Ticket
                </button>
                <button className="submit-btn" onClick={() => window.location.href = '/dashboard/my-tickets'}>
                  View My Tickets
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
