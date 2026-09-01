import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { authApi, restaurantApi } from '../api/endpoints.js';
import { setToken, API_BASE } from '../api/client.js';

const AuthContext = createContext(null);

const IDLE_LOGOUT_MS = 30 * 60 * 1000; // auto-logout after 30 min without any activity
const REFRESH_EVERY_MS = 10 * 60 * 1000; // keep the 15-min access token fresh while the user is active

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

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setToken(null);
      setUser(null);
      setRestaurant(null);
    }
  }, []);

  // ---- Sliding session: never log out while active, auto-logout when idle ----
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, mark));
  }, []);

  useEffect(() => {
    if (!user) return;
    let lastRefresh = Date.now();

    const keepFresh = async () => {
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        setToken(data.accessToken);
        lastRefresh = Date.now();
      } catch {
        // ignore — the api interceptor will retry on the next request
      }
    };

    const tick = setInterval(() => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_LOGOUT_MS) {
        logout();
        return;
      }
      if (Date.now() - lastRefresh >= REFRESH_EVERY_MS) keepFresh();
    }, 60 * 1000);

    // Coming back to the tab (e.g. after laptop sleep): refresh right away if still within the idle window
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_LOGOUT_MS) logout();
      else if (Date.now() - lastRefresh >= REFRESH_EVERY_MS) keepFresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, restaurant, setRestaurant, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
