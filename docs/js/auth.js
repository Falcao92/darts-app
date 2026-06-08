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
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length > 0) {
    // ✅ Token direkt holen (wichtig!)
    const result = await msalInstance.acquireTokenSilent({
      scopes: ["User.Read", "Sites.ReadWrite.All"],
      account: accounts[0]
    });

    accessToken = result.accessToken;
    return;
  }

  // 👉 wenn noch nicht eingeloggt
  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}

// ✅ wichtig für Redirect Login
msalInstance.handleRedirectPromise().then(result => {
  if (result && result.accessToken) {
    accessToken = result.accessToken;
  }
});
