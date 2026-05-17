async function renderDashboard(container) {
  container.innerHTML = `
    <div class="dashboard">
      <div id="user-info">Loading...</div>
      <hr>
      <h2>Make a Donation</h2>
      <form id="donation-form">
        <input type="number" id="donation-amount" placeholder="Amount ($)" min="0.01" step="0.01" required>
        <input type="text" id="donation-note" placeholder="Optional message to the void">
        <button type="submit">Donate for Nothing</button>
        <p id="donation-error" class="error"></p>
      </form>
      <hr>
      <h2>Your Donations</h2>
      <div id="donations-list">Loading...</div>
      <hr>
      <div class="danger-zone">
        <button id="cert-btn">📜 Download Certificate</button>
        <button id="delete-account-btn" class="danger">Delete My Account</button>
      </div>
    </div>`;
  await loadUserInfo();
  await loadDonations();
  document.getElementById('donation-form').addEventListener('submit', handleDonate);
  document.getElementById('cert-btn').addEventListener('click', downloadCertificate);
  document.getElementById('delete-account-btn').addEventListener('click', deleteAccount);
}

async function loadUserInfo() {
  try {
    const user = await apiFetch('/users/me');
    document.getElementById('user-info').innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <h1 style="color:#D4AF37">${escapeHtml(user.username)}</h1>
        <button class="small" onclick="editUsername()">✏️ Edit Name</button>
      </div>
      <p style="color:#777;margin-top:0.3rem">Member since ${new Date(user.created_at).toLocaleDateString()}</p>`;
  } catch (err) {
    if (err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('expired')) {
      removeToken(); navigate('#auth');
    }
  }
}

async function loadDonations() {
  const listEl = document.getElementById('donations-list');
  try {
    const donations = await apiFetch('/donations/mine');
    if (donations.length === 0) {
      listEl.innerHTML = '<p style="color:#777">No donations yet. Make your first pointless contribution above!</p>';
      return;
    }
    const total = donations.reduce((sum, d) => sum + d.amount, 0);
    listEl.innerHTML = `
      <p style="margin-bottom:0.8rem"><strong style="color:#D4AF37">Total donated: $${total.toFixed(2)}</strong></p>
      <table>
        <thead><tr><th>Amount</th><th>Note</th><th>Date</th><th></th></tr></thead>
        <tbody>${donations.map(d => `
          <tr>
            <td>$${parseFloat(d.amount).toFixed(2)}</td>
            <td>${escapeHtml(d.note || '—')}</td>
            <td>${new Date(d.created_at).toLocaleDateString()}</td>
            <td><button class="small" onclick="deleteDonation(${d.id})">Delete</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) { listEl.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`; }
}

async function handleDonate(e) {
  e.preventDefault();
  const errEl = document.getElementById('donation-error');
  errEl.textContent = '';
  try {
    await apiFetch('/donations', {
      method: 'POST',
      body: JSON.stringify({
        amount: parseFloat(document.getElementById('donation-amount').value),
        note: document.getElementById('donation-note').value
      })
    });
    document.getElementById('donation-amount').value = '';
    document.getElementById('donation-note').value = '';
    await loadDonations();
  } catch (err) { errEl.textContent = err.message; }
}

async function deleteDonation(id) {
  if (!confirm('Remove this donation from the void?')) return;
  try { await apiFetch(`/donations/${id}`, { method: 'DELETE' }); await loadDonations(); }
  catch (err) { alert(err.message); }
}

async function downloadCertificate() {
  const res = await fetch('/api/certificate/pdf', { headers: { 'Authorization': `Bearer ${getToken()}` } });
  if (!res.ok) { const d = await res.json(); alert(d.error); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'my-nothing-certificate.pdf'; a.click();
  URL.revokeObjectURL(url);
}

async function editUsername() {
  const newName = prompt('Enter new display name (min 2 characters):');
  if (!newName || newName.trim().length < 2) return;
  try { await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify({ username: newName.trim() }) }); await loadUserInfo(); }
  catch (err) { alert(err.message); }
}

async function deleteAccount() {
  if (!confirm('Delete your account and all donations? The void will forget you.')) return;
  try { await apiFetch('/users/me', { method: 'DELETE' }); removeToken(); navigate('#leaderboard'); }
  catch (err) { alert(err.message); }
}
