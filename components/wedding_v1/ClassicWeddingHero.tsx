import Doodle from "./Doodle";
import FallingWeddingPhotos from "./FallingWeddingPhotos";
import { wedding } from "@/data/wedding_v1";
import styles from "@/app/wedding_v1/wedding.module.css";

// Previous hero, retained so the floating-invitation experiment is easy to undo.
export default function ClassicWeddingHero() {
  return <FallingWeddingPhotos>
    <div className={styles.heroTitle} data-photo-exclusion>
      <h1 id="welcome-title"><span>Jackie &amp; Will</span>{" "}<span className={styles.heroAnnouncement}>Are getting married</span></h1>
      <p className={styles.heroSubtitle}>Let’s get Wackie</p>
    </div>
    <div className={styles.heroBottom}>
      <div className={styles.heroDetails} data-photo-exclusion>
        <p className={styles.heroDate}>{wedding.date}</p>
        <p>Dawn Ranch<br/>Guerneville, California</p>
        <Doodle kind="river" className={styles.heroRiver}/>
      </div>
      <div className={styles.heroRight}><Doodle kind="sun" className={styles.heroSun}/></div>
    </div>
    <div className={styles.heroFoot}><span>Good company. Great weekend.</span><a href="#weekend" aria-label="Scroll to the weekend">↓</a></div>
  </FallingWeddingPhotos>;
}
