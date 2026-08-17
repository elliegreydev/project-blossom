"use client";

import { isHqDevEntry } from "@/lib/devAccess";
import styles from "./TestBuildBanner.module.css";

/**
 * A permanent strip saying this is not the real app.
 *
 * The code on the door explains this properly, but somebody let in once stays
 * let in for a month, and a tester who comes back a fortnight later will not
 * remember which of the two Blossoms they have open. The failure this exists
 * to prevent is somebody putting real information about their transition into
 * a database that gets wiped without warning.
 *
 * Not dismissible, on purpose. The one time it matters is the time somebody
 * has forgotten, and a banner they dismissed a fortnight ago is not there to
 * remind them.
 *
 * Uses isHqDevEntry rather than the gate's own check because that one reads a
 * server-only variable. Both need the build to point at a dev database, so
 * neither can appear on production.
 */
export default function TestBuildBanner() {
  if (!isHqDevEntry()) return null;

  return (
    <div className={styles.banner} role="note">
      <span className={styles.dot} aria-hidden="true" />
      <span>
        <strong>Test version.</strong> Things break here on purpose. Please don&apos;t enter
        anything real.
      </span>
      <a className={styles.link} href="https://projectblossom.net">
        Real app
      </a>
    </div>
  );
}
