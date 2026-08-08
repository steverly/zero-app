export default function ZeroWorldBackground({
  background = "bg_void",
  preview = false,
}) {
  const world =
    [
      "bg_void",
      "bg_sunset",
      "bg_aquarium",
      "bg_cloud",
    ].includes(background)
      ? background
      : "bg_void";

  return (
    <div
      className={[
        "zero-world",
        `zero-world--${world}`,
        preview ? "is-preview" : "is-scene",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className="zero-world-sky" />
      <div className="zero-world-light" />

      {world === "bg_sunset" ? (
        <>
          <div className="zero-world-sun" />
          <div className="zero-world-horizon" />
          <div className="zero-world-haze" />
        </>
      ) : null}

      {world === "bg_aquarium" ? (
        <>
          <div className="zero-world-water" />
          <div className="zero-world-bubbles">
            {Array.from({ length: preview ? 5 : 14 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </>
      ) : null}

      {world === "bg_cloud" ? (
        <>
          <div className="zero-world-cloud is-a" />
          <div className="zero-world-cloud is-b" />
          <div className="zero-world-cloud is-c" />
        </>
      ) : null}

      {world === "bg_void" ? (
        <>
          <div className="zero-world-soft-orb is-a" />
          <div className="zero-world-soft-orb is-b" />
        </>
      ) : null}

      <div className="zero-world-floor-glow" />
    </div>
  );
}
