import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';


function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState(''); // 'success', 'error', 'warning'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Custom modal for alerts instead of window.alert
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('info'); // info, success, error

  const showModal = (title, msg, type) => {
    setModalTitle(title);
    setModalMessage(msg);
    setModalType(type);
    setShowConfirmationModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setStatus('');
    setLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setStatus('error');
      setLoading(false);
      return;
    }

    try {
      // NOTE: This API call is part of the frontend's interaction with the backend.
      // As per your request, I am not modifying backend/database-related code.
      const response = await axios.post('http://localhost/HDMS/helpdesk-backend/api/auth/forgot-password.php', { email });
      
      if (response.data) {
        setMessage(response.data.message);
        setStatus(response.data.status || 'success');
        showModal('Password Reset', response.data.message, response.data.status || 'success');
        
        // Optionally redirect after a successful reset link send
        // if (response.data.status === 'success') {
        //   setTimeout(() => navigate('/login'), 3000);
        // }
      } else {
        setError('An unexpected error occurred.');
        setStatus('error');
        showModal('Error', 'An unexpected error occurred.', 'error');
      }
    } catch (err) {
      console.error('Error sending reset link:', err);
      setError('Failed to send reset link. Please check your email and try again.');
      setStatus('error');
      showModal('Error', 'Failed to send reset link. Please check your email and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page"> {/* Reusing login-page styling */}
      <div className="login-container">
        <div className="login-box card"> {/* Reusing login-box and card styling */}
          <button onClick={() => navigate('/login')} className="back-button">
            <FaArrowLeft /> Back to Login
          </button>
          <h2>Forgot Password</h2>
          <p className="login-subtext">Enter your email to receive a password reset link.</p>

          {(message && status === 'success') && (
            <div className="success-message">
              <FaCheckCircle className="inline-block mr-2" /> {message}
            </div>
          )}
          {(error && status === 'error') && (
            <div className="error-message">
              <FaExclamationTriangle className="inline-block mr-2" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                  disabled={loading}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="submit-btn" // Reusing submit-btn styling
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-600">
            <p>Didn't receive the email?</p>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="resend-link-btn" // Custom style for resend if needed, otherwise re-use basic button
            >
              Click to resend
            </button>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className={modalType === 'error' ? 'text-red-600' : 'text-green-600'}>
              {modalType === 'success' && <FaCheckCircle className="inline-block mr-2" />}
              {modalType === 'error' && <FaExclamationTriangle className="inline-block mr-2" />}
              {modalType === 'info' && <FaInfoCircle className="inline-block mr-2" />}
              {modalTitle}
            </h3>
            <p>{modalMessage}</p>
            <div className="modal-actions">
              <button onClick={() => setShowConfirmationModal(false)} className="submit-btn">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;
