import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';

// Components
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
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
import ManageDirectorates from './components/admin/ManageDirectorates.jsx';
import ManageRoles from './components/admin/ManageRoles.jsx';

// Role utility
import { ADMIN_ROLES, isAdminRole } from './utils/roleUtils'; 

// Create Auth Context
export const AuthContext = createContext();

// Helper function for role-based redirection
const getRedirectPath = (role) => {
  if (role === 'admin') return '/admin';
  if (isAdminRole(role)) return '/subadmin';
  if (role === 'resolver') return '/resolver';
  return '/dashboard';
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
    const currentRole = localStorage.getItem('currentRole');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setAuth({
          isAuthenticated: true,
          user: {
            ...user,
            currentRole: currentRole || user.role
          },
          token,
          loading: false
        });
      } catch (error) {
        console.error("Failed to parse user data from localStorage:", error);
        localStorage.clear();
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
      user: {
        ...userData,
        currentRole: userData.role
      },
      token,
      loading: false
    });
  };

  const logout = () => {
    localStorage.clear();
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false
    });
  };

  const switchRole = (role) => {
    localStorage.setItem('currentRole', role);
    setAuth(prev => ({
      ...prev,
      user: {
        ...prev.user,
        currentRole: role
      }
    }));
  };

  if (auth.loading) {
    return <div className="loading">Loading...</div>;
  }

  const effectiveRole = auth.user?.currentRole || auth.user?.role;

  return (
    <AuthContext.Provider value={{ auth, login, logout, switchRole }}>
      <Router>
        <Routes>
          {/* Public routes */}
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
          
          {/* Protected routes - Admin */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin"> 
              <AdminDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="tickets" element={<ManageTickets />} />
            <Route path="add-user" element={<AddUser />} /> 
            <Route path="roles" element={<ManageRoles />} />
            <Route path="directorates" element={<ManageDirectorates />} />
          </Route>
          
          {/* Protected routes - Sub-Admin */}
          <Route path="/subadmin" element={
            <ProtectedRoute requiredRole={ADMIN_ROLES.filter(role => role !== 'admin')}>
              <SubAdminDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="my-assigned-tickets" element={<SubAdminManageTickets />} />
            <Route path="submit-ticket" element={<NewTicket isSubAdmin={true} />} />
            <Route path="change-password" element={<SubAdminDashboard isPasswordChange={true} />} />
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
          
          {/* Redirect root path */}
          <Route path="/" element={
            auth.isAuthenticated ? (
              <Navigate to={getRedirectPath(effectiveRole)} replace />
            ) : <Navigate to="/login" replace />
          } />
          
          {/* Catch all route */}
          <Route path="*" element={
            auth.isAuthenticated ? (
              <Navigate to={getRedirectPath(effectiveRole)} replace />
            ) : <Navigate to="/login" replace />
          } />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
