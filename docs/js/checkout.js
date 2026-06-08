const checkoutTable = {
  170: ["T20 T20 Bull"],
  167: ["T20 T19 Bull"],
  160: ["T20 T20 D20"],
  100: ["T20 D20"],
  80: ["T20 D10"],
  60: ["20 D20"],
  40: ["D20"],
  32: ["D16"],
  24: ["D12"]
};

function getCheckoutSuggestions(score) {
  return checkoutTable[score] || [];
}

function showCheckout(score) {
  const list = getCheckoutSuggestions(score);
  const el = document.getElementById("checkout");
  if (!el) return;
  el.innerHTML = list.join("<br>");
}