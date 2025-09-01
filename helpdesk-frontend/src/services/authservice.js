// src/services/authService.js
import API_BASE_URL from '../api';

export const login = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return await response.json();
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};