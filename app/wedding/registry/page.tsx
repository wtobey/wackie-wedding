import type { Metadata } from "next";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "Registry" };

export default function WeddingRegistry() {
  return <div className={styles.pageWrap}>
    <div className={styles.pageIntro}>
      <h1>Registry</h1>
      <p className={styles.introText}>We’ll share our registry here soon.</p>
    </div>
  </div>;
}
