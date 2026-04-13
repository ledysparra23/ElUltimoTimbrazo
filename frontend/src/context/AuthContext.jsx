import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Step 1: validate creds, send OTP → returns { requiresOtp, email, devOtp? }
  const loginStep1 = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password });
    return res.data;
  };

  // Step 2: verify OTP → sets token + user
  const loginStep2 = async (email, otp) => {
    const res = await axios.post('/auth/login/verify-otp', { email, otp });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(u);
    return u;
  };

  // Direct login (OTP disabled by user)
  const loginDirect = async (email, password) => {
    const res = await axios.post('/auth/login/direct', { email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(u);
    return u;
  };

  const resendOtp = async (email) => {
    const res = await axios.post('/auth/login/resend-otp', { email });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginStep1, loginStep2, loginDirect, resendOtp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
