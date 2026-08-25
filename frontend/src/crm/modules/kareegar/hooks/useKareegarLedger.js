import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { getCrmFirestore } from "../../../firebase";

const B2B_KAREEGARS_COLLECTION =
  "b2bKareegars";

const B2J_KAREEGARS_COLLECTION =
  "b2jKareegars";

const ASSIGNMENTS_COLLECTION =
  "kareegarAssignments";

const RETURNS_COLLECTION =
  "kareegarReturns";


// ============================================================
// GENERIC COLLECTION LISTENER
// ============================================================

function subscribeToCollection(
  collectionName,
  onData,
  onError,
  transform
) {
  const db = getCrmFirestore();

  const reference = query(
    collection(db, collectionName),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    reference,
    (snapshot) => {
      const data = snapshot.docs.map(
        (item) => {
          const document = {
            id: item.id,
            ...item.data(),
          };

          return transform
            ? transform(document)
            : document;
        }
      );

      onData(data);
    },
    onError
  );
}


// ============================================================
// CALCULATE EMPLOYEE BALANCE
// ============================================================

function calculateEmployeeBalance(
  employee,
  assignments,
  returns
) {
  const employeeAssignments =
    assignments.filter(
      (item) =>
        item.employeeId === employee.id
    );

  const employeeReturns =
    returns.filter(
      (item) =>
        item.employeeId === employee.id
    );

  let totalAssigned = 0;
  let totalReturned = 0;


  // ==========================================================
  // B2B
  // ==========================================================

  if (employee.type === "B2B") {
    totalAssigned =
      employeeAssignments.reduce(
        (total, item) =>
          total +
          Number(
            item.rawMaterialWeight || 0
          ),
        0
      );

    totalReturned =
      employeeReturns.reduce(
        (total, item) =>
          total +
          Number(
            item.returnedWeight || 0
          ) +
          Number(
            item.wastage || 0
          ),
        0
      );
  }


  // ==========================================================
  // B2J
  // ==========================================================

  else {
    totalAssigned =
      employeeAssignments.reduce(
        (total, item) =>
          total +
          Number(
            item.effectiveGoldAssigned || 0
          ),
        0
      );

    totalReturned =
      employeeReturns.reduce(
        (total, item) =>
          total +
          Number(
            item.effectiveGoldReturned || 0
          ),
        0
      );
  }


  const balance =
    totalAssigned -
    totalReturned;


  return {
    ...employee,

    totalAssigned,

    totalReturned,

    balance,

    assignmentCount:
      employeeAssignments.length,

    returnCount:
      employeeReturns.length,

    assignments:
      employeeAssignments,

    returns:
      employeeReturns,

    status:
      balance > 0.001
        ? "OUTSTANDING"
        : balance < -0.001
        ? "EXCESS RETURN"
        : "BALANCED",
  };
}


// ============================================================
// MAIN HOOK
// ============================================================

export function useKareegarLedger() {
  const [employees, setEmployees] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [returns, setReturns] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    let b2bLoaded = false;
    let b2jLoaded = false;
    let assignmentsLoaded = false;
    let returnsLoaded = false;


    const checkLoaded = () => {
      if (
        b2bLoaded &&
        b2jLoaded &&
        assignmentsLoaded &&
        returnsLoaded
      ) {
        setLoading(false);
      }
    };


    const handleError = (error) => {
      console.error(
        "Kareegar Ledger listener error:",
        error
      );

      setError(
        error.message ||
          "Failed to load Kareegar ledger."
      );

      setLoading(false);
    };


    // ========================================================
    // B2B KAREEGARS
    // ========================================================

    const unsubscribeB2B =
      subscribeToCollection(
        B2B_KAREEGARS_COLLECTION,
        (data) => {
          setEmployees((current) => {
            const b2jEmployees =
              current.filter(
                (item) =>
                  item.type !== "B2B"
              );

            return [
              ...data,
              ...b2jEmployees,
            ];
          });

          b2bLoaded = true;

          checkLoaded();
        },
        handleError,
        (employee) => ({
          ...employee,
          type: "B2B",
        })
      );


    // ========================================================
    // B2J KAREEGARS
    // ========================================================

    const unsubscribeB2J =
      subscribeToCollection(
        B2J_KAREEGARS_COLLECTION,
        (data) => {
          setEmployees((current) => {
            const b2bEmployees =
              current.filter(
                (item) =>
                  item.type !== "B2J"
              );

            return [
              ...b2bEmployees,
              ...data,
            ];
          });

          b2jLoaded = true;

          checkLoaded();
        },
        handleError,
        (employee) => ({
          ...employee,
          type: "B2J",
        })
      );


    // ========================================================
    // ASSIGNMENTS
    // ========================================================

    const unsubscribeAssignments =
      subscribeToCollection(
        ASSIGNMENTS_COLLECTION,
        (data) => {
          setAssignments(data);

          assignmentsLoaded = true;

          checkLoaded();
        },
        handleError
      );


    // ========================================================
    // RETURNS
    // ========================================================

    const unsubscribeReturns =
      subscribeToCollection(
        RETURNS_COLLECTION,
        (data) => {
          setReturns(data);

          returnsLoaded = true;

          checkLoaded();
        },
        handleError
      );


    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {
      unsubscribeB2B();
      unsubscribeB2J();
      unsubscribeAssignments();
      unsubscribeReturns();
    };
  }, []);


  // ==========================================================
  // LEDGER
  // ==========================================================

  const ledger = useMemo(
    () =>
      employees.map((employee) =>
        calculateEmployeeBalance(
          employee,
          assignments,
          returns
        )
      ),
    [
      employees,
      assignments,
      returns,
    ]
  );


  // ==========================================================
  // TOTALS
  // ==========================================================

  const totals = useMemo(() => {
    return ledger.reduce(
      (result, employee) => {
        result.assigned +=
          employee.totalAssigned;

        result.returned +=
          employee.totalReturned;

        result.balance +=
          employee.balance;

        result.assignments +=
          employee.assignmentCount;

        result.returns +=
          employee.returnCount;

        return result;
      },
      {
        assigned: 0,
        returned: 0,
        balance: 0,
        assignments: 0,
        returns: 0,
      }
    );
  }, [ledger]);


  return {
    employees,

    assignments,

    returns,

    ledger,

    totals,

    loading,

    error,
  };
}