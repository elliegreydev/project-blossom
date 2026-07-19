import Link from "next/link";
import styles from "../blog/blog.module.css";

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>About</span>
          <h1>Hi, I&apos;m Ellie.</h1>
        </header>

        <div className={styles.body}>
          I&apos;m trans (male to female), and I&apos;m still learning how to code, Blossom&apos;s
          one of the biggest things I&apos;ve built so far. This isn&apos;t some polished corporate
          project. It&apos;s made by someone who&apos;s actually lived through a lot of what this
          app is trying to help with.
          {"\n\n"}
          I built Blossom because I wanted something that actually felt like it was on your side.
          A lot of apps in this space either treat your data like something to sell, or they&apos;re
          built by people who&apos;ve never really had to think about what it means to track
          something this personal.
          {"\n\n"}
          Blossom is local-first by default. Most of what you enter never leaves your device
          unless you choose to turn sync on yourself. Nothing here scores you, ranks you, or tells
          you if you&apos;re doing it &quot;right.&quot; No streaks, no pass or fail, no comparing
          yourself to anyone else. You move at your own pace, and the app just quietly holds what
          you give it.
          {"\n\n"}
          Right now Blossom&apos;s in beta, so things might change, break, or get rebuilt if
          they&apos;re not working. If you&apos;re testing it with me, thank you, genuinely. Every
          bit of feedback shapes what this actually becomes.
          {"\n\n"}
          Want to reach me directly? I&apos;m around on{" "}
          <a href="https://discord.gg/jD3yS2HN7s" target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          , or you can leave feedback right in the app.
          {"\n\n"}— Ellie
        </div>
      </div>
    </main>
  );
}
