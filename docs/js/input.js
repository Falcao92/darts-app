async function switchTurn(id, next) {
  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${id}/fields`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Turn: next
      })
    }
  );

  console.log("🔁 Spieler gewechselt:", next);
}

async function ensureLogin() {
  if (!accessToken) {
    await login();
  }
}

async function submitDarts() {

  await ensureLogin(); // 🔥 wichtig!

  const id = document.getElementById("matchId").value;

  const d1 = parseDart(document.getElementById("dart1").value);
  const d2 = parseDart(document.getElementById("dart2").value);
  const d3 = parseDart(document.getElementById("dart3").value);

  const total = d1 + d2 + d3;

  const matches = await getMatches();

  if (!matches) {
    console.log("Keine Matches geladen");
    return;
  }

  const match = matches.find(m => m.id == id);

  if (!match) {
    alert("Match nicht gefunden");
    return;
  }

const fields = match.fields;
let newScore1 = fields.Score1;
let newScore2 = fields.Score2;

// 🎯 prüfen wer dran ist
if (fields.Turn === "p1") {

  let newScore = fields.Score1 - total;

  if (newScore < 0 || newScore === 1) {
    switchTurn(id, "p2");
    return;
  }

  newScore1 = newScore;
  updateCheckout(newScore);

  await updateMatch(id, newScore1, fields.Score2);

  await switchTurn(id, "p2");

} else {

  let newScore = fields.Score2 - total;

  if (newScore < 0 || newScore === 1) {
    switchTurn(id, "p1");
    return;
  }

  newScore2 = newScore;
  updateCheckout(newScore);

  await updateMatch(id, fields.Score1, newScore2);

  await switchTurn(id, "p1");
}

  updateCheckout(newScore);
}

function updateCheckout(score) {
  const list = getCheckoutSuggestions(score);
  document.getElementById("checkout").innerHTML =
    list.map(x => `<p>${x}</p>`).join("");
}
