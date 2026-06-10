window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  update();
  setInterval(update, 3000);
});


async function update(){

  const matches = await getList("Matches");

  renderBoards(matches);
  renderBracket(matches);
}


// =======================
// BOARDS
// =======================
function renderBoards(matches){

  const div = document.getElementById("boards");

  let html = "";

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  boards.forEach(board => {

    const m = matches.find(x =>
      x.fields.BoardId == board &&
      x.fields.Status === "active"
    );

    html += `<div class="board">Board ${board}<br>`;

    if(m){
      const f = m.fields;
      html += `${f.Player1} vs ${f.Player2}<br>${f.Score1}:${f.Score2}`;
    } else {
      html += "frei";
    }

    html += "</div>";
  });

  div.innerHTML = html;
}


// =======================
// BRACKET
// =======================
function renderBracket(matches){

  const div = document.getElementById("bracket");

  const order = ["last16","quarter","semi","final"];

  let rounds = {};
  order.forEach(r => rounds[r] = []);

  matches.forEach(m => {
    const r = m.fields.Round;
    if(rounds[r]) rounds[r].push(m);
  });

  let html = "";

  order.forEach(r => {

    if(rounds[r].length === 0) return;

    html += `<div class="round"><b>${label(r)}</b>`;

    rounds[r].forEach(m => {
      const f = m.fields;

      html += `
        <div class="match">
          <div class="${f.Winner === f.Player1 ? "winner" : ""}">
            ${f.Player1 || "-"}
          </div>
          <div class="${f.Winner === f.Player2 ? "winner" : ""}">
            ${f.Player2 || "-"}
          </div>
        </div>
      `;
    });

    html += "</div>";
  });

  div.innerHTML = html;
}


function label(r){
  if(r==="last16") return "Achtelfinale";
  if(r==="quarter") return "Viertelfinale";
  if(r==="semi") return "Halbfinale";
  if(r==="final") return "Finale";
  return r;
}
