"use client";

import { useMsal } from "@azure/msal-react";
import { useMemo } from "react";
import { AppRoles } from "@/lib/msal-config";

interface AuthUser {
  name: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  isTrainer: boolean;
  isStudent: boolean;
  isAuthenticated: boolean;
  userId: string;
}

interface IdTokenClaims {
  roles?: string[];
  oid?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
}

export function useAuth(): AuthUser {
  const { accounts } = useMsal();

  return useMemo(() => {
    // 1. Check local session storage first (for local credentials/invites)
    if (typeof window !== "undefined") {
      const localUserStr = localStorage.getItem("ctmp_user");
      const localToken = localStorage.getItem("ctmp_token");
      if (localUserStr && localToken) {
        try {
          const localUser = JSON.parse(localUserStr);
          const roles = localUser.roles || [];
          return {
            name: localUser.name || "User",
            email: localUser.email || "",
            roles,
            isAdmin: roles.includes("Admin"),
            isTrainer: roles.includes("Trainer"),
            isStudent: roles.includes("Student"),
            isAuthenticated: true,
            userId: localUser.sub || localUser.id || "",
          };
        } catch (e) {
          console.error("Failed to parse local user session", e);
        }
      }
    }

    // 2. Fallback to MSAL (Single Sign-On)
    if (accounts.length === 0) {
      return {
        name: "",
        email: "",
        roles: [],
        isAdmin: false,
        isTrainer: false,
        isStudent: false,
        isAuthenticated: false,
        userId: "",
      };
    }

    const account = accounts[0];
    const claims = (account.idTokenClaims || {}) as IdTokenClaims & { groups?: string[] };
    const rawRoles = claims.roles || [];
    const groups = claims.groups || [];

    const adminGroupId = process.env.NEXT_PUBLIC_AZURE_AD_ADMIN_GROUP_ID || "";
    const trainerGroupId = process.env.NEXT_PUBLIC_AZURE_AD_TRAINER_GROUP_ID || "";
    const studentGroupId = process.env.NEXT_PUBLIC_AZURE_AD_STUDENT_GROUP_ID || "";

    let isUserAdmin = rawRoles.includes(AppRoles.Admin);
    let isUserTrainer = rawRoles.includes(AppRoles.Trainer);
    let isUserStudent = rawRoles.includes(AppRoles.Student);

    if (adminGroupId && groups.includes(adminGroupId)) {
      isUserAdmin = true;
      isUserTrainer = false;
      isUserStudent = false;
    } else if (trainerGroupId && groups.includes(trainerGroupId)) {
      isUserTrainer = true;
      isUserAdmin = false;
      isUserStudent = false;
    } else if (studentGroupId && groups.includes(studentGroupId)) {
      isUserStudent = true;
      isUserAdmin = false;
      isUserTrainer = false;
    }

    // Default fallback if nothing matches
    if (!isUserAdmin && !isUserTrainer && !isUserStudent) {
      isUserStudent = true;
    }

    const resolvedRoles: string[] = [];
    if (isUserAdmin) {
      resolvedRoles.push("Admin");
    }
    if (isUserTrainer) {
      resolvedRoles.push("Trainer");
    }
    if (isUserStudent) {
      resolvedRoles.push("Student");
    }

    return {
      name: account.name || claims.name || "User",
      email: account.username || claims.preferred_username || claims.email || "",
      roles: resolvedRoles,
      isAdmin: isUserAdmin,
      isTrainer: isUserTrainer && !isUserAdmin,
      isStudent: isUserStudent && !isUserAdmin && !isUserTrainer,
      isAuthenticated: true,
      userId: claims.oid || account.localAccountId || "",
    };
  }, [accounts]);
}
