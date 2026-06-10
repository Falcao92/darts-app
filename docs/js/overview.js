window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  update();

  setInterval(update, 3000); // Live Refresh
});


async function update(){

  const matches = await getList("Matches");

  renderBoards(matches);
  renderGroups(matches);
}


// ===================================
// 📺 BOARDS (KORREKT!)
// ===================================
function renderBoards(matches){

  const div = document.getElementById("boards");

  // ✅ Board Anzahl aus Admin
  const BOARD_COUNT = parseInt(localStorage.getItem("boardCount")) || 5;

  let html = "";

  for(let boardId = 1; boardId <= BOARD_COUNT; boardId++){

    const boardMatches = matches.filter(m =>
      m.fields &&
      m.fields.BoardId == boardId
    );

    // ✅ aktuelles Spiel
    const live = boardMatches.find(m =>
      m.fields.Status === "active"
    );

    // ✅ Warteschlange (noch nicht gespielt)
    const queue = boardMatches.filter(m =>
      m.fields.Status !== "active" &&
      m.fields.Status !== "finished"
    );

    const next = queue[0];

    html += `<div class="board">`;
    html += `<div class="title">Board ${boardId}</div>`;

    // 🎯 LIVE
    if(live){
      html += `
        <div class="live">
          ${live.fields.Player1} vs ${live.fields.Player2}<br>
          ${live.fields.Score1} : ${live.fields.Score2}
        </div>
      `;
    } else {
      html += `<div>frei</div>`;
    }

    // ⏭ NEXT
    if(next){
      html += `
        <div class="next">
          Next:<br>
          ${next.fields.Player1} vs ${next.fields.Player2}
        </div>
      `;
    }

    html += `</div>`;
  }

  div.innerHTML = html;
}


// ===================================
// 🧩 GRUPPEN KOMPAKT
// ===================================
function renderGroups(matches){

  const div = document.getElementById("groups");

  let groups = {};

  matches.forEach(m => {

    const f = m.fields;

    if(f.Group){
      if(!groups[f.Group]) groups[f.Group] = [];
      groups[f.Group].push(f.Player1, f.Player2);
    }
  });

  let html = "";

  Object.keys(groups).forEach(g => {

    const players = [...new Set(groups[g])];

    html += `
      <div class="group">
        <b>Gruppe ${g}</b><br>
        ${players.join("<br>")}
      </div>
    `;
  });

  div.innerHTML = html;
}
