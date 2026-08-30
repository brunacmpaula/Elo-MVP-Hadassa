import { useEffect, useRef, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer, VideoPausedContext } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  scene1: 4500, // Discovery
  scene2: 4500, // Follow
  scene3: 4500, // Pray
  scene4: 5000, // Offline
  scene5: 4500, // Outro
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  scene1: Scene1,
  scene2: Scene2,
  scene3: Scene3,
  scene4: Scene4,
  scene5: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const offsets: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    offsets[key] = cumulativeMs / 1000;
    cumulativeMs += duration;
  }
  return offsets;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.45;
    if (paused) {
      audio.pause();
      return;
    }

    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (
        Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC
      ) {
        audio.currentTime = targetTime;
      }
    }

    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
    <div className="w-full h-screen overflow-hidden bg-slate-900 text-white font-sans relative flex items-center justify-center">
      {/* Persistent Background */}
      <motion.div 
        className="absolute inset-0 z-0 bg-gradient-to-br from-[#0c1b2c] via-[#112a46] to-[#0d1624]"
        animate={{
          background: sceneIndex === 4 
            ? 'linear-gradient(to bottom right, #091524, #0b1a2b, #091524)'
            : 'linear-gradient(to bottom right, #0c1b2c, #112a46, #0d1624)'
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      
      {/* Noise overlay */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none opacity-20 mix-blend-overlay"
        style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }}
      ></div>

      {/* Cross-scene persistent accents */}
      <motion.div
        className="absolute w-[60vw] h-[60vw] rounded-full blur-[100px] z-0 opacity-30 mix-blend-screen pointer-events-none"
        animate={{
          x: sceneIndex === 0 ? '-30vw' : sceneIndex === 2 ? '50vw' : sceneIndex === 4 ? '0vw' : '-10vw',
          y: sceneIndex === 0 ? '-10vh' : sceneIndex === 2 ? '-30vh' : sceneIndex === 4 ? '0vh' : '20vh',
          scale: sceneIndex === 4 ? 1.5 : 1,
          backgroundColor: sceneIndex === 1 ? '#0D6F9D' : sceneIndex === 3 ? '#F37F38' : '#1e3a8a'
        }}
        transition={{ duration: 3, ease: [0.25, 1, 0.5, 1] }}
      />

      <div className="relative z-20 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
    </VideoPausedContext.Provider>
  );
}
