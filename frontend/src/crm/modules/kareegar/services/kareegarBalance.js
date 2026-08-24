// frontend/src/crm/modules/kareegar/services/kareegarBalance.js

import {
  getKareegarAssignments,
  getKareegarReturns,
} from "./kareegarTransactions";

import {
  calculateB2CBalance,
} from "../calculations/engine";


export async function getB2JBalance(
  employeeId
) {
  const assignments =
    await getKareegarAssignments({
      employeeId,
      type: "B2J",
      limit: 500,
    });

  const returns =
    await getKareegarReturns({
      employeeId,
      limit: 500,
    });

  const totalAssigned =
    assignments.reduce(
      (total, assignment) =>
        total +
        Number(
          assignment.effectiveGoldAssigned || 0
        ),
      0
    );

  const totalReturned =
    returns
      .filter(
        (item) => item.type === "B2J"
      )
      .reduce(
        (total, returnItem) =>
          total +
          Number(
            returnItem.effectiveGoldReturned || 0
          ),
        0
      );

  const balance =
    calculateB2CBalance({
      previousBalance: 0,
      effectiveGoldAssigned:
        totalAssigned,
      effectiveGoldReturned:
        totalReturned,
    });

  return {
    employeeId,

    totalAssigned,

    totalReturned,

    balance,
  };
}


export async function getB2JBalances() {
  const assignments =
    await getKareegarAssignments({
      type: "B2J",
      limit: 500,
    });

  const returns =
    await getKareegarReturns({
      limit: 500,
    });

  const employeeIds =
    new Set();

  assignments.forEach(
    (assignment) => {
      if (assignment.employeeId) {
        employeeIds.add(
          assignment.employeeId
        );
      }
    }
  );

  returns
    .filter(
      (item) => item.type === "B2J"
    )
    .forEach(
      (returnItem) => {
        if (returnItem.employeeId) {
          employeeIds.add(
            returnItem.employeeId
          );
        }
      }
    );

  const balances = [];

  for (const employeeId of employeeIds) {
    const employeeAssignments =
      assignments.filter(
        (item) =>
          item.employeeId ===
          employeeId
      );

    const employeeReturns =
      returns.filter(
        (item) =>
          item.type === "B2J" &&
          item.employeeId ===
            employeeId
      );

    const totalAssigned =
      employeeAssignments.reduce(
        (total, item) =>
          total +
          Number(
            item.effectiveGoldAssigned ||
              0
          ),
        0
      );

    const totalReturned =
      employeeReturns.reduce(
        (total, item) =>
          total +
          Number(
            item.effectiveGoldReturned ||
              0
          ),
        0
      );

    const balance =
      calculateB2CBalance({
        previousBalance: 0,
        effectiveGoldAssigned:
          totalAssigned,
        effectiveGoldReturned:
          totalReturned,
      });

    balances.push({
      employeeId,
      totalAssigned,
      totalReturned,
      balance,
    });
  }

  return balances;
}