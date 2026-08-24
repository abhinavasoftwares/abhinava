// frontend/src/crm/modules/kareegar/services/calculationConfig.js

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  getCrmFirestore,
} from "../../../firebase";

import {
  resolveKareegarCalculationConfig,
} from "../calculations/config";

import {
  validateKareegarCalculationConfig,
} from "../calculations/validation";

const CALCULATION_CONFIG_PATH = [
  "kareegar",
  "calculationConfig",
];

function getCalculationConfigRef() {
  const firestore = getCrmFirestore();

  return doc(
    firestore,
    ...CALCULATION_CONFIG_PATH
  );
}

/**
 * Load tenant calculation configuration.
 *
 * If the tenant has no override configuration,
 * Keshava defaults are returned.
 */
export async function loadKareegarCalculationConfig() {
  const configRef =
    getCalculationConfigRef();

  const snapshot = await getDoc(configRef);

  if (!snapshot.exists()) {
    return resolveKareegarCalculationConfig();
  }

  const tenantConfig = snapshot.data();

  return resolveKareegarCalculationConfig(
    tenantConfig
  );
}

/**
 * Save tenant-specific calculation overrides.
 */
export async function saveKareegarCalculationConfig(
  tenantConfig
) {
  const validation =
    validateKareegarCalculationConfig(
      tenantConfig
    );

  if (!validation.valid) {
    throw new Error(
      validation.errors.join("\n")
    );
  }

  const configRef =
    getCalculationConfigRef();

  await setDoc(
    configRef,
    {
      ...tenantConfig,
      updatedAt: new Date().toISOString(),
    },
    {
      merge: true,
    }
  );

  return loadKareegarCalculationConfig();
}