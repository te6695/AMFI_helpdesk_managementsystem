// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './styles.css';

// Components
import Login from './components/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import UserDashboard from './components/user/UserDashboard';
import ResolverDashboard from './components/resolver/ResolverDashboard';
import SubAdminDashboard from './components/subadmin/SubAdminDashboard'; 
import SubAdminManageTickets from './components/subadmin/SubAdminManageTickets';
import ForgotPassword from './components/ForgotPassword';
import NewTicket from './components/user/NewTicket';
import MyTickets from './components/user/MyTickets';
import AssignedTickets from './components/resolver/AssignedTickets';
import ResolvedTickets from './components/resolver/ResolvedTickets';
import ManageUsers from './components/admin/ManageUsers';
import AddUser from './components/admin/AddUser'; 
import ManageTickets from './components/admin/ManageTickets';
import DashboardHome from './components/DashboardHome';
import ResolverNewTicket from './components/resolver/ResolverNewTicket.jsx';
import SubAdminTickets from './components/subadmin/SubadminTickets.jsx';
import ResolverTicket from './components/resolver/MysubmittedTicket.jsx';
export const AuthContext = React.createContext();

// Role utility (assuming it exists and includes ADMIN_ROLES)
import { ADMIN_ROLES, isAdminRole } from './utils/roleUtils'; 

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { auth } = React.useContext(AuthContext);
  const location = useLocation();
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const requiredRolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Check if the user's role is included in the required roles
  if (requiredRolesArray.length > 0 && !requiredRolesArray.includes(auth.user.role)) {
    // If not authorized, redirect to their default dashboard
    if (auth.user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (isAdminRole(auth.user.role)) { // Check for any sub-admin role
      return <Navigate to="/subadmin" replace />; // Redirect sub-admins to their dashboard
    } else if (auth.user.role === 'resolver') {
      return <Navigate to="/resolver" replace />;
    } else if (auth.user.role === 'user') {
      return <Navigate to="/dashboard" replace />;
    }
    // Fallback if role is not recognized or not handled
    return <Navigate to="/login" replace />; 
  }
  
  return children;
};

function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user'); 
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setAuth({
          isAuthenticated: true,
          user: user,
          token: token,
          loading: false
        });
      } catch (error) {
        console.error("Failed to parse user data from localStorage:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user'); 
        setAuth({ isAuthenticated: false, user: null, token: null, loading: false });
      }
    } else {
      setAuth({ isAuthenticated: false, user: null, token: null, loading: false });
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData)); 
    setAuth({
      isAuthenticated: true,
      user: userData,
      token: token,
      loading: false
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false
    });
  };

  if (auth.loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      <Router>
        <Routes>
          {/* Public routes - Login page always renders Login component */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} /> 
          
          {/* Protected routes - User */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="new-ticket" element={<NewTicket />} />
            <Route path="my-tickets" element={<MyTickets />} />
          </Route>
          
          {/* Protected routes - Admin (only top-level 'admin' role) */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin"> 
              <AdminDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="tickets" element={<ManageTickets />} /> {/* This is for admin reports now */}
            <Route path="add-user" element={<AddUser />} /> 
          </Route>
          
          {/* Protected routes - Sub-Admin (all roles in ADMIN_ROLES except 'admin') */}
          <Route path="/subadmin" element={
            <ProtectedRoute requiredRole={ADMIN_ROLES.filter(role => role !== 'admin')}> {/* Filter out 'admin' from ADMIN_ROLES */}
              <SubAdminDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} /> {/* Can be a subadmin-specific home or general */}
            <Route path="my-assigned-tickets" element={<SubAdminManageTickets />} /> {/* NEW: SubAdmin's ticket management */}
            <Route path="submit-ticket" element={<NewTicket isSubAdmin={true} />} /> {/* NEW: Re-use NewTicket for sub-admins */}
            <Route path="change-password" element={<SubAdminDashboard isPasswordChange={true} />} /> {/* Placeholder for password change component */}
             <Route path="my-tickets" element={<SubAdminTickets />} />
          </Route>

          {/* Protected routes - Resolver */}
          <Route path="/resolver" element={
            <ProtectedRoute requiredRole="resolver">
              <ResolverDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
         
           <Route path="submit-ticket" element={<ResolverNewTicket />} />
            <Route path="assigned" element={<AssignedTickets />} />
            <Route path="resolved" element={<ResolvedTickets />} />
            <Route path="my-tickets" element={<ResolverTicket />} />
          </Route>
          
          {/* Redirect root path based on authentication/role, defaulting to login */}
          <Route path="/" element={
            auth.isAuthenticated ? (
              auth.user.role === 'admin' ? <Navigate to="/admin" replace /> :
              isAdminRole(auth.user.role) ? <Navigate to="/subadmin" replace /> : // Redirect sub-admins
              auth.user.role === 'resolver' ? <Navigate to="/resolver" replace /> :
              <Navigate to="/dashboard" replace />
            ) : <Navigate to="/login" replace />
          } />
          
          {/* Catch all route - redirects to login if not authenticated, or to appropriate dashboard */}
          <Route path="*" element={
            auth.isAuthenticated ? (
              auth.user.role === 'admin' ? <Navigate to="/admin" replace /> :
              isAdminRole(auth.user.role) ? <Navigate to="/subadmin" replace /> : // Redirect sub-admins
              auth.user.role === 'resolver' ? <Navigate to="/resolver" replace /> :
              <Navigate to="/dashboard" replace />
            ) : <Navigate to="/login" replace />
          } />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
