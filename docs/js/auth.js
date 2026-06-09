const msalConfig = {
  auth: {
    clientId: "f52a25f2-e683-4bea-ae0f-6206e05a9b60",
    authority: "https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let accessToken = null;
let initialized = false;


// ✅ INIT läuft genau einmal
async function initAuth() {

  if (initialized) return;

  const result = await msalInstance.handleRedirectPromise();

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length > 0) {
    try {
      const token = await msalInstance.acquireTokenSilent({
        scopes: ["User.Read", "Sites.ReadWrite.All"],
        account: accounts[0]
      });

      accessToken = token.accessToken;

    } catch (e) {
      console.log("Silent Token fehlgeschlagen");
    }
  }

  initialized = true;
}


// ✅ KEIN redirect mehr wenn schon eingeloggt
async function ensureLogin() {

  await initAuth();

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length > 0) {
    return; // ✅ fertig → KEIN redirect
  }

  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}
