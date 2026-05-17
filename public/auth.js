function renderAuth(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="tabs">
        <button class="tab active" id="tab-login" onclick="showTab('login')">Login</button>
        <button class="tab" id="tab-register" onclick="showTab('register')">Register</button>
      </div>
      <form id="login-form">
        <h2>Welcome back</h2>
        <input type="email" id="login-email" placeholder="Email" required>
        <input type="password" id="login-password" placeholder="Password" required>
        <button type="submit">Login</button>
        <p id="login-error" class="error"></p>
      </form>
      <form id="register-form" style="display:none">
        <h2>Join the void</h2>
        <input type="text" id="reg-username" placeholder="Display name" required>
        <input type="email" id="reg-email" placeholder="Email" required>
        <input type="password" id="reg-password" placeholder="Password (min 8 chars)" required>
        <button type="submit">Create Account</button>
        <p id="register-error" class="error"></p>
      </form>
    </div>`;
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

function showTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').style.display = isLogin ? 'flex' : 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    setToken(result.token);
    navigate('#dashboard');
  } catch (err) { errEl.textContent = err.message; }
}

async function handleRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('reg-username').value,
        email,
        password
      })
    });
    const result = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(result.token);
    navigate('#dashboard');
  } catch (err) { errEl.textContent = err.message; }
}
