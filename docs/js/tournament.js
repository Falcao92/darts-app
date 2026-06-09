async function loadTournament() {
await ensureLogin();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Tournaments/items?expand=fields`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  const t = JSON.parse(data.value[0].fields.Data);

  showGroups(t.groups);
  showKO(t.knockout);
}

function showGroups(groups) {
  const div = document.getElementById("groups");
  div.innerHTML = "";

  groups.forEach(g => {
    let html = `<h2>${g.name}</h2>`;
    g.matches.forEach(m => {
      html += `<p>${m.p1} vs ${m.p2} (${m.s1}:${m.s2})</p>`;
    });
    div.innerHTML += html;
  });
}

function showKO(rounds) {
  const div = document.getElementById("ko");

  rounds.forEach(r => {
    let html = `<h3>${r.name}</h3>`;
    r.matches.forEach(m => {
      html += `<p>${m.p1} vs ${m.p2} → ${m.winner || "-"}</p>`;
    });
    div.innerHTML += html;
  });
}

loadTournament();
