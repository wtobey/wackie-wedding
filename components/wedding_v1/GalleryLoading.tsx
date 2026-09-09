import styles from './gallery-loading.module.css';

export default function GalleryLoading() {
  return <div className={styles.loading} role="status" aria-label="Loading photos">
    <div className={styles.album} aria-hidden="true">
      {[0, 1, 2].map(index => <div className={styles.polaroid} key={index}>
        <div className={styles.photo}/><div className={styles.caption}/>
      </div>)}
    </div>
    <p className={styles.label} aria-hidden="true">Opening the album<span>…</span></p>
  </div>;
}
