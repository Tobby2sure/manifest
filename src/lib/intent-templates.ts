import type { IntentType } from "@/lib/types/database";

export interface IntentTemplate {
  placeholder: string;
  template: string;
  hints: string[];
}

export const INTENT_TEMPLATES: Record<IntentType, IntentTemplate> = {
  partnership: {
    placeholder: "Describe the partnership you're seeking...",
    template:
      "We're [org/your name], building [what]. We're looking for a [type of org/builder] to partner with on [specific collaboration]. Ideal partner: [criteria]. Timeline: [open/urgent].",
    hints: [
      "Be specific about what you bring",
      "Mention your ecosystem",
      "State the ideal outcome",
    ],
  },
  investment: {
    placeholder: "Describe what you're raising and why...",
    template:
      "We're raising [stage/round] for [project name]. We've built [traction]. Looking for [investor type] who understands [space]. Check size: [range]. Close date: [timeline].",
    hints: [
      "Include traction numbers",
      "State your ecosystem",
      "Be specific on check size",
    ],
  },
  integration: {
    placeholder: "Describe the integration you need...",
    template:
      "We need a [type] integration for [use case]. Our protocol does [X]. Looking for a team that has [capability]. We can offer [what we bring]. Timeline: [urgency].",
    hints: [
      "Technical requirements help",
      "State your user base size",
      "Mention existing integrations",
    ],
  },
  hiring: {
    placeholder: "Describe the role you're hiring for...",
    template:
      "We're hiring a [role] at [org name]. Full-time/part-time/contract. Skills needed: [list]. We offer [comp/benefits]. Apply: [contact method or link].",
    hints: [
      "Include compensation range",
      "State if remote-friendly",
      "Link to more details",
    ],
  },
  "co-marketing": {
    placeholder: "Describe the co-marketing collab you're after...",
    template:
      "Looking for co-marketing collab with a [type of project]. We have [audience size/type]. Interested in: [joint content/Twitter space/campaign]. Our ecosystem: [list].",
    hints: [
      "Mention your audience size",
      "Be specific on format",
      "State timeline",
    ],
  },
  grant: {
    placeholder: "Describe the grant opportunity...",
    template:
      "We're offering grants up to [amount] for projects building [category] on [ecosystem]. Requirements: [criteria]. Apply by: [date]. Grant size: [range].",
    hints: [
      "Clear on eligibility",
      "Specify deliverables",
      "Include timeline",
    ],
  },
  "ecosystem-support": {
    placeholder: "Describe the ecosystem support you offer or need...",
    template:
      "We can offer [type of support: BD/intros/liquidity/technical] to projects building in [ecosystem]. We've supported [examples]. Looking for: [criteria for projects we support].",
    hints: [
      "List specific support types",
      "Mention past examples",
      "State what you look for",
    ],
  },
  "beta-testers": {
    placeholder: "Describe what you're testing and who you need...",
    template:
      "We're launching [product] and need beta testers. It does [X]. We need people who [criteria]. What you get: [incentive]. Test starts: [date].",
    hints: [
      "Be clear on time commitment",
      "Mention incentives",
      "State how to apply",
    ],
  },
};
