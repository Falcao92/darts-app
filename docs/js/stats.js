function calculateStats(matches, player){

  let games = 0;
  let wins = 0;
  let legsWon = 0;
  let legsLost = 0;
  let darts = 0;
  let scored = 0;
  let checkouts = 0;
  let checkoutAttempts = 0;

  matches.forEach(m => {

    const f = m.fields;
    if(!f || f.Status !== "finished") return;

    if(f.Player1 !== player && f.Player2 !== player) return;

    games++;

    const isP1 = f.Player1 === player;

    const playerScore = isP1 ? f.Score1 : f.Score2;
    const opponentScore = isP1 ? f.Score2 : f.Score1;

    const playerLegs = isP1 ? f.Legs1 : f.Legs2;
    const opponentLegs = isP1 ? f.Legs2 : f.Legs1;

    legsWon += playerLegs;
    legsLost += opponentLegs;

    if(f.Winner === player){
      wins++;
      checkouts++; // ✅ gewonnenes Spiel = Checkout
    }

    checkoutAttempts += playerLegs + opponentLegs;

    darts += f.DartsThrown || 0;

    scored += (501 - playerScore);
  });

  const avg = darts > 0 ? ((scored / darts) * 3).toFixed(2) : 0;
  const winrate = games > 0 ? ((wins / games) * 100).toFixed(1) : 0;
  const checkoutRate = checkoutAttempts > 0
    ? ((checkouts / checkoutAttempts) * 100).toFixed(1)
    : 0;

  return {
    games,
    wins,
    losses: games - wins,
    winrate,
    legsWon,
    legsLost,
    avg,
    checkoutRate,
    total180: 0 // später optional
  };
}
