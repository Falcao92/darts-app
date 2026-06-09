let players = [];

async function loadPlayers() {
await ensureLogin();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items?expand=fields`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  players = data.value;

  const div = document.getElementById("playerList");
  div.innerHTML = "";

  players.forEach(p => {
    div.innerHTML += `
      <div>
        <input type="checkbox" value="${p.fields.Title}">
        ${p.fields.Title}
      </div>
    `;
  });
}

function createKO(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      p1: shuffled[i],
      p2: shuffled[i + 1] || "Freilos",
      winner: null
    });
  }

  return { mode: "ko", rounds: [{ name: "Runde 1", matches }] };
}

function createGroups(players) {
  let groups = [];
  const groupSize = 3;
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += groupSize) {
    const groupPlayers = shuffled.slice(i, i + groupSize);
    let matches = [];

    for (let a = 0; a < groupPlayers.length; a++) {
      for (let b = a + 1; b < groupPlayers.length; b++) {
        matches.push({ p1: groupPlayers[a], p2: groupPlayers[b], s1: 0, s2: 0 });
      }
    }

    groups.push({ name: "Gruppe " + String.fromCharCode(65 + groups.length), players: groupPlayers, matches });
  }

  return { mode: "group", groups };
}

async function createMatches(data) {
  let board = 1;

  if (data.mode === "ko") {
    for (const m of data.rounds[0].matches) {
      await createMatch(m.p1, m.p2, board++);
    }
  }

  if (data.mode === "group") {
    for (const g of data.groups) {
      for (const m of g.matches) {
        await createMatch(m.p1, m.p2, board++);
      }
    }
  }
}

async function createMatch(p1, p2, board) {
  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          Title: p1 + " vs " + p2,
          Player1: p1,
          Player2: p2,
          Score1: 501,
          Score2: 501,
          BoardId: board,
          Status: "playing",
          Turn: "p1"
        }
      })
    }
  );
}

async function saveTournament(data) {
  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Tournaments/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          Title: "Turnier",
          Mode: data.mode,
          Data: JSON.stringify(data),
          Status: "running"
        }
      })
    }
  );
}

async function createTournament() {
  await login();

  const checked = document.querySelectorAll("input[type=checkbox]:checked");
  const selectedPlayers = Array.from(checked).map(x => x.value);

  if (selectedPlayers.length < 2) {
    alert("Mindestens 2 Spieler auswählen!");
    return;
  }

  const mode = document.getElementById("mode").value;

  const data = mode === "ko" ? createKO(selectedPlayers) : createGroups(selectedPlayers);

  await saveTournament(data);
  await createMatches(data);

  alert("✅ Turnier + Matches erstellt");
}

loadPlayers();
