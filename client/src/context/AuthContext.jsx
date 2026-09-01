import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { authApi, restaurantApi } from '../api/endpoints.js';
import { setToken, API_BASE } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRestaurant = useCallback(async (u) => {
    if (u?.restaurantId) {
      try {
        const { data } = await restaurantApi.get();
        setRestaurant(data.restaurant);
      } catch {
        setRestaurant(null);
      }
    } else {
      setRestaurant(null);
    }
  }, []);

  // Bootstrap the session: refresh cookie → new access token, else stay logged out
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        setToken(data.accessToken);
        setUser(data.user);
        await loadRestaurant(data.user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRestaurant]);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setRestaurant(null);
    };
    window.addEventListener('qm:logout', onLogout);
    return () => window.removeEventListener('qm:logout', onLogout);
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    setToken(data.accessToken);
    setUser(data.user);
    await loadRestaurant(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await authApi.signup(payload);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setToken(null);
      setUser(null);
      setRestaurant(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, restaurant, setRestaurant, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
