import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Gamepad2, Users, Radio, MessageSquare, Compass, Settings, 
  Terminal, ShieldCheck, HelpCircle, ArrowRight, Sparkles, AlertTriangle 
} from "lucide-react";
import { User, TextChannel, VoiceChannel, Message, FriendRequest, ActiveStream } from "./types";
import Sidebar from "./components/Sidebar";
import ChannelChat from "./components/ChannelChat";
import StreamContainer from "./components/StreamContainer";
import FriendsTab from "./components/FriendsTab";

export default function App() {
  // Login Authentication States
  const [username, setUsername] = useState("");
  const [preferredId, setPreferredId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live Sync States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [textChannels, setTextChannels] = useState<TextChannel[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<[string, string][]>([]);
  
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<"channels" | "friends" | "dms">("channels");
  const [selectedChannelId, setSelectedChannelId] = useState("general");
  const [selectedDMUserId, setSelectedDMUserId] = useState<string | null>(null);
  const [joinedVoiceChannelId, setJoinedVoiceChannelId] = useState<string | null>(null);
  const [activeBrotherStream, setActiveBrotherStream] = useState<ActiveStream | null>(null);
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);

  // Active WebSocket state
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Login handler establishing WebSockets
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);

    // Compute dynamic socket url binding to any hosted or local domain (http -> ws, https -> wss)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsSocketConnected(true);
      // Dispatch login handshake back to server
      ws.send(JSON.stringify({
        type: "login",
        payload: {
          username: username.trim(),
          preferredId: preferredId || undefined
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        switch (type) {
          case "login_success": {
            setCurrentUser(payload.currentUser);
            setUsersList(payload.users);
            setTextChannels(payload.channels);
            setVoiceChannels(payload.voiceChannels);
            setMessages(payload.messages);
            setFriendRequests(payload.friendRequests);
            setFriendships(payload.friendships);
            
            setIsLoggedIn(true);
            setIsLoading(false);
            break;
          }

          case "user_list_update": {
            setUsersList(payload.users);
            // Sync current user's profile state if updated by server voice toggles
            if (currentUser) {
              const syncedMe = payload.users.find((u: User) => u.id === currentUser.id);
              if (syncedMe) {
                setCurrentUser(syncedMe);
                if (syncedMe.voiceState) {
                  setJoinedVoiceChannelId(syncedMe.voiceState.channelId);
                } else {
                  setJoinedVoiceChannelId(null);
                }
              }
            }
            break;
          }

          case "chat_msg_receive": {
            setMessages(prev => {
              // Deduplicate incoming messages to prevent duplicate render races
              if (prev.some(m => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
            break;
          }

          case "private_msg_receive": {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
            break;
          }

          case "friend_request_sent": {
            setFriendRequestError(null);
            setFriendRequests(prev => [...prev, payload.request]);
            break;
          }

          case "friend_request_receive": {
            setFriendRequests(prev => [...prev, payload.request]);
            break;
          }

          case "friend_request_error": {
            setFriendRequestError(payload.error);
            break;
          }

          case "friend_request_accepted": {
            setFriendships(payload.friendships);
            setFriendRequests(prev => prev.filter(r => r.id !== payload.requestId));
            break;
          }

          case "friend_request_declined": {
            setFriendRequests(prev => prev.filter(r => r.id !== payload.requestId));
            break;
          }

          case "brother_stream_start": {
            setActiveBrotherStream({
              userId: payload.userId,
              username: payload.username,
              title: payload.title,
              resolution: payload.resolution,
              fps: payload.fps,
              bitrate: payload.bitrate,
              codec: payload.codec
            });
            break;
          }

          // Real P2P signaling routing (ICE, Offers, Answers)
          case "rtc_signal_receive": {
            // Future-ready placeholder for full RTC connection mapping if they configure direct links
            break;
          }

          default:
            break;
        }

      } catch (err) {
        console.error("Failed to process WebSocket event payload:", err);
      }
    };

    ws.onclose = () => {
      setIsSocketConnected(false);
      setIsLoggedIn(false);
      setIsLoading(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket connection failure:", err);
      setIsLoading(false);
    };

    setSocket(ws);
  };

  // Dispatch Chat Message Event over WebSocket
  const sendTextMessage = useCallback((content: string, channelId: string | null, recipientId: string | null) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    if (recipientId) {
      socket.send(JSON.stringify({
        type: "private_msg",
        payload: { recipientId, content }
      }));
    } else {
      socket.send(JSON.stringify({
        type: "chat_msg",
        payload: { channelId, content }
      }));
    }
  }, [socket]);

  // Dispatch Friend Request over ws
  const sendFriendRequest = useCallback((targetUsername: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    setFriendRequestError(null);
    socket.send(JSON.stringify({
      type: "send_friend_request",
      payload: { targetUsername }
    }));
  }, [socket]);

  // Accept request handshake
  const acceptFriendRequest = useCallback((requestId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "accept_friend_request",
      payload: { requestId }
    }));
  }, [socket]);

  // Decline request
  const rejectFriendRequest = useCallback((requestId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "reject_friend_request",
      payload: { requestId }
    }));
  }, [socket]);

  // Voice and Video state toggles
  const joinVoiceChannel = useCallback((channelId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "join_voice",
      payload: { channelId }
    }));
  }, [socket]);

  const leaveVoiceChannel = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "leave_voice"
    }));
    setJoinedVoiceChannelId(null);
    setActiveBrotherStream(null);
  }, [socket]);

  const toggleParam = useCallback((param: 'mute' | 'deaf' | 'screen') => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "toggle_voice_param",
      payload: { param }
    }));
  }, [socket]);

  // Auto clean screen share states on refresh
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  // Quick switch logins or logout option
  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    setUsername("");
  };

  if (!isLoggedIn) {
    /* IMMERSIVE STREAM AND CHAT HUB LAUNCH PANEL */
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract glowing matrix starscape background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e1b4b,transparent_60%)] opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Dynamic Launch Card */}
        <div className="relative w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl shadow-blue-500/5 select-none text-center">
          
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
            <Gamepad2 className="h-6 w-6 text-white" />
          </div>

          <p className="text-[10px] tracking-widest font-bold text-blue-400 uppercase font-mono mb-1.5">
            Ultra-Low Latency Co-Op Deck
          </p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            Screen Share & Game Chat
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto mb-6">
            Log in to stream retro screens in 4K resolution, manage friends list, and private chat instantaneously with zero latency.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block mb-1.5 pl-0.5">
                Your Gamer Tag
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Nickname (e.g. ProSlayer)"
                maxLength={18}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-700"
              />
            </div>

            {/* Peer selection quick mock buttons */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-widest block mb-2 pl-0.5">
                Quick Select Profiles
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setUsername("Me") }}
                  className="px-3 py-2 bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 rounded-lg text-slate-300 text-xs font-medium font-mono transition-colors text-center"
                >
                  Me (Player 1)
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setUsername("Brother");
                    setPreferredId("brother-p2-id"); 
                  }}
                  className="px-3 py-2 bg-slate-150/10 hover:bg-slate-900 border border-indigo-500/20 rounded-lg text-indigo-300 text-xs font-semibold font-mono transition-colors text-center"
                >
                  Brother (Player 2)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 mt-6 active:scale-95"
            >
              {isLoading ? (
                <span>Booting Codecs...</span>
              ) : (
                <>
                  <span>Initialize Co-Op Arena</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Connected anywhere disclaimer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 bg-slate-950 px-3 py-2 rounded-lg border border-slate-850">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Ready for real-time multiplayer connections across computers!</span>
          </div>
        </div>
      </div>
    );
  }

  /* FULL DISCORD-LIKE WORKSPACE DECK */
  return (
    <div className="h-screen w-screen flex bg-slate-950 overflow-hidden font-sans select-none">
      
      {/* Sidebar navigation */}
      <Sidebar
        currentUser={currentUser}
        usersList={usersList}
        textChannels={textChannels}
        voiceChannels={voiceChannels}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedChannelId={selectedChannelId}
        setSelectedChannelId={setSelectedChannelId}
        joinedVoiceChannelId={joinedVoiceChannelId}
        joinVoiceChannel={joinVoiceChannel}
        leaveVoiceChannel={leaveVoiceChannel}
        selectedDMUserId={selectedDMUserId}
        setSelectedDMUserId={setSelectedDMUserId}
        toggleParam={toggleParam}
        onLogout={handleLogout}
      />

      {/* Main viewport central body split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {activeTab === "friends" ? (
          /* MANAGING FRIENDS VIEWPORT */
          <FriendsTab
            currentUser={currentUser}
            usersList={usersList}
            friendRequests={friendRequests}
            friendships={friendships}
            sendFriendRequest={sendFriendRequest}
            acceptFriendRequest={acceptFriendRequest}
            rejectFriendRequest={rejectFriendRequest}
            setSelectedDMUserId={setSelectedDMUserId}
            friendRequestError={friendRequestError}
          />
        ) : selectedDMUserId ? (
          /* SINGLE DM PRIVATE MESSAGE WRAPPER */
          <ChannelChat
            currentUser={currentUser}
            selectedChannelId=""
            selectedDMUserId={selectedDMUserId}
            messages={messages}
            usersList={usersList}
            sendTextMessage={sendTextMessage}
          />
        ) : (
          /* CO-OP STREAMS + ASSOCIATED CHANNELS WRAPPER */
          <>
            {/* Ultra-low latency video stream player */}
            <StreamContainer
              currentUser={currentUser}
              joinedChannelId={joinedVoiceChannelId}
              socket={socket}
              usersList={usersList}
              activeBrotherStream={activeBrotherStream}
            />

            {/* Associated live text channel chat logs panel */}
            <ChannelChat
              currentUser={currentUser}
              selectedChannelId={selectedChannelId}
              selectedDMUserId={null}
              messages={messages}
              usersList={usersList}
              sendTextMessage={sendTextMessage}
            />
          </>
        )}

      </div>
    </div>
  );
}
