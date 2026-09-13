import styles from "./OpeningScreen.module.css";

/**
 * What Blossom shows while it is opening.
 *
 * The important thing about this component is not what it looks like, it is
 * where it is allowed to be rendered from: it holds no state, reads nothing,
 * and is not a client component, so it renders on the server and arrives as
 * part of the HTML. That is the whole point of it.
 *
 * Both the app shell and onboarding used to return null while they waited on
 * the local database, which meant the page they served had an empty body and
 * the phone had nothing to draw until the entire bundle had downloaded and
 * hydrated. On a phone that is seconds of plain white. Anything rendered here
 * instead is on screen almost immediately, because it needs no JavaScript at
 * all.
 *
 * So: do not add state, effects, or props that depend on the client to this
 * file. The moment it needs any of those it stops being in the HTML and the
 * white screen comes back.
 */
export default function OpeningScreen() {
  return (
    <main className={styles.loadingScreen} aria-live="polite" aria-label="Opening Blossom">
      <div className={styles.loadingMarkWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-loader.png" alt="" width={112} height={112} />
      </div>
      <p className={styles.loadingWordmark}>Blossom</p>
      <p className={styles.loadingStatus}>
        Opening your space
        <span className={styles.loadingDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </p>
    </main>
  );
}
