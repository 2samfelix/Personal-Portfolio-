export type QafCard = {
  label: string;
  body: string;
};

/**
 * Shared "Question / Approach / Finding" three-card strip. Layout only —
 * all copy is caller-supplied per project. The third (finding) card is
 * visually emphasized (tinted background, bold body) to match the
 * Caterpillar reference implementation; this is a fixed layout choice, not
 * a per-project option.
 */
export function QuestionApproachFinding({
  question,
  approach,
  finding,
}: {
  question: QafCard;
  approach: QafCard;
  finding: QafCard;
}) {
  return (
    <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-forest/15 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass">{question.label}</p>
        <p className="mt-3 text-base leading-7 text-charcoal">{question.body}</p>
      </div>
      <div className="rounded-2xl border border-forest/15 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass">{approach.label}</p>
        <p className="mt-3 text-base leading-7 text-charcoal">{approach.body}</p>
      </div>
      <div className="rounded-2xl border border-forest/30 bg-forest/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass">{finding.label}</p>
        <p className="mt-3 text-base font-semibold leading-7 text-charcoal">{finding.body}</p>
      </div>
    </div>
  );
}
