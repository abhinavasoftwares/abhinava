import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getCrmFirebaseAuth, getCrmFirestore } from "../../../firebase";

const COLLECTION = "investmentAuditLogs";

function actor() {
  let auth = null;
  try { auth = getCrmFirebaseAuth(); } catch {}
  const user = auth?.currentUser;
  return {
    uid: user?.uid || null,
    email: user?.email || null,
    name: user?.displayName || null,
  };
}

export async function createInvestmentAuditLog({
  action,
  entityType,
  entityId = null,
  description = "",
  metadata = {},
}) {
  if (!action) throw new Error("Audit action is required.");

  const db = getCrmFirestore();
  const a = actor();

  const ref = await addDoc(collection(db, COLLECTION), {
    action: String(action).toUpperCase(),
    entityType: entityType || null,
    entityId: entityId || null,
    description: description || "",
    metadata: metadata || {},
    actorUid: a.uid,
    actorEmail: a.email,
    actorName: a.name,
    createdAt: serverTimestamp(),
  });

  return { id: ref.id };
}
