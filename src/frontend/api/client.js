// LỚP GIAO DIỆN – nơi DUY NHẤT trong giao diện gọi mạng (hàm gọi HTTP chỉ nằm trong thư mục api/).
// Các trang (pages/) chỉ gọi hàm trong *.api.js, không tự gọi HTTP → đổi địa chỉ API hay cách xác thực chỉ sửa ở đây.
//
// Hợp đồng lỗi với backend:  { "error": { "code": "...", "message": "...", ...thêm } }
//   · backend không trả lời được → ApiError(status 0, code NETWORK_ERROR)
//   · 401 khi đang có token (hết hạn/sai) → xóa token, gọi onUnauthorized() để về trang đăng nhập
const TOKEN_KEY = 'mekong.token';
const USER_KEY = 'mekong.user';

export class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

export function createClient({ baseUrl = '/api/v1', fetchFn, storage, onUnauthorized = () => {} } = {}) {
  const send = fetchFn || ((...args) => globalThis.fetch(...args));
  let store = storage;
  if (!store) { try { store = globalThis.localStorage; } catch { /* trình duyệt chặn lưu trữ */ } }
  store = store || memoryStorage();

  const getToken = () => store.getItem(TOKEN_KEY);
  const getUser = () => { try { return JSON.parse(store.getItem(USER_KEY)); } catch { return null; } };
  const setSession = (token, user) => { store.setItem(TOKEN_KEY, token); store.setItem(USER_KEY, JSON.stringify(user)); };
  const clearSession = () => { store.removeItem(TOKEN_KEY); store.removeItem(USER_KEY); };

  async function request(method, path, body) {
    const token = getToken();
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await send(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy rồi thử lại.');
    }
    let data = null;
    try { data = await res.json(); } catch { /* thân rỗng hoặc không phải JSON */ }
    if (!res.ok) {
      const err = (data && data.error) || {};
      if (res.status === 401 && token) { clearSession(); onUnauthorized(err.code); }
      const { code, message, ...extra } = err;
      throw new ApiError(res.status, code || 'HTTP_' + res.status, message || `Lỗi ${res.status} từ máy chủ.`, extra);
    }
    return data;
  }
  return {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    patch: (p, b) => request('PATCH', p, b),
    del: (p) => request('DELETE', p),
    getToken, getUser, setSession, clearSession,
  };
}

let shared = null;
export function getClient() {
  if (!shared) {
    shared = createClient({
      onUnauthorized: (code) => {
        try { sessionStorage.setItem('mekong.flash', code === 'TOKEN_EXPIRED' ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : 'Vui lòng đăng nhập lại.'); } catch { /* bỏ qua */ }
        globalThis.location.hash = '#/login';
      },
    });
  }
  return shared;
}
