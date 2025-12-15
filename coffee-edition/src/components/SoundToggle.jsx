// src/components/SoundToggle.jsx
import React, { useState, useRef, useEffect } from 'react';

const SoundToggle = () => {
  const tracks = [
    {
      id: 'ambient',
      name: 'Wuse Tu',
      artist: 'Zaylevelten ft.Mavo',
      cover: '/assets/images/tenski.jpg',
      src: '/assets/sounds/ambient.mp3'
    },
    {
      id: 'jazz',
      name: 'Radiance',
      artist: 'Dave ft.Tems',
      cover: '/assets/images/radiance.jpg',
      src: '/assets/sounds/sound2.mp3'
    },
    {
      id: 'lofi',
      name: 'Overseas',
      artist: 'sheff g , sleepy hallow , jay bezzy',
      cover: '/assets/images/hallow.jpg',
      src: '/assets/sounds/sound3.mp3'
    }
  ];

  const [isPlaying, setIsPlaying] = useState(false);
  const [waveform, setWaveform] = useState(Array(4).fill(0));
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize AudioContext once
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  // Handle audio setup and playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const currentTrack = tracks[currentTrackIndex];
    audio.src = currentTrack.src;

    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyserRef.current = analyser;
    }

    if (!sourceRef.current) {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
      sourceRef.current = source;
    }

    // Set fixed volume (e.g., 70%)
    const DEFAULT_VOLUME = 0.7;
    audio.volume = DEFAULT_VOLUME;

    if (isPlaying) {
      ctx.resume();
      audio.currentTime = 6; // Skip first 6 seconds to avoid intro tags
      audio.play().catch(err => {
        console.warn("Audio play blocked:", err);
        setIsPlaying(false);
      });
      startVisualizer();
    } else {
      audio.pause();
      stopVisualizer();
    }

    return () => stopVisualizer();
  }, [isPlaying, currentTrackIndex]);

  // Visualizer
  const startVisualizer = () => {
    const animate = () => {
      if (analyserRef.current) {
        const analyser = analyserRef.current;
        analyser.getByteFrequencyData(analyser.dataArray);

        const bars = [];
        const len = analyser.dataArray.length;
        for (let i = 0; i < 4; i++) {
          const idx = Math.floor(i * (len / 4));
          bars.push(analyser.dataArray[idx] / 255);
        }
        setWaveform([...bars]);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const stopVisualizer = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  };

  const togglePlay = () => setIsPlaying(prev => !prev);

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    if (isPlaying) {
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    }
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    if (isPlaying) {
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    }
  };

  const currentTrack = tracks[currentTrackIndex];

  return (
    <div
      className="sound-toggle"
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: '6px 12px',
        borderRadius: '12px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 50,
        boxShadow: '0 0 12px rgba(224, 185, 148, 0.2)',
        maxWidth: '90vw',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Previous Track Button */}
      <button
        onClick={prevTrack}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <svg width="10" height="10" fill="#e0b994" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>

      {/* Cover Art */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid #e0b994',
          backgroundImage: `url(${currentTrack.cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          flexShrink: 0,
        }}
      />

      {/* Track Info */}
      <div style={{ color: '#e0b994', fontSize: '11px', textAlign: 'left', minWidth: '80px' }}>
        <div style={{ fontWeight: 500, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentTrack.name}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentTrack.artist}
        </div>
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: isPlaying ? '#e0b994' : 'rgba(255,255,255,0.1)',
          border: '2px solid #e0b994',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {isPlaying ? (
          <svg width="14" height="14" fill="black" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="black" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Next Track Button */}
      <button
        onClick={nextTrack}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <svg width="10" height="10" fill="#e0b994" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12z" />
        </svg>
      </button>

      {/* Visualizer (4 bars) */}
      <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '36px' }}>
        {waveform.map((h, i) => (
          <div
            key={i}
            style={{
              width: '5px',
              height: `${Math.max(4, h * 32)}px`,
              background: '#e0b994',
              borderRadius: '2px',
              transition: 'height 0.1s ease-out',
            }}
          />
        ))}
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} preload="auto" loop />
    </div>
  );
};

export default SoundToggle;