import type {
  WeeklyHighlightsIntroProps,
  WeeklyHighlightsItemProps,
  WeeklyHighlightsOutroProps,
  WeeklyHighlightsProps,
} from "types/video";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const WeeklyHighlightsIntro = ({
  title,
  subtitle,
  opacity,
  translateY,
}: WeeklyHighlightsIntroProps) => {
  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
      <div style={{ fontSize: 74, fontWeight: 700 }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: 36, opacity: 0.8, marginTop: 16 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};

const WeeklyHighlightsItem = ({
  event,
  index,
  total,
  opacity,
  translateY,
}: WeeklyHighlightsItemProps) => {
  const hasImage = event.imageUrl.trim().length > 0;
  const imageSrc = hasImage
    ? event.imageUrl.startsWith("http")
      ? event.imageUrl
      : staticFile(event.imageUrl)
    : "";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        gap: 32,
        marginTop: 140,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 360,
          height: 360,
          borderRadius: 24,
          background: "linear-gradient(135deg, #2b2b38, #14141d)",
          overflow: "hidden",
        }}
      >
        {hasImage ? (
          <Img
            src={imageSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 28, opacity: 0.7 }}>
          {index + 1} / {total}
        </div>
        <div style={{ fontSize: 54, fontWeight: 700, marginTop: 12 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 34, marginTop: 16 }}>{event.dateText}</div>
        <div style={{ fontSize: 30, opacity: 0.8, marginTop: 8 }}>
          {event.locationText}
        </div>
      </div>
    </div>
  );
};

const WeeklyHighlightsOutro = ({
  ctaText,
  opacity,
}: WeeklyHighlightsOutroProps) => {
  return (
    <div style={{ marginTop: 160, fontSize: 40, opacity }}>{ctaText}</div>
  );
};

export const WeeklyHighlights = ({
  title,
  subtitle,
  events,
  ctaText,
}: WeeklyHighlightsProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introFrames = Math.round(2 * fps);
  const itemFrames = Math.round(2.5 * fps);
  const outroFrames = Math.round(1 * fps);

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleTranslate = interpolate(titleSpring, [0, 1], [24, 0]);
  const introOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b0b10",
        color: "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 80,
      }}
    >
      <Sequence from={0} durationInFrames={introFrames} premountFor={fps}>
        <WeeklyHighlightsIntro
          title={title}
          subtitle={subtitle}
          opacity={introOpacity}
          translateY={titleTranslate}
        />
      </Sequence>

      {events.map((event, index) => {
        const itemStart = introFrames + index * itemFrames;
        const localFrame = frame - itemStart;
        const opacity = interpolate(
          localFrame,
          [0, 10, itemFrames - 10, itemFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const translateY = interpolate(localFrame, [0, 12], [24, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <Sequence
            key={`${event.title}-${index}`}
            from={itemStart}
            durationInFrames={itemFrames}
            premountFor={fps}
          >
            <WeeklyHighlightsItem
              event={event}
              index={index}
              total={events.length}
              opacity={opacity}
              translateY={translateY}
            />
          </Sequence>
        );
      })}

      <Sequence
        from={introFrames + events.length * itemFrames}
        durationInFrames={outroFrames}
        premountFor={fps}
      >
        <WeeklyHighlightsOutro
          ctaText={ctaText ?? "Segueix-nos per mes plans"}
          opacity={interpolate(frame, [0, 10], [0, 1], {
            extrapolateRight: "clamp",
          })}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
