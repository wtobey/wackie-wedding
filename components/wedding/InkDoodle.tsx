import Image from "next/image";
import styles from "@/app/wedding/wedding.module.css";

type InkDoodleKind = "sunglasses" | "cheers" | "smores" | "inner-tube" | "bathing-shorts" | "flip-flops";

export default function InkDoodle({ kind, className = "", size = 80 }: { kind: InkDoodleKind; className?: string; size?: number }) {
  return <Image src={`/wedding-doodle-${kind}.png`} alt="" width={1254} height={1254} sizes={`${size}px`} className={`${styles.inkDoodle} ${className}`} draggable={false}/>;
}
