import Image from "next/image";

/**
 * The maroon header the front door opens on.
 *
 * The institute's name is spelled out in full above the exam's, once, at the
 * top of the app — "Kabitirtha Institute of Development & Studies", never an
 * initialism a child has to decode. SET is what they came for; KIDS is who is
 * asking.
 */
export default function Crest() {
  return (
    <header className="app-crest">
      <Image
        src="/kids-icon.png"
        alt=""
        width={120}
        height={120}
        className="app-crest__watermark"
        aria-hidden="true"
      />
      <Image src="/kids-icon.png" alt="KIDS" width={38} height={38} className="app-crest__mark" priority />
      <span className="app-crest__institute">Kabitirtha Institute of Development &amp; Studies</span>
      <span className="app-crest__title">Students Evaluation Test</span>
    </header>
  );
}
