import { AbsoluteFill, interpolate, useVideoConfig, spring, useCurrentFrame } from "remotion";

const theme = { bg: "#0f172a", primary: "#ffffff", accent: "#8b5cf6" };

const cardColors = {
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

export const slides = [
  {
    id: "cover",
    duration: 60,
    component: ({}) => {
      const frame = useCurrentFrame();
      const { fps } = useVideoConfig();
      const progress = spring({ frame, fps, config: { damping: 200 } });
      return (
        <AbsoluteFill style={{ background: theme.bg }}>
          <div
            style={{
              opacity: interpolate(progress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
              fontSize: 72,
              color: theme.primary,
              textAlign: "center",
              padding: "40vh 0",
            }}
          >
            智能分析报告
          </div>
        </AbsoluteFill>
      );
    },
  },
  {
    id: "content-blue",
    duration: 90,
    component: ({ cards }: { cards?: { title: string; content: string; type: string }[] }) => {
      const frame = useCurrentFrame();
      const { fps } = useVideoConfig();
      const progress = spring({ frame, fps, config: { damping: 200 } });
      const cardsData = cards || [];
      return (
        <AbsoluteFill style={{ background: theme.bg, padding: 40 }}>
          <div style={{ fontSize: 36, fontWeight: "bold", color: theme.accent, marginBottom: 20 }}>
            核心事实
          </div>
          {cardsData.map((card, j) => (
            <div
              key={j}
              style={{
                backgroundColor: cardColors[card.type as keyof typeof cardColors] || cardColors.blue,
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                opacity: interpolate(progress, [(j + 1) * 0.15, (j + 1) * 0.15 + 0.3], [0, 1]),
                transform: `translateX(${interpolate(progress, [(j + 1) * 0.15, (j + 1) * 0.15 + 0.5], [-50, 0])}px)`,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>{card.title}</div>
              <div style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>
                {card.content}
              </div>
            </div>
          ))}
        </AbsoluteFill>
      );
    },
  },
  {
    id: "summary",
    duration: 60,
    component: ({ summaryPoints }: { summaryPoints?: string[] }) => {
      const frame = useCurrentFrame();
      const { fps } = useVideoConfig();
      const progress = spring({ frame, fps, config: { damping: 200 } });
      const points = summaryPoints || [];
      return (
        <AbsoluteFill style={{ background: theme.bg, justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 48, color: theme.accent, marginBottom: 40 }}>总结</div>
          {points.map((point, j) => (
            <div
              key={j}
              style={{
                fontSize: 24,
                color: theme.primary,
                marginBottom: 16,
                opacity: interpolate(progress, [j * 0.2, j * 0.2 + 0.3], [0, 1]),
              }}
            >
              {point}
            </div>
          ))}
        </AbsoluteFill>
      );
    },
  },
];