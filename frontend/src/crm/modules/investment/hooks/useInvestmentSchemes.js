import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  getCrmFirestore,
  getCrmFirebaseAuth,
} from "../../../firebase";

const COLLECTION = "investmentSchemes";

const DEFAULT_PERMISSIONS = {
  read: false,
  write: false,
  delete: false,
};

export function useInvestmentSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [permissions, setPermissions] = useState(
    DEFAULT_PERMISSIONS
  );

  useEffect(() => {
    let unsubscribeSchemes = null;

    async function loadAndListen() {
      try {
        setLoading(true);
        setError("");

        // ========================================================
        // TENANT FIREBASE
        // ========================================================

        const firestore = getCrmFirestore();

        const firebaseAuth = getCrmFirebaseAuth();

        const firebaseUser = firebaseAuth.currentUser;

        console.group(
          "========== INVESTMENT SCHEME AUTH DEBUG =========="
        );

        console.log(
          "Firebase Project:",
          firestore?.app?.options?.projectId
        );

        console.log(
          "Firebase Auth UID:",
          firebaseUser?.uid
        );

        console.log(
          "Firebase Auth Email:",
          firebaseUser?.email
        );

        if (!firebaseUser) {
          throw new Error(
            "No CRM Firebase authenticated user found. Please sign in again."
          );
        }

        // ========================================================
        // STEP 1
        // USERS/{UID}
        // ========================================================

        const userReference = doc(
          firestore,
          "users",
          firebaseUser.uid
        );

        const userSnapshot = await getDoc(
          userReference
        );

        console.log(
          "users/{uid} exists:",
          userSnapshot.exists()
        );

        if (!userSnapshot.exists()) {
          throw new Error(
            "Authorization document users/{uid} does not exist."
          );
        }

        const userData = userSnapshot.data();

        console.log(
          "users/{uid}:",
          userData
        );

        console.log(
          "User status:",
          userData.status
        );

        console.log(
          "User role:",
          userData.role
        );

        console.log(
          "User employeeId:",
          userData.employeeId
        );

        console.log(
          "User investorId:",
          userData.investorId
        );

        // ========================================================
        // STEP 2
        // ACTIVE USER
        // ========================================================

        if (userData.status !== "ACTIVE") {
          throw new Error(
            `User is not ACTIVE. Current status: ${userData.status}`
          );
        }

        // ========================================================
        // STEP 3
        // ADMIN CHECK
        // ========================================================

        const isAdmin =
          userData.role === "ADMIN_OWNER";

        console.log(
          "Is ADMIN_OWNER:",
          isAdmin
        );

        // ========================================================
        // ADMIN
        //
        // ADMIN_OWNER has full investment permissions.
        // ========================================================

        if (isAdmin) {
          setPermissions({
            read: true,
            write: true,
            delete: true,
          });
        }

        // ========================================================
        // STEP 4
        // EMPLOYEE LINKAGE
        // ========================================================

        if (!isAdmin) {
          if (!userData.employeeId) {
            throw new Error(
              "users/{uid}.employeeId is missing."
            );
          }

          const employeeReference = doc(
            firestore,
            "employees",
            userData.employeeId
          );

          const employeeSnapshot =
            await getDoc(employeeReference);

          console.log(
            "employees/{employeeId} exists:",
            employeeSnapshot.exists()
          );

          if (!employeeSnapshot.exists()) {
            throw new Error(
              `Employee document does not exist: ${userData.employeeId}`
            );
          }

          const employeeData =
            employeeSnapshot.data();

          console.log(
            "employees/{employeeId}:",
            employeeData
          );

          console.log(
            "Employee status:",
            employeeData.status
          );

          console.log(
            "Employee UID:",
            employeeData.uid
          );

          console.log(
            "Employee role:",
            employeeData.role
          );

          console.log(
            "Employee permissions:",
            employeeData.permissions
          );

          console.log(
            "Investment permissions:",
            employeeData.permissions?.investments
          );

          // ======================================================
          // EMPLOYEE STATUS
          // ======================================================

          if (employeeData.status !== "ACTIVE") {
            throw new Error(
              `Employee is not ACTIVE. Current status: ${employeeData.status}`
            );
          }

          // ======================================================
          // INVESTMENT PERMISSION
          // ======================================================

          const investmentPermission =
            employeeData.permissions?.investments;

          if (!investmentPermission) {
            throw new Error(
              "Employee does not have an investments permission object."
            );
          }

          const resolvedPermissions = {
            read:
              investmentPermission.read === true,

            write:
              investmentPermission.write === true,

            delete:
              investmentPermission.delete === true,
          };

          console.log(
            "Resolved investment permissions:",
            resolvedPermissions
          );

          // ------------------------------------------------------
          // READ IS REQUIRED TO LOAD THE MODULE
          // ------------------------------------------------------

          if (!resolvedPermissions.read) {
            throw new Error(
              "Employee does not have investments.read permission."
            );
          }

          // ------------------------------------------------------
          // SAVE FULL PERMISSION STATE
          // ------------------------------------------------------

          setPermissions(
            resolvedPermissions
          );
        }

        // ========================================================
        // AUTHORIZATION PASSED
        // ========================================================

        console.log(
          "Final investment permissions:",
          isAdmin
            ? {
                read: true,
                write: true,
                delete: true,
              }
            : "Loaded from employee permissions"
        );

        console.log(
          "Authorization checks passed."
        );

        console.log(
          "Starting investmentSchemes listener..."
        );

        console.groupEnd();

        // ========================================================
        // INVESTMENT SCHEMES QUERY
        // ========================================================

        const reference = query(
          collection(
            firestore,
            COLLECTION
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        );

        unsubscribeSchemes = onSnapshot(
          reference,

          (snapshot) => {
            console.log(
              "Investment schemes loaded:",
              snapshot.size
            );

            setSchemes(
              snapshot.docs.map(
                (item) => ({
                  id: item.id,
                  ...item.data(),
                })
              )
            );

            setLoading(false);
            setError("");
          },

          (snapshotError) => {
            console.error(
              "Investment scheme listener error:",
              snapshotError
            );

            setError(
              snapshotError.message ||
                "Failed to load investment schemes."
            );

            setLoading(false);
          }
        );
      } catch (authError) {
        console.error(
          "Investment scheme authorization error:",
          authError
        );

        setError(
          authError.message ||
            "Investment authorization failed."
        );

        setLoading(false);
      }
    }

    loadAndListen();

    return () => {
      if (unsubscribeSchemes) {
        unsubscribeSchemes();
      }
    };
  }, []);

  return {
    schemes,
    loading,
    error,

    // Full permission object
    permissions,

    // Convenient permission flags
    canRead: permissions.read,
    canWrite: permissions.write,
    canDelete: permissions.delete,
  };
}