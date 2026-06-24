import { Configuration, LogLevel } from "@azure/msal-browser";

export enum AppRoles {
  Admin = "Admin",
  Trainer = "Trainer",
  Student = "Student",
}

const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "";
const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || "";
const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000";

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          default:
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
  prompt: "select_account",
};

export const apiScopes = {
  scopes: ["openid", "profile", "email"],
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.training.sneakertail.online";
