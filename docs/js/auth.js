const msalConfig = {
  auth: {
    clientId: "f52a25f2-e683-4bea-ae0f-6206e05a9b60",
    authority: "https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let accessToken = null;


// ✅ WICHTIG: warten bis Redirect fertig ist
let msalReady = msalInstance.handleRedirectPromise().then(async (result) => {

  if (result && result.account) {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ["User.Read", "Sites.ReadWrite.All"],
      account: result.account
    });

    accessToken = tokenResponse.accessToken;
  }
});


async function ensureLogin() {

  // 🔥 WARTEN bis Redirect komplett fertig ist!
  await msalReady;

  const accounts = msalInstance.getAllAccounts();

  // ✅ wenn eingeloggt → KEIN Redirect
  if (accounts.length > 0) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: ["User.Read", "Sites.ReadWrite.All"],
        account: accounts[0]
      });

      accessToken = result.accessToken;
      return;

    } catch (e) {
      console.log("Silent Token fehlgeschlagen");
    }
  }

  // ❌ nur wenn WIRKLICH nötig → redirect
  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}
