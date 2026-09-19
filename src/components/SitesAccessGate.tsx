import type { HTMLAttributes, ReactNode } from "react";

export type SitesAccessGateMode = "pricing" | "terms";

export interface SitesAccessGateProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  closeLabel?: ReactNode;
  continueLabel?: ReactNode;
  mode?: SitesAccessGateMode;
  onBack?: () => void;
  onClose?: () => void;
  onContinue?: () => void;
  pricingLabel?: ReactNode;
  terms?: ReactNode;
  title?: ReactNode;
}

const defaultTerms = (
  <>
    <p>A few additional terms apply when you create and publish a site</p>
    <ul>
      <li>You’re responsible for your site and anything visitors submit</li>
      <li>
        If your site collects personal data, learn more about your
        responsibilities
      </li>
      <li>OpenAI may remove sites that violate our policies</li>
    </ul>
    <a href="#sites-terms">Read the ChatGPT Sites Terms</a>
  </>
);

/**
 * Models the current Sites access boundary without claiming publishing or
 * billing ownership. Hosts decide whether Continue opens their pricing route.
 */
export function SitesAccessGate({
  className,
  closeLabel = "Close",
  continueLabel = "Continue",
  mode = "terms",
  onBack,
  onClose,
  onContinue,
  pricingLabel = "Sites pricing",
  terms = defaultTerms,
  title = "Sites",
  ...props
}: SitesAccessGateProps) {
  if (mode === "pricing") {
    return (
      <main
        {...props}
        aria-label="Sites pricing"
        className={["codex-ui-sites-access", "codex-ui-sites-access--pricing", className]
          .filter(Boolean)
          .join(" ")}
        data-mode="pricing"
      >
        <header className="codex-ui-sites-access__pricing-header">
          <button onClick={onBack} type="button">
            <span aria-hidden="true">←</span>
            <span>Back to ChatGPT</span>
          </button>
        </header>
        <section
          aria-label="Sites pricing checkout"
          className="codex-ui-sites-access__pricing-surface"
        >
          <span>{pricingLabel}</span>
        </section>
      </main>
    );
  }

  return (
    <main
      {...props}
      aria-label="Sites"
      className={["codex-ui-sites-access", "codex-ui-sites-access--terms", className]
        .filter(Boolean)
        .join(" ")}
      data-mode="terms"
    >
      <section
        aria-modal="true"
        aria-labelledby="codex-ui-sites-access-title"
        className="codex-ui-sites-access__terms-dialog"
        role="dialog"
      >
        <header className="codex-ui-sites-access__terms-header">
          <h1 id="codex-ui-sites-access-title">{title}</h1>
          {onClose ? (
            <button aria-label={String(closeLabel)} onClick={onClose} type="button">
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </header>
        <div className="codex-ui-sites-access__terms-body">
          <h2>Before you use Sites</h2>
          {terms}
        </div>
        <footer className="codex-ui-sites-access__terms-footer">
          <button onClick={onContinue} type="button">
            {continueLabel}
          </button>
        </footer>
      </section>
    </main>
  );
}
