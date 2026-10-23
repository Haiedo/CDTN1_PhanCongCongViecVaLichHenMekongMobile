// Nghiệp vụ đăng nhập: POST /auth/login
import { getClient } from './client.js';

export async function login(username, password) {
  const c = getClient();
  const r = await c.post('/auth/login', { username, password });
  c.setSession(r.token, r.user);
  return r.user;
}
export const logout = () => getClient().clearSession();
export const currentUser = () => (getClient().getToken() ? getClient().getUser() : null);
