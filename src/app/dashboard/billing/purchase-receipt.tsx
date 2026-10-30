"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppGapLogo } from "~/components/logo";
import {
  ReceiptPrinter,
  type ReceiptPrinterStage,
} from "~/components/receipt-printer";

export interface PurchaseReceiptProps {
  /** Email the receipt is billed to. */
  email: string | null;
  /** Price label for the Pro plan, e.g. "$14.99". */
  priceLabel?: string;
  /** Formatted next-renewal date, or null if unknown. */
  renewsOn?: string | null;
  /** Human-facing order reference, e.g. "#AG-7F3A21". */
  orderNumber: string;
  /** Formatted purchase date. */
  purchasedOn: string;
}

// Mask the middle of the email so the receipt stays shareable-safe.
function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.slice(0, Math.min(6, name.length));
  return `${head}…@${domain}`;
}

export function PurchaseReceipt({
  email,
  priceLabel = "$14.99",
  renewsOn = null,
  orderNumber,
  purchasedOn,
}: PurchaseReceiptProps) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<ReceiptPrinterStage>("processing");
  const closeRef = useRef<HTMLButtonElement>(null);

  // Drive the printer timeline: processing → printing → complete.
  useEffect(() => {
    if (reduceMotion) {
      setStage("complete");
      return;
    }
    const toPrinting = setTimeout(() => setStage("printing"), 1500);
    const toComplete = setTimeout(() => setStage("complete"), 1500 + 1950);
    return () => {
      clearTimeout(toPrinting);
      clearTimeout(toComplete);
    };
  }, [reduceMotion]);

  // Clear the ?success=1 flag so a refresh doesn't replay the receipt.
  const dismiss = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // Escape closes the overlay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const isComplete = stage === "complete";
  const ink = "text-[oklch(0.26_0.02_230)]";
  const inkSoft = "text-[oklch(0.5_0.02_220)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Purchase receipt"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close receipt"
        onClick={dismiss}
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-brand-dark)_55%,transparent)] backdrop-blur-sm"
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 my-8 flex flex-col items-center"
      >
        <ReceiptPrinter.Root stage={stage} feedMotion="stepped">
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Screen>
              <ReceiptPrinter.Status />
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>

          <ReceiptPrinter.Output>
            <ReceiptPrinter.Paper>
              {/* Brand header */}
              <div className="text-center font-sans">
                <span className="inline-flex items-center gap-2.5 text-[26px] font-extrabold tracking-tight text-[oklch(0.22_0.042_222)]">
                  <AppGapLogo className="h-7 w-auto" />
                  AppGap
                </span>
                <div
                  className={`mt-2.5 text-[11px] uppercase tracking-[0.32em] ${inkSoft}`}
                >
                  Payment Receipt
                </div>
              </div>

              {/* Order meta */}
              <div className="mt-6 space-y-1.5 text-[13px]">
                <Row k="Order" v={orderNumber} inkSoft={inkSoft} ink={ink} />
                <Row k="Date" v={purchasedOn} inkSoft={inkSoft} ink={ink} />
              </div>

              <Dashed />

              {/* Line item */}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`text-[15px] font-bold ${ink}`}>
                    AppGap Pro
                  </div>
                  <div className={`mt-0.5 text-[11px] ${inkSoft}`}>
                    Monthly membership
                  </div>
                </div>
                <div className={`text-[15px] font-bold ${ink}`}>
                  {priceLabel}
                </div>
              </div>

              <Dashed />

              <div className="space-y-1.5 text-[13px]">
                <Row k="Subtotal" v={priceLabel} inkSoft={inkSoft} ink={ink} />
                <Row k="Tax" v="$0.00" inkSoft={inkSoft} ink={ink} />
              </div>

              <Solid ink={ink} />
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-[13px] font-bold uppercase tracking-[0.18em] ${ink}`}
                >
                  Total
                </span>
                <span className={`text-[22px] font-extrabold ${ink}`}>
                  {priceLabel}
                </span>
              </div>
              <Solid ink={ink} />

              {/* Billing details */}
              <div className="mt-3 space-y-1.5 text-[13px]">
                <Row
                  k="Billed to"
                  v={maskEmail(email)}
                  inkSoft={inkSoft}
                  ink={ink}
                />
                {renewsOn && (
                  <Row k="Renews" v={renewsOn} inkSoft={inkSoft} ink={ink} />
                )}
              </div>

              {/* PAID stamp */}
              <div className="mt-5 flex justify-center">
                <span className="-rotate-6 rounded-lg border-[2.5px] border-emerald-500 px-4 py-1.5 font-sans text-[16px] font-extrabold uppercase tracking-[0.22em] text-emerald-500">
                  Paid
                </span>
              </div>

              <div
                className={`mt-5 text-center font-sans text-[13px] ${inkSoft}`}
              >
                <span className="font-semibold text-brand-teal">
                  Pro unlocked.
                </span>{" "}
                Thank you for upgrading!
              </div>

              {/* Barcode */}
              <div
                aria-hidden="true"
                className="mt-5 h-12"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, oklch(0.26 0.02 230) 0 2px, transparent 2px 4px, oklch(0.26 0.02 230) 4px 5px, transparent 5px 9px, oklch(0.26 0.02 230) 9px 12px, transparent 12px 14px)",
                }}
              />
              <div
                className={`mt-2 text-center text-[11px] tracking-[0.3em] ${inkSoft}`}
              >
                {orderNumber
                  .replace(/[^A-Z0-9]/g, "")
                  .split("")
                  .join(" ")}
              </div>
            </ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter.Root>

        {/* Dismiss control — appears once the receipt is printed. */}
        <motion.button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          initial={false}
          animate={{
            opacity: isComplete ? 1 : 0,
            y: isComplete ? 0 : 8,
            pointerEvents: isComplete ? "auto" : "none",
          }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="mt-6 flex h-11 items-center justify-center rounded-xl bg-brand-teal px-8 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
        >
          Continue to Pro
        </motion.button>
      </motion.div>
    </div>
  );
}

function Row({
  k,
  v,
  ink,
  inkSoft,
}: {
  k: string;
  v: string;
  ink: string;
  inkSoft: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={inkSoft}>{k}</span>
      <span className={`font-semibold ${ink}`}>{v}</span>
    </div>
  );
}

function Dashed() {
  return (
    <hr className="my-4 border-0 border-t-[1.5px] border-dashed border-[color-mix(in_oklab,oklch(0.26_0.02_230)_35%,white)]" />
  );
}

function Solid({ ink: _ink }: { ink: string }) {
  return (
    <hr className="my-3.5 border-0 border-t-2 border-[oklch(0.26_0.02_230)]" />
  );
}
