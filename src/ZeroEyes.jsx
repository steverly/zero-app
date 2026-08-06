import React from "react";

export default function ZeroEyes({ mood = "idle", action = "none" }) {
  return (
    <div
      className={`zero-eyes zero-eyes--${mood}`}
      data-action={action || "none"}
      aria-hidden="true"
    >
      <span className="zero-eye zero-eye--left">
        <i className="zero-eye-stroke zero-eye-stroke--a" />
        <i className="zero-eye-stroke zero-eye-stroke--b" />
      </span>

      <span className="zero-eye zero-eye--right">
        <i className="zero-eye-stroke zero-eye-stroke--a" />
        <i className="zero-eye-stroke zero-eye-stroke--b" />
      </span>
    </div>
  );
}