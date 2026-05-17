async function renderLeaderboard(container) {
  container.innerHTML = `
    <div class="leaderboard">
      <h1>🏆 Hall of Pointless Generosity</h1>
      <p class="subtitle">These brave souls paid money for absolutely nothing.</p>
      <div id="board-content">Loading...</div>
    </div>`;
  try {
    const rankings = await apiFetch('/leaderboard');
    const content = document.getElementById('board-content');
    if (rankings.length === 0) {
      content.innerHTML = '<p style="color:#777;margin-top:1rem">No one has donated yet. Be the first.</p>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    content.innerHTML = `
      <table>
        <thead><tr><th>Rank</th><th>Name</th><th>Total Donated</th><th>Times</th></tr></thead>
        <tbody>${rankings.map((r, i) => `
          <tr class="${i < 3 ? 'top-' + (i + 1) : ''}">
            <td>${medals[i] || '#' + (i + 1)}</td>
            <td>${escapeHtml(r.username)}</td>
            <td>$${parseFloat(r.total).toFixed(2)}</td>
            <td>${r.donation_count}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    document.getElementById('board-content').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}
