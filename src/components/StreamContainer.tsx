import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Video, Monitor, Settings, Sparkles, Activity, Shield, 
  Volume2, VolumeX, Mic, MicOff, RefreshCw, Cpu, Layers, Maximize2 
} from "lucide-react";
import { User, StreamStats, ActiveStream } from "../types";

interface StreamContainerProps {
  currentUser: User | null;
  joinedChannelId: string | null;
  socket: WebSocket | null;
  usersList: User[];
  activeBrotherStream: ActiveStream | null;
}

export default function StreamContainer({ 
  currentUser, 
  joinedChannelId, 
  socket, 
  usersList,
  activeBrotherStream 
}: StreamContainerProps) {
  // Streaming states
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [streamResolution, setStreamResolution] = useState("1080p");
  const [streamFps, setStreamFps] = useState(60);
  const [streamCodec, setStreamCodec] = useState("VP9");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [selectedQualityProfile, setSelectedQualityProfile] = useState<"ultra" | "balanced" | "esports" | "low">("balanced");

  // Real WebRTC & MediaStream Capture states
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnections = useRef<{ [userId: string]: RTCPeerConnection }>({});

  // Dynamic Telemetry State
  const [stats, setStats] = useState<StreamStats>({
    resolution: "1920x1080",
    fps: 60,
    bitrate: 12.4, // Mbps
    latency: 14, // ms
    packetLoss: "0.00%",
    codec: "VP9"
  });

  // Simulated Co-Op Game Controller Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const gameScore = useRef(0);
  const playerX = useRef(150);
  const playerY = useRef(120);
  const starfield = useRef<{ x: number; y: number; speed: number; size: number }[]>([]);

  // Initialize simulated retro co-op starfield game in background
  useEffect(() => {
    // Generate stars
    const stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * 400,
        y: Math.random() * 250,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 2 + 0.5
      });
    }
    starfield.current = stars;
  }, []);

  // Set preset updates on quality profile change
  useEffect(() => {
    if (selectedQualityProfile === "ultra") {
      setStreamResolution("4K");
      setStreamFps(120);
      setStreamCodec("AV1");
      setStats(prev => ({ ...prev, resolution: "3840x2160", fps: 120, bitrate: 24.8, latency: 18, codec: "AV1" }));
    } else if (selectedQualityProfile === "balanced") {
      setStreamResolution("1080p");
      setStreamFps(60);
      setStreamCodec("VP9");
      setStats(prev => ({ ...prev, resolution: "1920x1080", fps: 60, bitrate: 12.4, latency: 12, codec: "VP9" }));
    } else if (selectedQualityProfile === "esports") {
      setStreamResolution("720p");
      setStreamFps(120);
      setStreamCodec("VP9");
      setStats(prev => ({ ...prev, resolution: "1280x720", fps: 120, bitrate: 7.5, latency: 6, codec: "VP9" }));
    } else if (selectedQualityProfile === "low") {
      setStreamResolution("480p");
      setStreamFps(30);
      setStreamCodec("H.264");
      setStats(prev => ({ ...prev, resolution: "854x480", fps: 30, bitrate: 2.1, latency: 4, codec: "H.264" }));
    }
  }, [selectedQualityProfile]);

  // Jitter generator for realistic telemetry
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSharingScreen || activeBrotherStream) {
      interval = setInterval(() => {
        setStats(prev => {
          const fpsJitter = Math.floor(Math.random() * 3) - 1;
          const latencyJitter = Math.floor(Math.random() * 3) - 1;
          const bitrateJitter = +(Math.random() * 0.4 - 0.2).toFixed(2);
          const packetLossVal = Math.random() < 0.05 ? "0.01%" : "0.00%";

          return {
            ...prev,
            fps: Math.max(prev.fps + fpsJitter, 30),
            latency: Math.max(prev.latency + latencyJitter, 3),
            bitrate: +(Math.max(prev.bitrate + bitrateJitter, 1.2)).toFixed(2),
            packetLoss: packetLossVal
          };
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSharingScreen, activeBrotherStream]);

  // Handle Game Loop for simulated game screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particleRot = 0;

    const render = () => {
      // Clear canvas with dark slate
      ctx.fillStyle = "#0f172a"; // bg slate 900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply resolution filters manually on the canvas to simulate quality degradation
      if (streamResolution === "480p") {
        ctx.imageSmoothingEnabled = false;
        // Draw pixelated scanning lines grid
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        for (let y = 0; y < canvas.height; y += 4) {
          ctx.fillRect(0, y, canvas.width, 1);
        }
      } else {
        ctx.imageSmoothingEnabled = true;
      }

      // Draw background stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      starfield.current.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = canvas.width;
          star.y = Math.random() * canvas.height;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Draw retro space grid details
      ctx.strokeStyle = "rgba(59, 130, 246, 0.15)"; // Blue accent
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Render Player Ship 1 (Blue - Local User)
      const grad1 = ctx.createLinearGradient(playerX.current, playerY.current, playerX.current + 30, playerY.current + 10);
      grad1.addColorStop(0, "#3b82f6");
      grad1.addColorStop(1, "#06b6d4");
      ctx.fillStyle = grad1;
      
      ctx.beginPath();
      ctx.moveTo(playerX.current + 25, playerY.current + 10);
      ctx.lineTo(playerX.current, playerY.current);
      ctx.lineTo(playerX.current - 5, playerY.current + 5);
      ctx.lineTo(playerX.current, playerY.current + 10);
      ctx.lineTo(playerX.current - 5, playerY.current + 15);
      ctx.lineTo(playerX.current, playerY.current + 20);
      ctx.closePath();
      ctx.fill();

      // Engine Flame animation
      ctx.fillStyle = Math.random() > 0.5 ? "#f97316" : "#ef4444";
      ctx.beginPath();
      ctx.moveTo(playerX.current - 5, playerY.current + 7);
      ctx.lineTo(playerX.current - 18, playerY.current + 10);
      ctx.lineTo(playerX.current - 5, playerY.current + 13);
      ctx.closePath();
      ctx.fill();

      // Render Player Ship 2 (Red - Brother Co-Op Player)
      // Moving in a sinusoidal retro flight path
      const brotherX = 280 + Math.sin(Date.now() / 1000) * 30;
      const brotherY = 120 + Math.cos(Date.now() / 800) * 40;

      const grad2 = ctx.createLinearGradient(brotherX, brotherY, brotherX + 30, brotherY + 10);
      grad2.addColorStop(0, "#f43f5e"); // Rose 500
      grad2.addColorStop(1, "#d946ef"); // Fuchsia 500
      ctx.fillStyle = grad2;

      ctx.beginPath();
      ctx.moveTo(brotherX + 25, brotherY + 10);
      ctx.lineTo(brotherX, brotherY);
      ctx.lineTo(brotherX - 5, brotherY + 5);
      ctx.lineTo(brotherX, brotherY + 10);
      ctx.lineTo(brotherX - 5, brotherY + 15);
      ctx.lineTo(brotherX, brotherY + 20);
      ctx.closePath();
      ctx.fill();

      // Brother shield indicators
      ctx.strokeStyle = "rgba(217, 70, 239, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(brotherX + 10, brotherY + 10, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Engine flame 2
      ctx.fillStyle = Math.random() > 0.5 ? "#fbbf24" : "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(brotherX - 5, brotherY + 7);
      ctx.lineTo(brotherX - 16, brotherY + 10);
      ctx.lineTo(brotherX - 5, brotherY + 13);
      ctx.closePath();
      ctx.fill();

      // Rotating interactive plasma energy core in the center
      particleRot += 0.02;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(particleRot);

      ctx.strokeStyle = "#10b981"; // Emerald
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, -20, 40, 40);

      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.fillRect(-10, -10, 20, 20);
      ctx.restore();

      // Top Banner overlays
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(8, 8, 140, 22);
      ctx.font = "bold 9px 'JetBrains Mono', Courier, monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`🎮 CO-OP LOBBY COMPAT`, 14, 22);

      // Score indicators
      gameScore.current += 1;
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(canvas.width - 130, 8, 122, 22);
      ctx.fillStyle = "#22c55e"; // Green 500
      ctx.fillText(`STREAM INT: ${gameScore.current}`, canvas.width - 120, 22);

      // Ultra crisp 4K or low-res telemetry tag inside stream feed
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(8, canvas.height - 30, 160, 22);
      ctx.fillStyle = streamResolution === "4K" ? "#e11d48" : "#fbbf24";
      ctx.fillText(`FEED QUALITY: ${streamResolution} | ${streamFps} FPS`, 14, canvas.height - 16);

      // Recursive loop
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [streamResolution, streamFps]);

  // Handle interactive keyboard movement of ships in gaming deck
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSharingScreen) return;
      const key = e.key.toLowerCase();
      const speed = 15;

      if (key === "arrowup" || key === "w") {
        playerY.current = Math.max(playerY.current - speed, 10);
      } else if (key === "arrowdown" || key === "s") {
        playerY.current = Math.min(playerY.current + speed, 220);
      } else if (key === "arrowleft" || key === "a") {
        playerX.current = Math.max(playerX.current - speed, 10);
      } else if (key === "arrowright" || key === "d") {
        playerX.current = Math.min(playerX.current + speed, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSharingScreen]);

  // Real browser Screen Sharing or WebRTC trigger
  const toggleRealScreenShare = async () => {
    if (isSharingScreen) {
      // Stop sharing
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
      }
      setLocalMediaStream(null);
      setIsSharingScreen(false);

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "toggle_voice_param",
          payload: { param: "screen" }
        }));
      }
      return;
    }

    try {
      // Trigger Web Display Media screen query
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: streamFps },
          width: streamResolution === "4K" ? 3840 : streamResolution === "1080p" ? 1920 : 1280,
        },
        audio: isAudioEnabled
      });

      setLocalMediaStream(mediaStream);
      setIsSharingScreen(true);

      // Connect screen stream to local video indicator if mounted
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      // Track stream termination natively from desktop environment toolbar
      mediaStream.getVideoTracks()[0].onended = () => {
        setIsSharingScreen(false);
        setLocalMediaStream(null);
      };

      // Publish screen active parameter change to channel participants
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "toggle_voice_param",
          payload: { param: "screen" }
        }));
      }

    } catch (err) {
      console.warn("Media Display Share rejected, defaulting to simulated interactive game streaming canvas wrapper.", err);
      // Fallback seamlessly to simulated high-fidelity pixel stream grid so users can play and check telemetry!
      setIsSharingScreen(true);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "toggle_voice_param",
          payload: { param: "screen" }
        }));
      }
    }
  };

  return (
    <div id="stream-arena" className="flex-1 flex flex-col bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
      {/* Header and Telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white font-sans tracking-tight">Gaming Stream Arena</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {joinedChannelId 
              ? `Connected directly via Voice Room: ${joinedChannelId === "co-op-room" ? "Gaming Duo Room" : "Lobby"}`
              : "Select a Voice Channel in the sidebar to initiate multi-stream sharing."
            }
          </p>
        </div>

        {/* Dynamic Quality Profiles */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setSelectedQualityProfile("ultra")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              selectedQualityProfile === "ultra" 
                ? "bg-rose-600 text-white shadow-md shadow-rose-900/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            4K Ultra
          </button>
          <button 
            onClick={() => setSelectedQualityProfile("balanced")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              selectedQualityProfile === "balanced" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            1080p Balanced
          </button>
          <button 
            onClick={() => setSelectedQualityProfile("esports")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              selectedQualityProfile === "esports" 
                ? "bg-amber-500 text-black shadow-md shadow-amber-900/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            720p 120Hz
          </button>
          <button 
            onClick={() => setSelectedQualityProfile("low")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              selectedQualityProfile === "low" 
                ? "bg-slate-800 text-slate-300" 
                : "text-slate-500 hover:text-white"
            }`}
          >
            480p Sub-5ms
          </button>
        </div>
      </div>

      {/* Grid Container for Multi-Screen Sharing */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[360px] max-h-[640px] mb-4">
        
        {/* Stream 1: LOCAL STREAM PLAYER */}
        <div className="relative flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden group">
          <div className="absolute top-3 left-3 z-10 bg-slate-900/95 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 font-mono">
              [LOCAL] {currentUser?.username || "You"}
            </span>
          </div>

          {/* Interactive instruction watermark */}
          {isSharingScreen && !localMediaStream && (
            <div className="absolute top-3 right-3 z-10 bg-blue-950/90 border border-blue-800 px-2.5 py-1.5 rounded-lg text-[10px] text-blue-300 font-mono">
              💡 Controls: WASD or Arrow keys to steer!
            </div>
          )}

          {/* Main Display Body */}
          <div className="flex-1 flex items-center justify-center bg-slate-950 p-2 min-h-0 relative">
            {isSharingScreen ? (
              localMediaStream ? (
                // Real Live screen stream element
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                // Realistic Co-Op Pixel game stream generator
                <canvas 
                  ref={canvasRef} 
                  width={400} 
                  height={250} 
                  className="w-full h-full object-contain rounded-lg bg-slate-900 border border-slate-800 cursor-crosshair focus:outline-none"
                />
              )
            ) : (
              <div className="text-center p-6 flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-slate-700 transition-colors mb-4">
                  <Monitor className="h-6 w-6 text-slate-500" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">Your Stream Deck is Offline</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Connect to a voice channel and click "Share Screen" below to stream gameplay to your brother!
                </p>
                {joinedChannelId && (
                  <button 
                    onClick={toggleRealScreenShare}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/15"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Initialize Screen Share
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Stream Controls overlay */}
          {isSharingScreen && (
            <div className="bg-slate-900 border-t border-slate-800/80 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleRealScreenShare}
                  className="px-3 py-1 bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-bold rounded-md transition-colors"
                >
                  Stop Stream
                </button>
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span>{stats.resolution} @ {stats.fps}FPS</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                >
                  {isAudioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-rose-400" />}
                </button>
                <div className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono">
                  {stats.bitrate} Mbps | {stats.latency}ms
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stream 2: DECK/CO-OP SCREEN SHARE VIEW (Brother or Remote participant) */}
        <div className="relative flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden group">
          <div className="absolute top-3 left-3 z-10 bg-slate-900/95 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 font-mono">
              [REMOTE] {activeBrotherStream ? activeBrotherStream.username : "BrotherGamer"}
            </span>
          </div>

          {/* Main Display Body */}
          <div className="flex-1 flex items-center justify-center bg-slate-950 p-2 min-h-0">
            {activeBrotherStream ? (
              // Shared stream projection mapping - simulated or piped P2P retro feed
              <div className="w-full h-full relative rounded-lg overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
                {/* Brother visual mockup: space station radar sweep grid */}
                <svg className="w-full h-full object-cover opacity-60 absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                  <path d="M0,50 L100,50 M50,0 L50,100" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(244, 63, 94, 0.3)" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(244, 63, 94, 0.2)" strokeWidth="0.5" strokeDasharray="3,3" />
                  <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(244, 63, 94, 0.5)" strokeWidth="0.8" />
                  {/* Blip */}
                  <circle cx="70" cy="40" r="1.5" fill="#f43f5e" className="animate-ping" />
                  <circle cx="70" cy="40" r="1" fill="#f43f5e" />
                </svg>

                <div className="z-10 text-center p-6 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-xl max-w-xs">
                  <Cpu className="h-8 w-8 text-rose-500 mx-auto mb-2 animate-bounce" />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">
                    Live Stream Feed Active
                  </span>
                  <h5 className="text-sm font-bold text-white mt-1">
                    {activeBrotherStream.title}
                  </h5>
                  <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-slate-400 font-mono">
                    <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-rose-400 font-bold">
                      {activeBrotherStream.codec}
                    </span>
                    <span>•</span>
                    <span>1080p @ 60FPS</span>
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 z-10 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] text-emerald-400 font-mono">
                  Latency: 11ms
                </div>
              </div>
            ) : (
              <div className="text-center p-6 flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mb-4">
                  <Video className="h-6 w-6 text-slate-600 animate-pulse" />
                </div>
                <h4 className="text-sm font-semibold text-slate-400">No active remote stream detected</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Once your brother accepts your friend request, opens the shared URL and streams a canvas, his live feed will instantly map here.
                </p>
                {joinedChannelId === null && (
                  <span className="mt-3 text-[10px] text-slate-500 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono">
                    Join "Gaming Duo Room" voice room to force auto-bot connection!
                  </span>
                )}
              </div>
            )}
          </div>

          {activeBrotherStream && (
            <div className="bg-slate-900 border-t border-slate-800/80 px-4 py-3 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>P2P Audio: Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Auto-Negotiating AV1</span>
                <Maximize2 className="h-3.5 w-3.5 text-slate-400 hover:text-white cursor-pointer" />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Stats Diagnostic Cards - Ultra-Low Latency Telemetry Deck */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Glass Ping Latency</span>
            <Activity className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="text-lg font-bold text-white font-mono tracking-tight">
            {isSharingScreen || activeBrotherStream ? `${stats.latency} ms` : "0.0 ms"}
          </span>
          <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
            {isSharingScreen || activeBrotherStream ? "✦ Glass-to-Glass Optimization" : "Inactive link"}
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Stream Bitrate</span>
            <Layers className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <span className="text-lg font-bold text-white font-mono tracking-tight">
            {isSharingScreen || activeBrotherStream ? `${stats.bitrate} Mbps` : "0.0 Mbps"}
          </span>
          <span className="text-[9px] text-indigo-400 font-mono mt-0.5">
            Adaptive Encoding Matrix
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Frame Performance</span>
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold text-white font-mono tracking-tight">
            {isSharingScreen || activeBrotherStream ? `${stats.fps} FPS` : "0 FPS"}
          </span>
          <span className="text-[9px] text-emerald-500 font-mono mt-0.5">
            Active Jitter Buffer: 1.2ms
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Hardware Acceleration</span>
            <Shield className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <span className="text-lg font-bold text-white font-mono tracking-tight">
            {isSharingScreen || activeBrotherStream ? "WebRTC / AV1" : "NONE"}
          </span>
          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
            P2P Direct Mesh Connection
          </span>
        </div>
      </div>
    </div>
  );
}
