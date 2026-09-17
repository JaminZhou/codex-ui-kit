import { useState, type HTMLAttributes, type ReactNode } from "react";

export type LoginPageMode =
  | "chatgpt"
  | "api-key"
  | "device-code"
  | "browser-pending";

export type LoginPageStatus = "error" | "loading" | "ready";

export type LoginProvider =
  | "apple"
  | "email"
  | "google"
  | "microsoft"
  | "phone";

export interface LoginPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  apiKeyValue?: string;
  apiKeyPlaceholder?: string;
  browserPendingMessage?: ReactNode;
  canCopySignInLink?: boolean;
  deviceCode?: string;
  disabled?: boolean;
  errorMessage?: ReactNode;
  mode?: LoginPageMode;
  onApiKeyChange?: (value: string) => void;
  onApiKeySubmit?: () => void;
  onCancel?: () => void;
  onCopySignInLink?: () => void;
  onDeviceCode?: () => void;
  onOpenBrowser?: () => void;
  onProviderSignIn?: (provider: LoginProvider) => void;
  onRetry?: () => void;
  onShowApiKey?: () => void;
  onSignUp?: () => void;
  status?: LoginPageStatus;
  title?: ReactNode;
  verificationUrl?: string;
}

const providerLabels: Record<LoginProvider, string> = {
  apple: "Continue with Apple",
  email: "Continue with email",
  google: "Continue with Google",
  microsoft: "Continue with Microsoft",
  phone: "Continue with phone",
};

export function LoginPage({
  apiKeyPlaceholder = "sk-...",
  apiKeyValue = "",
  browserPendingMessage = "Continue signing in with your browser",
  canCopySignInLink = false,
  className,
  deviceCode = "",
  disabled = false,
  errorMessage = "Sign-in failed. Try again.",
  mode = "chatgpt",
  onApiKeyChange,
  onApiKeySubmit,
  onCancel,
  onCopySignInLink,
  onDeviceCode,
  onOpenBrowser,
  onProviderSignIn,
  onRetry,
  onShowApiKey,
  onSignUp,
  status = "ready",
  title = "Sign in to ChatGPT",
  verificationUrl,
  ...props
}: LoginPageProps) {
  const [moreOptions, setMoreOptions] = useState(false);
  const isLoading = status === "loading";

  if (status === "loading") {
    return (
      <main
        {...props}
        aria-busy="true"
        aria-disabled={disabled || undefined}
        className={["codex-ui-login-page", className].filter(Boolean).join(" ")}
        data-mode={mode}
        data-disabled={disabled || undefined}
        data-status={status}
      >
        <div className="codex-ui-login-page__loading" role="status">
          <span aria-hidden="true" className="codex-ui-login-page__spinner" />
          <span>Loading…</span>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main
        {...props}
        aria-disabled={disabled || undefined}
        className={["codex-ui-login-page", className].filter(Boolean).join(" ")}
        data-disabled={disabled || undefined}
        data-mode={mode}
        data-status={status}
      >
        <div className="codex-ui-login-page__panel" role="alert">
          <div aria-hidden="true" className="codex-ui-login-page__mark">
            C
          </div>
          <h1>{title}</h1>
          <p className="codex-ui-login-page__description">{errorMessage}</p>
          <div className="codex-ui-login-page__actions">
            <button
              className="codex-ui-login-page__primary"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onRetry?.();
              }}
              type="button"
            >
              Try again
            </button>
            <button
              className="codex-ui-login-page__secondary"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onCancel?.();
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    );
  }

  const renderApiKey = () => (
    <div className="codex-ui-login-page__api-key">
      <label htmlFor="codex-ui-login-api-key">Enter your OpenAI API key</label>
      <input
        autoComplete="off"
        disabled={disabled}
        id="codex-ui-login-api-key"
        onChange={(event) => {
          if (!disabled) onApiKeyChange?.(event.target.value);
        }}
        placeholder={apiKeyPlaceholder}
        spellCheck={false}
        type="password"
        value={apiKeyValue}
      />
      <p className="codex-ui-login-page__hint">Cloud chats disabled with API key</p>
      <div className="codex-ui-login-page__button-row">
        <button
          className="codex-ui-login-page__secondary"
          disabled={disabled}
          onClick={() => {
            if (!disabled) onCancel?.();
          }}
          type="button"
        >
          Cancel
        </button>
        <button
          className="codex-ui-login-page__primary"
          disabled={disabled || isLoading || apiKeyValue.trim().length === 0}
          onClick={() => {
            if (!disabled) onApiKeySubmit?.();
          }}
          type="button"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderDeviceCode = () => (
    <div className="codex-ui-login-page__device-code">
      <p className="codex-ui-login-page__description">
        To use a device code to log in, click the open browser button and paste the code below.
      </p>
      <div className="codex-ui-login-page__code-card">
        <span>Device code</span>
        <code>{deviceCode || "------"}</code>
      </div>
      <div className="codex-ui-login-page__button-row">
        <button
          className="codex-ui-login-page__secondary"
          disabled={disabled}
          onClick={() => {
            if (!disabled) onCancel?.();
          }}
          type="button"
        >
          Cancel
        </button>
        <button
          className="codex-ui-login-page__primary"
          disabled={disabled}
          onClick={() => {
            if (!disabled) onOpenBrowser?.();
          }}
          type="button"
        >
          Open browser
        </button>
      </div>
      <button
        className="codex-ui-login-page__text-action"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onCopySignInLink?.();
        }}
        type="button"
      >
        Copy sign-in link
      </button>
      {verificationUrl ? <span className="codex-ui-login-page__sr-only">{verificationUrl}</span> : null}
    </div>
  );

  const renderBrowserPending = () => (
    <div className="codex-ui-login-page__pending">
      <span aria-hidden="true" className="codex-ui-login-page__mark">C</span>
      <p className="codex-ui-login-page__description">{browserPendingMessage}</p>
      <button
        className="codex-ui-login-page__secondary"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onCancel?.();
        }}
        type="button"
      >
        Cancel sign-in
      </button>
      {canCopySignInLink ? (
        <div className="codex-ui-login-page__copy-row">
          <span>Browser didn&apos;t open?</span>
          <button
            className="codex-ui-login-page__text-action"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onCopySignInLink?.();
            }}
            type="button"
          >
            Copy sign-in link
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <main
      {...props}
      aria-disabled={disabled || undefined}
      className={["codex-ui-login-page", className].filter(Boolean).join(" ")}
      data-mode={mode}
      data-disabled={disabled || undefined}
      data-status={status}
    >
      <div className="codex-ui-login-page__panel">
        {mode === "browser-pending" ? (
          renderBrowserPending()
        ) : (
          <>
            <button
              aria-label="Play Snake"
              className="codex-ui-login-page__mark"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onDeviceCode?.();
              }}
              type="button"
            >
              C
            </button>
            <h1>{title}</h1>
            {mode === "api-key" ? (
              renderApiKey()
            ) : mode === "device-code" ? (
              renderDeviceCode()
            ) : (
              <>
                <div className="codex-ui-login-page__actions">
                  <button
                    className="codex-ui-login-page__primary"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) onProviderSignIn?.("google");
                    }}
                    type="button"
                  >
                    Continue to sign in
                  </button>
                  {moreOptions ? (
                    <>
                      {(Object.keys(providerLabels) as LoginProvider[]).map((provider) => (
                        <button
                          className="codex-ui-login-page__secondary"
                          disabled={disabled}
                          key={provider}
                          onClick={() => {
                            if (!disabled) onProviderSignIn?.(provider);
                          }}
                          type="button"
                        >
                          {providerLabels[provider]}
                        </button>
                      ))}
                      <button
                        className="codex-ui-login-page__secondary"
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled) onDeviceCode?.();
                        }}
                        type="button"
                      >
                        Use device code
                      </button>
                    </>
                  ) : null}
                  <button
                    className="codex-ui-login-page__secondary"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) onShowApiKey?.();
                    }}
                    type="button"
                  >
                    {moreOptions ? "Sign in with an API key" : "Sign in another way"}
                  </button>
                  <button
                    className="codex-ui-login-page__text-action"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) setMoreOptions((open) => !open);
                    }}
                    type="button"
                  >
                    {moreOptions ? "Less options" : "More options"}
                  </button>
                </div>
                <button
                  className="codex-ui-login-page__text-action"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) onSignUp?.();
                  }}
                  type="button"
                >
                  Sign up
                </button>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
