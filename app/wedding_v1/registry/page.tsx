import type { Metadata } from "next";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Registry" };

export default function WeddingRegistry() {
  return <div className={styles.pageWrap}>
    <div className={styles.pageIntro}>
      <h1>Registry</h1>
      <p className={styles.introText}>Your presence at our celebration is all we ask of our guests, especially since many of you are traveling quite far to spend time with us. If you would like to give something more, we&apos;ve registered at the stores linked below.</p>
      <a className={styles.textLink} href="https://www.williams-sonoma.com/registry/82qgb5s5d8/registry-list.html" target="_blank" rel="noreferrer" style={{ marginTop: "24px" }}>Williams Sonoma</a>
    </div>
  </div>;
}
