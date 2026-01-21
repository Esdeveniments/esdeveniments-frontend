import type {
  CitySpotlightIntroProps,
  CitySpotlightItemProps,
  CitySpotlightOutroProps,
  CitySpotlightProps,
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

const CitySpotlightIntro = ({
  cityName,
  dateRangeText,
  opacity,
  translateY,
}: CitySpotlightIntroProps) => {
  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
      <div style={{ fontSize: 64, fontWeight: 700 }}>Plans a {cityName}</div>
      <div style={{ fontSize: 32, opacity: 0.8, marginTop: 12 }}>
        {dateRangeText}
      </div>
    </div>
  );
};

const CitySpotlightItem = ({
  event,
  opacity,
  translateY,
}: CitySpotlightItemProps) => {
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
        gap: 24,
        marginTop: 140,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 280,
          height: 280,
          borderRadius: 24,
          background: "linear-gradient(135deg, #2a1f38, #121018)",
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
        <div style={{ fontSize: 50, fontWeight: 700 }}>{event.title}</div>
        <div style={{ fontSize: 30, marginTop: 12 }}>{event.dateText}</div>
        <div style={{ fontSize: 28, opacity: 0.8, marginTop: 6 }}>
          {event.locationText}
        </div>
      </div>
    </div>
  );
};

const CitySpotlightOutro = ({ ctaText, opacity }: CitySpotlightOutroProps) => {
  return <div style={{ marginTop: 160, fontSize: 38, opacity }}>{ctaText}</div>;
};

export const CitySpotlight = ({
  cityName,
  dateRangeText,
  events,
  ctaText,
}: CitySpotlightProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introFrames = Math.round(2 * fps);
  const itemFrames = Math.round(2.2 * fps);
  const outroFrames = Math.round(1 * fps);

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleTranslate = interpolate(titleSpring, [0, 1], [28, 0]);
  const introOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111016",
        color: "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 80,
      }}
    >
      <Sequence from={0} durationInFrames={introFrames} premountFor={fps}>
        <CitySpotlightIntro
          cityName={cityName}
          dateRangeText={dateRangeText}
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
        const translateY = interpolate(localFrame, [0, 12], [20, 0], {
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
            <CitySpotlightItem
              event={event}
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
        <CitySpotlightOutro
          ctaText={ctaText ?? "Guarda i comparteix"}
          opacity={interpolate(frame, [0, 10], [0, 1], {
            extrapolateRight: "clamp",
          })}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
