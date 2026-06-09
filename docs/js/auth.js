const msalConfig = {
  auth: {
    clientId: "f52a25f2-e683-4bea-ae0f-6206e05a9b60",
    authority: "https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// ✅ zentrale init
let initPromise = null;

function initAuth() {
  if (!initPromise) {
    initPromise = msalInstance.handleRedirectPromise();
  }
  return initPromise;
}


// ✅ Login NUR auf index gedacht
async function login() {
  await initAuth();

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    await msalInstance.loginRedirect({
      scopes: ["User.Read", "Sites.ReadWrite.All"]
    });
  }
}


// ✅ NUR prüfen, KEIN redirect-spam
async function ensureLogin() {

  await initAuth();

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    console.log("Nicht eingeloggt → zurück zur Startseite");

    // 👉 nur wenn wir NICHT schon auf index sind!
    if (!window.location.pathname.endsWith("/darts-app/")) {
      window.location.href = "/darts-app/";
    }

    return false;
  }

  return true;
}


// ✅ Token holen (immer benutzen!)
async function getToken() {

  await initAuth();

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    return null;
  }

  const result = await msalInstance.acquireTokenSilent({
    scopes: ["User.Read", "Sites.ReadWrite.All"],
    account: accounts[0]
  });

  return result.accessToken;
}
