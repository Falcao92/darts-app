const msalConfig = {
  auth: {
    clientId: "f52a25f2-e683-4bea-ae0f-6206e05a9b60",
    authority: "https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let accessToken = null;
let msalInitialized = false;


// ✅ WICHTIG: EINMAL initialisieren
async function initAuth() {
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
      console.log("Token konnte nicht geladen werden");
    }
  }

  msalInitialized = true;
}


// ✅ LOGIN NUR WENN NÖTIG
async function ensureLogin() {

  if (!msalInitialized) {
    await initAuth();
  }

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length > 0) {
    return;
  }

  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}
