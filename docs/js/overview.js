window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  load();

  // 🔥 Live Update
  setInterval(load, 3000);
});


async function load(){

  const matches = await getList("Matches");

  showBoards(matches);
  showGroups(matches);
  showKO(matches);
}


// ==========================
// 📺 BOARDS (LIVE)
// ==========================
function showBoards(matches){

  const div = document.getElementById("boards");

  let html = "<h2>📺 Aktuelle Spiele</h2>";

  const active = matches.filter(m =>
    m.fields &&
    m.fields.Status === "active"
  );

  if(active.length === 0){
    div.innerHTML = "<p>Keine aktiven Spiele</p>";
    return;
  }

  active.forEach(m => {

    const f = m.fields;

    html += `
      <div class="match live">
        <div class="board">Board ${f.BoardId}</div>
        ${f.Player1} vs ${f.Player2}<br>
        ${f.Score1} : ${f.Score2}
      </div>
    `;
  });

  div.innerHTML = html;
}


// ==========================
// 🧩 GRUPPEN SPIELE
// ==========================
function showGroups(matches){

  const div = document.getElementById("groups");

  let html = "<h2>🧩 Gruppenphase</h2>";

  const groupMatches = matches.filter(m =>
    m.fields &&
    m.fields.Round === "group"
  );

  if(groupMatches.length === 0){
    div.innerHTML = "";
    return;
  }

  groupMatches.forEach(m => {

    const f = m.fields;

    html += `
      <div class="match ${f.Status === "finished" ? "finished" : ""}">
        Gruppe ${f.Group} |
        ${f.Player1} vs ${f.Player2} |
        Board ${f.BoardId}
      </div>
    `;
  });

  div.innerHTML = html;
}


// ==========================
// 🏆 KO PHASE
// ==========================
function showKO(matches){

  const div = document.getElementById("ko");

  let html = "<h2>🏆 KO Phase</h2>";

  const koMatches = matches.filter(m =>
    m.fields &&
    m.fields.Round !== "group" &&
    m.fields.Round !== ""
  );

  if(koMatches.length === 0){
    div.innerHTML = "";
    return;
  }

  koMatches.forEach(m => {

    const f = m.fields;

    html += `
      <div class="match ${f.Status === "finished" ? "finished" : ""}">
        ${f.Round.toUpperCase()} |
        ${f.Player1} vs ${f.Player2} |
        Board ${f.BoardId}
      </div>
    `;
  });

  div.innerHTML = html;
}
