import ModelScene from "./components/ModelScene";
import SoundToggle from "./components/SoundToggle";

export default function App() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* 3D background */}
      <ModelScene />

      {/* UI Layer: Title */}
      <div className="absolute top-10 left-5 z-20 text-white font-bold text-4xl drop-shadow-lg">
        COFFEE EDITION ☕
      </div>

      {/* Music Control */}
      <SoundToggle 
        audioSrc="/assets/audio/ambient.mp3" 
        volume={0.7} 
      />
    </div>
  );
}