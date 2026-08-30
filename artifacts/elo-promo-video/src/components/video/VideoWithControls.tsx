import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { SCENE_DURATIONS, VideoTemplate } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  scene1: {
    title: 'Descoberta',
    filePath: 'src/components/video/video_scenes/Scene1.tsx',
  },
  scene2: {
    title: 'Acompanhamento',
    filePath: 'src/components/video/video_scenes/Scene2.tsx',
  },
  scene3: {
    title: 'Oração',
    filePath: 'src/components/video/video_scenes/Scene3.tsx',
  },
  scene4: {
    title: 'Experiência offline',
    filePath: 'src/components/video/video_scenes/Scene4.tsx',
  },
  scene5: {
    title: 'Encerramento',
    filePath: 'src/components/video/video_scenes/Scene5.tsx',
  },
};

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;

  window.parent.postMessage(
    {
      type: 'REPLIT_VIDEO_SCENE_SELECTED',
      payload: {
        sceneIndex: index,
        sceneCount: sceneKeys.length,
        sceneTitle: details.title,
        filePath: details.filePath,
        lineNumber: 1,
      },
    },
    '*',
  );
}

function formatPlaybackTime(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;

    const start = performance.now();
    const interval = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + (performance.now() - start));
    }, PROGRESS_TICK_MS);

    return () => {
      window.clearInterval(interval);
      elapsedBaseRef.current += performance.now() - start;
    };
  }, [tick, paused]);

  const progress =
    activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(
    totalDuration,
    activeStartTime + Math.min(elapsed, activeDuration),
  );

  return (
    <>
      <div className="flex flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => {
          const isActive = index === activeIndex;
          const fill = isActive ? progress * 100 : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onJumpTo(index)}
              className="relative h-3 min-h-[12px] flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/25"
              aria-label={`Ir para a cena ${index + 1}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-[width] duration-100"
                style={{ width: `${fill}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="shrink-0 font-mono text-xl tabular-nums text-white/60">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      <div
        className="min-w-[11ch] shrink-0 text-right font-mono text-xl tabular-nums text-white/80"
        role="timer"
        aria-label={`Tempo ${formatPlaybackTime(totalElapsed)} de ${formatPlaybackTime(totalDuration)}`}
      >
        {formatPlaybackTime(totalElapsed)} / {formatPlaybackTime(totalDuration)}
      </div>
    </>
  );
}

function ControlBar({
  visible,
  collapsed,
  locked,
  paused,
  muted,
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  onTogglePause,
  onToggleLock,
  onToggleMuted,
  onJumpTo,
  onToggleCollapsed,
}: {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  paused: boolean;
  muted: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  onTogglePause: () => void;
  onToggleLock: () => void;
  onToggleMuted: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
}) {
  const buttonClass =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white';

  return (
    <div
      className={`flex items-center gap-3 bg-black/55 px-5 py-4 backdrop-blur-sm transition-all duration-200 ease-out ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={onTogglePause}
        className={buttonClass}
        title={paused ? 'Reproduzir' : 'Pausar'}
        aria-label={paused ? 'Reproduzir' : 'Pausar'}
      >
        {paused ? <Play className="h-8 w-8" /> : <Pause className="h-8 w-8" />}
      </button>

      <button
        type="button"
        onClick={onToggleLock}
        className={`${buttonClass} ${
          locked ? 'bg-white/15 text-white hover:bg-white/25' : ''
        }`}
        title={locked ? 'Repetir cena: ativo' : 'Repetir cena: inativo'}
        aria-label={locked ? 'Repetir cena: ativo' : 'Repetir cena: inativo'}
        aria-pressed={locked}
      >
        <Repeat className="h-8 w-8" />
      </button>

      <button
        type="button"
        onClick={onToggleMuted}
        className={buttonClass}
        title={muted ? 'Ativar som' : 'Silenciar'}
        aria-label={muted ? 'Ativar som' : 'Silenciar'}
        aria-pressed={muted}
      >
        {muted ? (
          <VolumeX className="h-8 w-8" />
        ) : (
          <Volume2 className="h-8 w-8" />
        )}
      </button>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <PlaybackStatus
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        activeStartTime={activeStartTime}
        totalDuration={totalDuration}
        tick={tick}
        paused={paused}
        onJumpTo={onJumpTo}
      />

      <button
        type="button"
        onClick={onToggleCollapsed}
        className={buttonClass}
        title={collapsed ? 'Mostrar controles' : 'Ocultar controles'}
        aria-label={collapsed ? 'Mostrar controles' : 'Ocultar controles'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronUp className="h-10 w-10" />
        ) : (
          <ChevronDown className="h-10 w-10" />
        )}
      </button>
    </div>
  );
}

export default function VideoWithControls() {
  const isIframed =
    typeof window !== 'undefined' && window.self !== window.top;
  const {
    sceneKeys,
    activeIndex,
    locked,
    paused,
    mountKey,
    tick,
    durations,
    activeDuration,
    activeStartTime,
    totalDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
    togglePause,
  } = useSceneControls(SCENE_DURATIONS);

  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handleJumpTo = useCallback(
    (index: number) => {
      jumpTo(index);
      announceSceneSelection(index, sceneKeys);
    },
    [jumpTo, sceneKeys],
  );

  useEffect(() => {
    if (!paused) return;
    const frozen = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [paused]);

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') setHovering(true);
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') setHovering(false);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
    },
    [collapsed],
  );

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      if (!value) {
        setHovering(false);
        setTapPinned(false);
      }
      return !value;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (
        sensorRef.current &&
        !sensorRef.current.contains(event.target as Node)
      ) {
        setTapPinned(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () =>
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  const barVisible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative h-screen w-full">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        paused={paused}
        muted={muted}
        onSceneChange={onSceneChange}
      />

      <div
        ref={sensorRef}
        className="absolute inset-x-0 bottom-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="w-full flex-1" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={locked}
          paused={paused}
          muted={muted}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          activeStartTime={activeStartTime}
          totalDuration={totalDuration}
          tick={tick}
          onTogglePause={togglePause}
          onToggleLock={toggleLock}
          onToggleMuted={() => setMuted((value) => !value)}
          onJumpTo={handleJumpTo}
          onToggleCollapsed={handleToggleCollapsed}
        />
      </div>
    </div>
  );
}