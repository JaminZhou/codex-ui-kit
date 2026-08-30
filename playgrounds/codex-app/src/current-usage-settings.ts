import type {
  PlanSelectionCard,
  UsageLimitGroup,
} from "codex-ui-kit";

export const currentUsageLimitGroups: readonly UsageLimitGroup[] = [
  {
    id: "general",
    label: "General usage limits",
    limits: [
      {
        id: "weekly",
        label: "Weekly usage limit",
        remainingPercent: 28,
        resetLabel: "Resets Sep 6, 2026, 12:30 PM",
      },
    ],
  },
  {
    id: "spark",
    label: "GPT-5.3-Codex-Spark usage limits",
    limits: [
      {
        id: "spark-five-hour",
        label: "5 hour usage limit",
        remainingPercent: 100,
        resetLabel: "Resets 10:19 AM",
      },
      {
        id: "spark-weekly",
        label: "Weekly usage limit",
        remainingPercent: 100,
        resetLabel: "Resets Sep 7, 2026, 5:19 AM",
      },
    ],
  },
];

const plusFeatures = [
  "Advanced models",
  "Advanced image creation with Thinking",
  "Expanded memory across chats",
  "Work agent for multi-step tasks",
  "Codex agent for coding",
  "Expanded deep research",
  "Projects and custom GPTs",
] as const;

const proFeatures = [
  "20x more usage than Plus",
  "Frontier Pro model",
  "Maximum access to Codex agent",
  "Maximum access to Work agent",
  "Unlimited core chat",
  "Unlimited and faster image creation",
  "Maximum memory and context",
  "Early access to experimental features",
] as const;

const goFeatures = [
  "Core model",
  "More messages and uploads",
  "More image creation",
  "Longer memory",
  "Expanded voice mode",
] as const;

const businessFeatures = [
  "All ChatGPT, ChatGPT Work, and Codex features",
  "Access across desktop, web, and mobile",
  "Connect to Google Workspace, Slack, GitHub, Microsoft 365, and more",
  "Secure workspace with SAML, SSO, and MFA",
  "Centralized billing and administration",
  "Usage analytics and spend controls",
  "No training on your business data by default",
  "Workspace agents for customized workflows",
  "Mix and match seat types",
] as const;

const multiplierSelector = (value: "20x" | "5x") => ({
  label: "Pro usage multiplier",
  options: [
    { label: "5x", value: "5x" },
    { label: "20x", value: "20x" },
  ],
  value,
});

export function currentPersonalPlanCards(
  multiplier: "20x" | "5x",
): readonly PlanSelectionCard[] {
  return [
    {
      actionLabel: "Switch to Go",
      features: goFeatures,
      footnotes: ["This plan may include ads. Learn more"],
      id: "go",
      priceLines: [{ cadence: "USD / month", current: "$8" }],
      tagline: "Keep chatting with expanded access",
      title: "Go",
    },
    {
      accent: true,
      actionLabel: "Switch plan",
      featureHeading: "Everything in Plus and:",
      features: proFeatures,
      footnotes: [
        "Unlimited subject to abuse guardrails.",
        "Learn about limits and promos on both tiers",
        "Manage my subscription in the ChatGPT iOS app",
      ],
      id: "pro",
      priceLines: [
        {
          cadence: "USD / month",
          current: multiplier === "20x" ? "$200" : "$100",
        },
      ],
      selector: multiplierSelector(multiplier),
      tagline: "Maximize your productivity",
      title: "Pro",
    },
    {
      actionLabel: "Switch to Plus",
      features: plusFeatures,
      footnotes: ["Manage my subscription in the ChatGPT iOS app"],
      id: "plus",
      priceLines: [{ cadence: "USD / month", current: "$20" }],
      tagline: "Unlock the full experience",
      title: "Plus",
    },
  ];
}

export function currentBusinessPlanCards(
  multiplier: "20x" | "5x",
  billing: "annual" | "monthly",
): readonly PlanSelectionCard[] {
  const annual = billing === "annual";
  return [
    {
      actionLabel: "Switch plan",
      featureHeading: "Everything in Plus and:",
      features: proFeatures,
      footnotes: [
        "Unlimited subject to abuse guardrails.",
        "Learn about limits and promos on both tiers",
        "Manage my subscription in the ChatGPT iOS app",
      ],
      id: "pro",
      priceLines: [
        {
          cadence: "USD / month",
          current: multiplier === "20x" ? "$200" : "$100",
        },
      ],
      selector: multiplierSelector(multiplier),
      tagline: "Maximize your productivity",
      title: "Pro",
    },
    {
      accent: true,
      actionLabel: "Upgrade",
      featureHeading: "Designed for workspaces:",
      features: businessFeatures,
      footnotes: [
        "For teams of 2–200 employees. Unlimited subject to abuse guardrails. Learn more",
      ],
      id: "business",
      priceLines: [
        {
          cadence: "/ month",
          current: annual ? "$25" : "$30",
          description: "Best for everyday work",
          label: "Standard seat",
          previous: annual ? "$32" : undefined,
        },
        {
          cadence: "/ month",
          current: annual ? "$125" : "$150",
          description: "5x more usage than standard, no 5-hour limit",
          label: "Premium seat",
          previous: annual ? "$160" : undefined,
        },
      ],
      selector: {
        label: "Business billing cycle",
        options: [
          { label: "Annual", value: "annual" },
          { label: "Monthly", value: "monthly" },
        ],
        value: billing,
      },
      tagline: "A secure workspace with company context",
      title: "Business",
    },
  ];
}
