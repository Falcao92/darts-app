const msalConfig = {
  auth: {
    clientId: "f52a25f2-e683-4bea-ae0f-6206e05a9b60",
    authority: "https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let accessToken = null;

async function login() {

  // 👉 prüfen ob bereits eingeloggt
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length > 0) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: ["User.Read", "Sites.ReadWrite.All"],
        account: accounts[0]
      });

      accessToken = result.accessToken;
      console.log("✅ Token geladen");
      return accessToken;

    } catch (e) {
      console.log("Silent Token fehlgeschlagen → redirect");
    }
  }

  // 👉 Login starten wenn kein Token
  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}

// 👉 sehr wichtig für redirect login
msalInstance.handleRedirectPromise().then(async (result) => {
  if (result && result.account) {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ["User.Read", "Sites.ReadWrite.All"],
      account: result.account
    });

    accessToken = tokenResponse.accessToken;
    console.log("✅ Token nach Redirect");
  }
});
``
