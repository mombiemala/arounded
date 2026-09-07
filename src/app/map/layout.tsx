import Navigation from "@/src/components/Navigation";

// The map is an immersive dark experience in every theme (Mapbox dark tiles),
// so this whole route forces the dark palette — nav chrome included.
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="min-h-screen bg-ground text-ink">
      <Navigation />
      {children}
    </div>
  );
}
