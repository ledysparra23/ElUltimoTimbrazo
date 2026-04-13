import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  // Use state (not ref) so consumers re-render when socket changes
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    const s = io(BACKEND, {
      auth: { token },
      transports: ['websocket', 'polling'], // fallback to polling if websocket fails
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setConnected(true);
      setSocket(s); // set state AFTER connect so components get non-null socket
      if (user.rol === 'admin') s.emit('admin:unirse');
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
