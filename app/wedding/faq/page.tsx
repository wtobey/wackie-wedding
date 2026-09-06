import type { Metadata } from "next";
import { weddingFaqs } from "@/data/wedding";
import styles from "../wedding.module.css";

export const metadata: Metadata = { title: "FAQ" };

export default function WeddingFaq() {
  return <div className={styles.pageWrap}>
    <div className={styles.pageIntro}>
      <p className={styles.eyebrow}>FAQ</p>
      <h1 id="faq-title">Questions & answers</h1>
    </div>
    <section className={styles.faqContent} aria-labelledby="faq-title">
      <div className={styles.transportNotes}>
        {weddingFaqs.map((faq) => <section key={faq.question}>
          <h2>{faq.question}</h2>
          <p>{faq.answer}</p>
        </section>)}
      </div>
    </section>
  </div>;
}
