const msalConfig = {
  auth: {
    clientId: "DEINE_CLIENT_ID",
    authority: "https://login.microsoftonline.com/DEIN_TENANT_ID",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let accessToken = null;


// ✅ zentrale Funktion → immer verwenden
async function ensureLogin() {

  const accounts = msalInstance.getAllAccounts();

  // ✅ FALL 1: Nutzer ist schon eingeloggt
  if (accounts.length > 0) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: ["User.Read", "Sites.ReadWrite.All"],
        account: accounts[0]
      });

      accessToken = result.accessToken;
      return;

    } catch (e) {
      console.log("Silent Token fehlgeschlagen → Redirect notwendig");
    }
  }

  // ✅ FALL 2: NICHT eingeloggt → redirect (nur einmal!)
  sessionStorage.setItem("redirectAfterLogin", window.location.href);

  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}


// ✅ wird NACH Login ausgeführt
msalInstance.handleRedirectPromise().then(async (result) => {

  if (result && result.account) {

    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ["User.Read", "Sites.ReadWrite.All"],
      account: result.account
    });

    accessToken = tokenResponse.accessToken;

    const redirectUrl = sessionStorage.getItem("redirectAfterLogin");

    if (redirectUrl) {
      sessionStorage.removeItem("redirectAfterLogin");

      if (window.location.href !== redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  }
});
