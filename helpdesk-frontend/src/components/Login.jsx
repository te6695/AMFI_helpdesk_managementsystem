// components/Login.jsx
import React, { useState, useContext, useEffect } from 'react';
import { FaLock, FaUser, FaEye, FaEyeSlash, FaQuestionCircle } from 'react-icons/fa';
import { API_BASE_URL } from '../config/api';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { ADMIN_ROLES, isAdminRole } from '../utils/roleUtils'; // Import isAdminRole

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { auth, login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already authenticated when Login component loads
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      if (auth.user.role === 'admin') { 
        navigate('/admin', { replace: true });
      } else if (isAdminRole(auth.user.role)) { // Check for any sub-admin role
        navigate('/subadmin', { replace: true }); // Redirect sub-admins to their new dashboard
      } else if (auth.user.role === 'resolver') {
        navigate('/resolver', { replace: true });
      } else if (auth.user.role === 'user') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [auth.isAuthenticated, auth.user, navigate]); // Dependencies for useEffect

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        login(data.token, data.user);
        // Redirection logic is now handled by the useEffect above
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Network error or server unreachable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-brand">
          <img src="/public/amfi-logo.png" alt="Company Logo" />
          <h1>AMFI Help Desk Portal</h1>
          <img src="/public/amfi-logo.png" alt="Company Logo" />
        </div>

      </header>

      <div className="login-main-content">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome Back!</h2>
            <p>Sign in to your account</p>
          </div>
          <hr className='hr-line' />

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="professional-input-border"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="professional-input-border"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* <div className="text-right mb-4">
              <Link to="/forgot-password" className="forgot-password-link">
                <FaQuestionCircle className="inline-block mr-1" /> Forgot Password?
              </Link>
            </div> */}

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-button"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>

      <footer className="login-footer">
        <div className="footer-links">
          <Link to="https://akufadamf.com/#">Privacy Policy</Link>
          <Link to="https://akufadamf.com/#">Terms of Service</Link>
          <Link to="https://akufadamf.com/about/">About</Link>
        <nav className="login-nav">
          <Link to="https://akufadamf.com/contact-us/" className="login-nav-link">Contact Support</Link>
        </nav>
        </div>
        <p>&copy; {new Date().getFullYear()} AMFI Help Desk. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Login;
