export const metadata = {
  title: "StudyAir — Official 9:16 App Trailer",
  description: "School Planner & Penjadwal Belajar Pintar Siswa Indonesia (1080x1920 Vertical Trailer)",
};

export default function TrailerPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#03060C" }}>
      <iframe
        src="/trailer/index.html"
        title="StudyAir 9:16 Official App Trailer"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
