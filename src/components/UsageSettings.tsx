import type { HTMLAttributes, ReactNode } from "react";

export interface UsageLimit {
  id: string;
  label: string;
  remainingPercent: number;
  resetLabel?: string;
}

export interface UsageLimitGroup {
  id: string;
  label: string;
  limits: readonly UsageLimit[];
}

export interface UsagePlanSummary {
  label: string;
  price: string;
}

export interface UsageCreditsSummary {
  balance: string;
  giftLabel?: string;
  promotionLabel?: string;
}

export interface UsageSettingsPageProps
  extends HTMLAttributes<HTMLElement> {
  billingSettingsHref?: string;
  cancelPlanContent?: ReactNode;
  credits: UsageCreditsSummary;
  limitGroups: readonly UsageLimitGroup[];
  noResetsLabel?: string;
  onBuyCredits?: () => void;
  onGiftCredits?: () => void;
  onViewPlans?: () => void;
  plan: UsagePlanSummary;
}

function UsageActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="codex-ui-usage-settings__action"
      disabled={!onClick}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function UsageCard({ children }: { children: ReactNode }) {
  return <div className="codex-ui-usage-settings__card">{children}</div>;
}

export function UsageSettingsPage({
  billingSettingsHref,
  cancelPlanContent,
  className,
  credits,
  limitGroups,
  noResetsLabel = "No resets available",
  onBuyCredits,
  onGiftCredits,
  onViewPlans,
  plan,
  ...props
}: UsageSettingsPageProps) {
  return (
    <article
      {...props}
      className={["codex-ui-usage-settings", className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="codex-ui-usage-settings__header">
        <h1>Usage &amp; billing</h1>
        <p>
          To view invoices, change your payment method, and take other actions,
          visit{" "}
          {billingSettingsHref ? (
            <a href={billingSettingsHref}>settings</a>
          ) : (
            <span>settings</span>
          )}{" "}
          on Web
        </p>
      </header>

      <section className="codex-ui-usage-settings__section">
        <h2>Your plan</h2>
        <UsageCard>
          <div className="codex-ui-usage-settings__row">
            <div className="codex-ui-usage-settings__copy">
              <strong>{plan.label}</strong>
              <span>{plan.price}</span>
            </div>
            <UsageActionButton onClick={onViewPlans}>
              View plans
            </UsageActionButton>
          </div>
        </UsageCard>
      </section>

      <section className="codex-ui-usage-settings__section">
        <header className="codex-ui-usage-settings__section-header">
          <h2>Credits balance</h2>
          <p>Your remaining credits</p>
        </header>
        <UsageCard>
          <div className="codex-ui-usage-settings__row codex-ui-usage-settings__credits-row">
            <div className="codex-ui-usage-settings__copy">
              <strong>{credits.balance}</strong>
              <span>Current balance</span>
            </div>
            <div className="codex-ui-usage-settings__credit-actions">
              {credits.promotionLabel ? (
                <span className="codex-ui-usage-settings__promotion">
                  {credits.promotionLabel}
                </span>
              ) : null}
              <UsageActionButton onClick={onBuyCredits}>
                Buy credits
              </UsageActionButton>
            </div>
          </div>
          {credits.giftLabel ? (
            <div className="codex-ui-usage-settings__row codex-ui-usage-settings__gift-row">
              <strong>{credits.giftLabel}</strong>
              <UsageActionButton onClick={onGiftCredits}>
                Gift credits
              </UsageActionButton>
            </div>
          ) : null}
        </UsageCard>
      </section>

      {limitGroups.map((group) => (
        <section className="codex-ui-usage-settings__section" key={group.id}>
          <h2>{group.label}</h2>
          <UsageCard>
            {group.limits.map((limit) => {
              const remainingPercent = Math.max(
                0,
                Math.min(100, limit.remainingPercent),
              );
              return (
                <div className="codex-ui-usage-settings__limit" key={limit.id}>
                  <div className="codex-ui-usage-settings__copy">
                    <strong>{limit.label}</strong>
                    {limit.resetLabel ? <span>{limit.resetLabel}</span> : null}
                  </div>
                  <div className="codex-ui-usage-settings__meter-group">
                    <div
                      aria-label={`${limit.label} usage remaining`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={remainingPercent}
                      className="codex-ui-usage-settings__meter"
                      role="progressbar"
                    >
                      <span style={{ width: `${remainingPercent}%` }} />
                    </div>
                    <output>{remainingPercent}% left</output>
                  </div>
                </div>
              );
            })}
          </UsageCard>
        </section>
      ))}

      <section className="codex-ui-usage-settings__section">
        <h2>Usage limit resets</h2>
        <UsageCard>
          <p className="codex-ui-usage-settings__empty">{noResetsLabel}</p>
        </UsageCard>
      </section>

      {cancelPlanContent ? (
        <section className="codex-ui-usage-settings__section codex-ui-usage-settings__cancel">
          <h2>Cancel plan</h2>
          <div>{cancelPlanContent}</div>
        </section>
      ) : null}
    </article>
  );
}

export interface PlanPriceLine {
  cadence?: string;
  current: string;
  description?: string;
  label?: string;
  previous?: string;
}

export interface PlanSelectionCard {
  actionLabel: string;
  accent?: boolean;
  featureHeading?: string;
  features: readonly string[];
  footnotes?: readonly string[];
  id: string;
  priceLines: readonly PlanPriceLine[];
  selector?: {
    label: string;
    options: readonly { label: string; value: string }[];
    value: string;
  };
  tagline: string;
  title: string;
}

export interface PlanSelectionPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onSelect"> {
  audience: "business" | "personal";
  backIcon?: ReactNode;
  businessCards: readonly PlanSelectionCard[];
  onAudienceChange?: (audience: "business" | "personal") => void;
  onBack?: () => void;
  onCardAction?: (card: PlanSelectionCard) => void;
  onSelectorChange?: (card: PlanSelectionCard, value: string) => void;
  personalCards: readonly PlanSelectionCard[];
}

function PlanSegment({
  label,
  onSelect,
  selected,
}: {
  label: string;
  onSelect?: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-checked={selected}
      disabled={!onSelect}
      onClick={onSelect}
      role="radio"
      tabIndex={selected ? 0 : -1}
      type="button"
    >
      {label}
    </button>
  );
}

function PlanCard({
  card,
  onAction,
  onSelectorChange,
}: {
  card: PlanSelectionCard;
  onAction?: () => void;
  onSelectorChange?: (value: string) => void;
}) {
  return (
    <section
      className={[
        "codex-ui-plan-selection__card",
        card.accent ? "codex-ui-plan-selection__card--accent" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      data-plan-id={card.id}
    >
      <div className="codex-ui-plan-selection__card-heading">
        <h3>{card.title}</h3>
        {card.selector ? (
          <div
            aria-label={card.selector.label}
            className="codex-ui-plan-selection__mini-segment"
            role="radiogroup"
          >
            {card.selector.options.map((option) => (
              <PlanSegment
                key={option.value}
                label={option.label}
                onSelect={
                  onSelectorChange
                    ? () => onSelectorChange(option.value)
                    : undefined
                }
                selected={option.value === card.selector?.value}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="codex-ui-plan-selection__prices">
        {card.priceLines.map((price, index) => (
          <div className="codex-ui-plan-selection__price-line" key={index}>
            {price.label ? <strong>{price.label}</strong> : null}
            <span>
              {price.previous ? <del>{price.previous}</del> : null}
              <b>{price.current}</b>
              {price.cadence ? <small>{price.cadence}</small> : null}
            </span>
            {price.description ? <p>{price.description}</p> : null}
          </div>
        ))}
      </div>

      <p className="codex-ui-plan-selection__tagline">{card.tagline}</p>
      <button
        className="codex-ui-plan-selection__action"
        disabled={!onAction}
        onClick={onAction}
        type="button"
      >
        {card.actionLabel}
      </button>

      {card.featureHeading ? <h4>{card.featureHeading}</h4> : null}
      <ul>
        {card.features.map((feature) => (
          <li key={feature}>
            <span aria-hidden="true">✦</span>
            {feature}
          </li>
        ))}
      </ul>
      {card.footnotes?.map((footnote) => (
        <p className="codex-ui-plan-selection__footnote" key={footnote}>
          {footnote}
        </p>
      ))}
    </section>
  );
}

export function PlanSelectionPage({
  audience,
  backIcon,
  businessCards,
  className,
  onAudienceChange,
  onBack,
  onCardAction,
  onSelectorChange,
  personalCards,
  ...props
}: PlanSelectionPageProps) {
  const cards = audience === "personal" ? personalCards : businessCards;
  return (
    <article
      {...props}
      className={[
        "codex-ui-plan-selection",
        `codex-ui-plan-selection--${audience}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="codex-ui-plan-selection__topbar">
        <button disabled={!onBack} onClick={onBack} type="button">
          <span aria-hidden="true">{backIcon ?? "←"}</span>
          Back to ChatGPT
        </button>
      </header>
      <div className="codex-ui-plan-selection__scroll">
        <div className="codex-ui-plan-selection__content">
          <h2>Choose your plan</h2>
          <div
            aria-label="Plan audience"
            className="codex-ui-plan-selection__audience"
            role="radiogroup"
          >
            <PlanSegment
              label="Personal"
              onSelect={
                onAudienceChange
                  ? () => onAudienceChange("personal")
                  : undefined
              }
              selected={audience === "personal"}
            />
            <PlanSegment
              label="Business"
              onSelect={
                onAudienceChange
                  ? () => onAudienceChange("business")
                  : undefined
              }
              selected={audience === "business"}
            />
          </div>
          <div className="codex-ui-plan-selection__grid">
            {cards.map((card) => (
              <PlanCard
                card={card}
                key={card.id}
                onAction={
                  onCardAction ? () => onCardAction(card) : undefined
                }
                onSelectorChange={
                  onSelectorChange
                    ? (value) => onSelectorChange(card, value)
                    : undefined
                }
              />
            ))}
          </div>
          <p className="codex-ui-plan-selection__support">
            I need help with a billing issue
          </p>
          <p className="codex-ui-plan-selection__enterprise">
            Need more capabilities for your business? <strong>See ChatGPT Enterprise</strong>
          </p>
        </div>
      </div>
    </article>
  );
}
