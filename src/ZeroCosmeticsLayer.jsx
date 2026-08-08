import { useMemo } from "react";
import { getCosmeticState } from "./zero-wallet";

export function cosmeticClassNames(wallet) {
  const state = getCosmeticState(wallet);

  return [
    state.background ? `cosmetic-${state.background}` : "",
    state.eyes ? `cosmetic-${state.eyes}` : "",
    state.effect ? `cosmetic-${state.effect}` : "",
    state.accessory ? `cosmetic-${state.accessory}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ZeroCosmeticsLayer({ wallet }) {
  const state = useMemo(
    () => getCosmeticState(wallet),
    [wallet]
  );

  return (
    <div className="zero-cosmetics-layer" aria-hidden="true">
      {state.effect === "fx_stardust" ? (
        <div className="zero-cosmetic-stardust">
          {Array.from({ length: 22 }, (_, index) => (
            <i
              key={index}
              style={{
                "--dust-x": `${6 + ((index * 37) % 88)}%`,
                "--dust-y": `${8 + ((index * 53) % 80)}%`,
                "--dust-delay": `${-(index * 0.43)}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {state.effect === "fx_orbit" ? (
        <div className="zero-cosmetic-orbit">
          <i />
          <i />
        </div>
      ) : null}

      {state.effect === "fx_echo" ? (
        <div className="zero-cosmetic-echo">
          <i />
          <i />
          <i />
        </div>
      ) : null}

      {state.effect === "fx_fireflies" ? (
        <div className="zero-cosmetic-fireflies">
          {Array.from({ length: 12 }, (_, index) => (
            <i
              key={index}
              style={{
                "--fly-x": `${9 + ((index * 41) % 82)}%`,
                "--fly-y": `${14 + ((index * 47) % 68)}%`,
                "--fly-delay": `${-(index * 0.61)}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {state.effect === "fx_glitch" ? (
        <div className="zero-cosmetic-glitch">
          <i />
          <i />
        </div>
      ) : null}

      {state.accessory === "accessory_crown" ? (
        <div className="zero-accessory-crown">
          <i />
          <i />
          <i />
        </div>
      ) : null}

      {state.accessory === "accessory_headphones" ? (
        <div className="zero-accessory-headphones">
          <i />
          <i />
          <span />
        </div>
      ) : null}

      {state.accessory === "accessory_beanie" ? (
        <div className="zero63-accessory-beanie">
          <i />
        </div>
      ) : null}

      {state.accessory === "accessory_horns" ? (
        <div className="zero-accessory-horns">
          <i />
          <i />
        </div>
      ) : null}

      {state.accessory === "accessory_visor" ? (
        <div className="zero-accessory-visor">
          <i />
        </div>
      ) : null}

      {state.accessory === "accessory_wings" ? (
        <div className="zero-accessory-wings">
          <i />
          <i />
        </div>
      ) : null}

      {state.accessory === "accessory_shards" ? (
        <div className="zero-cosmetic-shards">
          <i />
          <i />
          <i />
          <i />
        </div>
      ) : null}
    </div>
  );
}
