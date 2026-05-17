const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function removeToken() { localStorage.removeItem('token'); }
function isLoggedIn() { return !!getToken(); }
function navigate(hash) { window.location.hash = hash; }

function updateNav() {
  document.getElementById('nav-auth').style.display = isLoggedIn() ? 'none' : 'inline';
  document.getElementById('nav-user').style.display = isLoggedIn() ? 'inline-flex' : 'none';
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function router() {
  const hash = window.location.hash || '#leaderboard';
  const app = document.getElementById('app');
  updateNav();
  if (hash === '#leaderboard' || hash === '') renderLeaderboard(app);
  else if (hash === '#auth') { if (isLoggedIn()) return navigate('#dashboard'); renderAuth(app); }
  else if (hash === '#dashboard') { if (!isLoggedIn()) return navigate('#auth'); renderDashboard(app); }
  else app.innerHTML = '<p>Page not found.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
    removeToken();
    navigate('#leaderboard');
  });
  router();
});

window.addEventListener('hashchange', router);
