import { Suspense } from "react";
import MapView from "@/src/components/MapView";

function MapViewWrapper() {
  return <MapView />;
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-ground" />}>
      <MapViewWrapper />
    </Suspense>
  );
}
