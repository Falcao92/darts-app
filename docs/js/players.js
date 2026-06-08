async function loadPlayers() {
  await login();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items?expand=fields`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  const div = document.getElementById("players");

  div.innerHTML = "";

  data.value.forEach(p => {
    const f = p.fields;
    div.innerHTML += `
      <div>
        <h3>${f.Title}</h3>
        <p>Spiele: ${f.GamesPlayed || 0}</p>
        <p>Siege: ${f.Wins || 0}</p>
        <p>Avg: ${(f.Avg || 0).toFixed(2)}</p>
      </div>
    `;
  });
}

loadPlayers();