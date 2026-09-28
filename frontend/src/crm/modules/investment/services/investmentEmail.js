import { getCrmFirebaseAuth } from "../../../firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function clean(value) {
  return String(value ?? "").trim();
}

function requireConfig(crmSlug) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  if (!crmSlug) {
    throw new Error("CRM tenant slug is not available.");
  }
}

async function getFirebaseIdToken() {
  const auth = getCrmFirebaseAuth();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("CRM authentication is required to send communications.");
  }

  return user.getIdToken();
}

/**
 * Send the investment account-opening/welcome email.
 *
 * Resend is called only by the Abhinava backend. The Resend API key
 * is never exposed to the browser.
 */
export async function sendInvestmentAccountOpeningEmail({
  crmSlug,
  recipientEmail,
  investorName = "",
  accountNumber = "",
  schemeName = "",
  contributionValue = 0,
  startDate = "",
  language = "EN",
  clientName = "",
  clientLogoUrl = "",
  clientPhone = "",
  clientEmail = "",
  clientWebsite = "",
  hasInitialTransaction = false,
  transactionAmount = null,
  receiptNumber = "",
  loginUrl = "",
  attachments = [],
} = {}) {
  const normalizedEmail = clean(recipientEmail).toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Investor email address is required.");
  }

  requireConfig(crmSlug);

  const idToken = await getFirebaseIdToken();

  const response = await fetch(
    `${API_BASE_URL}/crm/${encodeURIComponent(
      crmSlug
    )}/investment/send-welcome-email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        recipientEmail: normalizedEmail,
        investorName: clean(investorName),
        accountNumber: clean(accountNumber),
        schemeName: clean(schemeName),
        contributionValue,
        startDate: clean(startDate),
        language: clean(language).toUpperCase() || "EN",
        clientName: clean(clientName),
        clientLogoUrl: clean(clientLogoUrl),
        clientPhone: clean(clientPhone),
        clientEmail: clean(clientEmail),
        clientWebsite: clean(clientWebsite),
        hasInitialTransaction: Boolean(hasInitialTransaction),
        transactionAmount,
        receiptNumber: clean(receiptNumber),
        loginUrl: clean(loginUrl),
        attachments: Array.isArray(attachments)
          ? attachments
          : [],
      }),
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.message ||
          data?.message ||
          "Unable to send investment welcome email.";

    throw new Error(detail);
  }

  if (data?.success === false) {
    throw new Error(
      data?.message ||
        data?.detail ||
        "Investment welcome email was not sent."
    );
  }

  return data;
}

/**
 * Reserved for the manual Communications panel.
 * The provider endpoint will be added when statement templates are enabled.
 */
export async function sendInvestmentStatement() {
  throw new Error(
    "Investment statement email delivery is not enabled yet."
  );
}

/**
 * Reserved for the manual Communications panel.
 * WhatsApp delivery will use the Meta Cloud API integration.
 */
export async function sendInvestmentWhatsApp() {
  throw new Error(
    "Investment WhatsApp delivery is not enabled yet."
  );
}
