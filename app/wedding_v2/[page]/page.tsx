import { notFound } from "next/navigation";
import { Botanical, pages, Shell } from "../design";
import styles from "../wedding-v2.module.css";

export function generateStaticParams() { return pages.map(p => ({page:p.slug})); }
export async function generateMetadata({params}:{params:Promise<{page:string}>}) { const {page}=await params; return {title:pages.find(p=>p.slug===page)?.label ?? "The Wedding",robots:{index:false,follow:false}}; }
export default async function TemplatePage({params}:{params:Promise<{page:string}>}) {
  const {page}=await params;
  const item=pages.find(p=>p.slug===page);
  if(!item) notFound();
  return <Shell><section className={styles.subHero}><span className={styles.overline}>THE WEDDING</span><h1>{item.label}</h1><span className={styles.divider} aria-hidden="true"/></section>
    {item.sections.length ? <div className={styles.emptySections}>{item.sections.map(label=><section key={label}><h2>{label}</h2></section>)}</div> : <div className={styles.emptyArt} aria-hidden="true"><Botanical className={styles.smallBotanical}/></div>}
  </Shell>;
}
