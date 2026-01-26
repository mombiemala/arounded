import Navigation from "@/src/components/Navigation";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      {children}
    </div>
  );
}