import React, { useMemo, useState } from "react";
import { Mail, MessageCircle, X, Send, FileText, Loader2 } from "lucide-react";
import { sendInvestmentAccountOpeningEmail, sendInvestmentStatement, sendInvestmentWhatsApp } from "../services/investmentEmail";

export default function InvestmentCommunicationModal({ investor, accounts = [], onClose, onComplete }) {
  const [channel, setChannel] = useState("EMAIL");
  const [type, setType] = useState("ACCOUNT_OPENING");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const account = useMemo(
    () => accounts.find((item) => item.id === accountId) || accounts[0] || null,
    [accounts, accountId]
  );

  const language = investor?.emailPreferences?.language || "EN";
  const recipientEmail = investor?.email || "";
  const phone = investor?.mobileNumber || "";

  async function handleSend() {
    try {
      setSending(true);
      setError("");

      if (!account) throw new Error("Select an investment account.");

      if (channel === "EMAIL") {
        if (!recipientEmail) throw new Error("This investor does not have an email address.");
        if (type === "ACCOUNT_OPENING") {
          await sendInvestmentAccountOpeningEmail({
            investorId: investor.id,
            recipientEmail,
            language,
            investorName: investor.fullName,
            accountNumber: account.accountNumber,
            schemeName: account.schemeSnapshot?.schemeName || account.schemeName || "",
            contributionValue: account.contribution?.value || account.contributionValue || 0,
            contributionUnit: account.contribution?.unit || "",
            startDate: account.startDate || "",
            receiptNumber: account.receiptNumber || "",
          });
        } else {
          if (!fromDate || !toDate) throw new Error("Select the statement date range.");
          if (fromDate > toDate) throw new Error("From date cannot be after To date.");
          await sendInvestmentStatement({
            investorId: investor.id,
            recipientEmail,
            language,
            investorName: investor.fullName,
            accountNumber: account.accountNumber,
            schemeName: account.schemeSnapshot?.schemeName || account.schemeName || "",
            fromDate,
            toDate,
          });
        }
      } else {
        if (!phone) throw new Error("This investor does not have a mobile number.");
        if (type === "STATEMENT") {
          throw new Error("WhatsApp statement delivery requires a configured Meta template before it can be enabled.");
        }
        await sendInvestmentWhatsApp({
          investorId: investor.id,
          phoneNumber: phone,
          language,
          investorName: investor.fullName,
          accountNumber: account.accountNumber,
          template: "ACCOUNT_OPENING",
          parameters: [
            investor.fullName || "",
            account.accountNumber || "",
            account.schemeSnapshot?.schemeName || account.schemeName || "",
          ],
        });
      }

      onComplete?.({ channel, type });
      onClose?.();
    } catch (err) {
      setError(err?.message || "Unable to send communication.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Investor Communication</h3>
            <p className="mt-0.5 text-xs text-slate-500">{investor?.fullName || "Investor"}</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setChannel("EMAIL")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${channel === "EMAIL" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>
              <Mail size={14} /> Email
            </button>
            <button type="button" onClick={() => setChannel("WHATSAPP")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${channel === "WHATSAPP" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-600"}`}>
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType("ACCOUNT_OPENING")} className={`rounded-xl border px-3 py-2.5 text-left text-xs ${type === "ACCOUNT_OPENING" ? "border-slate-300 bg-slate-50 font-semibold" : "border-slate-200 text-slate-500"}`}>
              <div className="flex items-center gap-2"><Send size={13} /> Account Opening</div>
            </button>
            <button type="button" onClick={() => setType("STATEMENT")} className={`rounded-xl border px-3 py-2.5 text-left text-xs ${type === "STATEMENT" ? "border-slate-300 bg-slate-50 font-semibold" : "border-slate-200 text-slate-500"}`}>
              <div className="flex items-center gap-2"><FileText size={13} /> Statement</div>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-slate-400">
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.accountNumber} — {item.schemeSnapshot?.schemeName || item.schemeName || "Investment"}</option>)}
            </select>
          </div>

          {type === "STATEMENT" && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">From</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" /></div>
              <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">To</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" /></div>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            {channel === "EMAIL" ? `Recipient: ${recipientEmail || "No email configured"}` : `Recipient: ${phone || "No mobile configured"}`}
          </div>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}

          <button type="button" onClick={handleSend} disabled={sending || !account} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? "Sending…" : `Send via ${channel === "EMAIL" ? "Email" : "WhatsApp"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
