import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StudyAir — Official 9:16 App Trailer",
  description:
    "Trailer visual 9:16 StudyAir v2: Penjadwal belajar cerdas untuk pelajar SMP dan SMA Indonesia (1080x1920).",
};

export default function TrailerPage() {
  return (
    <div className="relative flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#03060C]">
      <iframe
        src="/trailer/index.html"
        title="StudyAir 9:16 Official App Trailer"
        className="w-full h-full border-none block"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
