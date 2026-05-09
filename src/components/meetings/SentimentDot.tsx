import type { Sentiment } from "@/types/meeting";

const COLOR: Record<Sentiment, string> = {
  warm: "var(--good)",
  neutral: "var(--ink-3)",
  cool: "var(--ink-4)",
};

export default function SentimentDot({
  sentiment,
  size = 8,
}: {
  sentiment: Sentiment;
  size?: number;
}) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: COLOR[sentiment],
      }}
      aria-label={sentiment}
    />
  );
}
