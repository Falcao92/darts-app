async function submitDarts() {
  const id = document.getElementById("matchId").value;

  const d1 = parseDart(document.getElementById("dart1").value);
  const d2 = parseDart(document.getElementById("dart2").value);
  const d3 = parseDart(document.getElementById("dart3").value);

  const total = d1 + d2 + d3;

  const matches = await getMatches();
  const match = matches.find(m => m.id == id);
  if (!match) return;

  let score = match.fields.Score1;
  let newScore = score - total;

  if (newScore < 0 || newScore === 1) return;

  await updateMatch(id, newScore, match.fields.Score2);

  updateCheckout(newScore);
}

function updateCheckout(score) {
  const list = getCheckoutSuggestions(score);
  document.getElementById("checkout").innerHTML =
    list.map(x => `<p>${x}</p>`).join("");
}