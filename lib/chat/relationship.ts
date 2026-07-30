export type RelationshipScores = {
  trust: number;
  friendship: number;
  romance: number;
  suspicion: number;
  respect: number;
};

export type RelationshipDeltas = Partial<RelationshipScores>;

const SCORE_MIN = -100;
const SCORE_MAX = 100;

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(value)));
}

export function applyRelationshipDeltas(
  current: RelationshipScores,
  deltas: RelationshipDeltas
): RelationshipScores {
  return {
    trust: clampScore(current.trust + (deltas.trust ?? 0)),
    friendship: clampScore(current.friendship + (deltas.friendship ?? 0)),
    romance: clampScore(current.romance + (deltas.romance ?? 0)),
    suspicion: clampScore(current.suspicion + (deltas.suspicion ?? 0)),
    respect: clampScore(current.respect + (deltas.respect ?? 0)),
  };
}

export const UPDATE_RELATIONSHIP_TOOL = {
  name: "update_relationship",
  description:
    "Silently update how you feel about the user after this turn. Use small integer deltas (typically -5 to +5). Scores are never shown to the user.",
  input_schema: {
    type: "object" as const,
    properties: {
      trust: { type: "integer", description: "Delta for trust (-100..100 total)" },
      friendship: {
        type: "integer",
        description: "Delta for friendship (-100..100 total)",
      },
      romance: {
        type: "integer",
        description: "Delta for romance (-100..100 total)",
      },
      suspicion: {
        type: "integer",
        description: "Delta for suspicion (-100..100 total)",
      },
      respect: {
        type: "integer",
        description: "Delta for respect (-100..100 total)",
      },
    },
    additionalProperties: false,
  },
};
