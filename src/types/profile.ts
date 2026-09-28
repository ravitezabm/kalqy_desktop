import jayraj from "../assets/profiles/jayraj.svg";
import raju from "../assets/profiles/raju.svg";
import manesh from "../assets/profiles/manesh.svg";
import janmani from "../assets/profiles/janmani.svg";
import mridula from "../assets/profiles/mridula.svg";
import manjima from "../assets/profiles/manjima.svg";

export interface Profile {
  id: string;
  name: string;
  image: string;
}

// Temporary local placeholders — swap the files in src/assets/profiles/
// for the final Kalqy character artwork; nothing else needs to change.
export const PROFILE_ASSETS: Record<string, string> = {
  jayraj,
  raju,
  manesh,
  janmani,
  mridula,
  manjima,
};

// Order here defines each profile's fixed position around the orbit ring
// (see calculateSlotGeometry) — it does not need to change when the center
// selection changes.
export const PROFILES: Profile[] = [
  { id: "jayraj", name: "JAYRAJ", image: PROFILE_ASSETS.jayraj },
  { id: "raju", name: "RAJU", image: PROFILE_ASSETS.raju },
  { id: "janmani", name: "JANMANI", image: PROFILE_ASSETS.janmani },
  { id: "manjima", name: "MANJIMA", image: PROFILE_ASSETS.manjima },
  { id: "mridula", name: "MRIDULA", image: PROFILE_ASSETS.mridula },
  { id: "manesh", name: "MANESH", image: PROFILE_ASSETS.manesh },
];
