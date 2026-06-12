import React from "react";
import { 
  Hash, Volume2, Mic, MicOff, Headphones, Monitor, LogOut, 
  Gamepad2, Users, Radio, MessageSquare, Compass, Settings, Zap 
} from "lucide-react";
import { User, TextChannel, VoiceChannel } from "../types";

interface SidebarProps {
  currentUser: User | null;
  usersList: User[];
  textChannels: TextChannel[];
  voiceChannels: VoiceChannel[];
  activeTab: "channels" | "friends" | "dms";
  setActiveTab: (tab: "channels" | "friends" | "dms") => void;
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
  joinedVoiceChannelId: string | null;
  joinVoiceChannel: (channelId: string) => void;
  leaveVoiceChannel: () => void;
  selectedDMUserId: string | null;
  setSelectedDMUserId: (id: string | null) => void;
  toggleParam: (param: 'mute' | 'deaf' | 'screen') => void;
  onLogout?: () => void;
}

export default function Sidebar({
  currentUser,
  usersList,
  textChannels,
  voiceChannels,
  activeTab,
  setActiveTab,
  selectedChannelId,
  setSelectedChannelId,
  joinedVoiceChannelId,
  joinVoiceChannel,
  leaveVoiceChannel,
  selectedDMUserId,
  setSelectedDMUserId,
  toggleParam,
  onLogout
}: SidebarProps) {
  // Filter active friends in direct messages (anyone with DM history or active friendships on the server)
  const dmUsers = usersList.filter(u => u.id !== currentUser?.id && u.status !== 'offline');

  return (
    <div id="left-column" className="w-[240px] md:w-[260px] flex flex-col bg-slate-950 border-r border-slate-900 select-none">
      
      {/* Server Header */}
      <div className="h-14 border-b border-slate-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-blue-500" />
          <span className="font-bold text-sm text-white tracking-wide font-sans">NEXUS CO-OP</span>
        </div>
        <div className="bg-blue-600/10 border border-blue-500/20 text-blue-400 p-1 rounded-md text-[10px] font-mono font-extrabold flex items-center gap-1">
          <Zap className="h-2.5 w-2.5" />
          <span>HQ</span>
        </div>
      </div>

      {/* Primary Category Quick Tabs */}
      <div className="p-2.5 flex flex-col gap-1 border-b border-slate-900/40">
        <button 
          onClick={() => { setActiveTab("channels"); setSelectedDMUserId(null); }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold font-sans tracking-wide transition-all ${
            activeTab === "channels" 
              ? "bg-slate-900 text-white border-l-2 border-blue-500" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5" />
            <span>Gaming Deck</span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
            {textChannels.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab("friends")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold font-sans tracking-wide transition-all ${
            activeTab === "friends" 
              ? "bg-slate-900 text-white border-l-2 border-blue-500" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>Co-Op Friends</span>
          </div>
          {usersList.length > 2 && (
            <span className="text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono">
              {usersList.filter(u => u.status === 'online').length} active
            </span>
          )}
        </button>
      </div>

      {/* Main Channels / DMs Explorer Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        
        {activeTab === "channels" ? (
          <>
            {/* Text Channels List */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Text Channels</span>
              </div>
              <div className="space-y-0.5">
                {textChannels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => { setSelectedChannelId(ch.id); setSelectedDMUserId(null); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      selectedChannelId === ch.id && selectedDMUserId === null
                        ? "bg-slate-900 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Channels List */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Voice Channels</span>
              </div>
              <div className="space-y-1">
                {voiceChannels.map((vc) => {
                  const isCurrent = joinedVoiceChannelId === vc.id;
                  // Find users inside this Voice Channel
                  const currentVCUsers = usersList.filter(u => u.voiceState?.channelId === vc.id);

                  return (
                    <div key={vc.id} className="space-y-0.5">
                      <button
                        onClick={() => joinVoiceChannel(vc.id)}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-xs transition-all ${
                          isCurrent
                            ? "bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 font-bold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Volume2 className={`h-3.5 w-3.5 ${isCurrent ? "text-emerald-400" : "text-slate-500"}`} />
                          <span className="truncate">{vc.name}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                            Live
                          </span>
                        )}
                      </button>

                      {/* Display active participants underneath */}
                      {currentVCUsers.length > 0 && (
                        <div className="pl-6 pr-2 space-y-1 py-1">
                          {currentVCUsers.map(vUser => (
                            <div key={vUser.id} className="flex items-center justify-between text-xs text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${vUser.id === currentUser?.id ? "bg-blue-400" : "bg-rose-400"}`} />
                                <span className="text-[11px] truncate max-w-[100px]">{vUser.username}</span>
                              </div>
                              
                              {/* Mic/Screen sharing statuses badges */}
                              <div className="flex items-center gap-1">
                                {vUser.voiceState?.screen && (
                                  <span className="bg-rose-600 px-1 py-0.2 rounded text-[8px] font-mono text-white">
                                    STREAM
                                  </span>
                                )}
                                {vUser.voiceState?.mute ? (
                                  <MicOff className="h-2.5 w-2.5 text-rose-500" />
                                ) : (
                                  <Mic className="h-2.5 w-2.5 text-slate-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Direct Messages tab */
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Direct Messages</span>
            </div>
            {dmUsers.length === 0 ? (
              <p className="px-2 text-[10px] text-slate-600 italic">No online gamers available. Add friends to DM!</p>
            ) : (
              <div className="space-y-0.5">
                {dmUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedDMUserId(u.id); setSelectedChannelId(""); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      selectedDMUserId === u.id
                        ? "bg-slate-900 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                    }`}
                  >
                    <div className="relative">
                      <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-center text-[10px] text-blue-300">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="absolute bottom-[-1px] right-[-1px] h-2 w-2 rounded-full bg-emerald-500 border border-slate-950" />
                    </div>
                    <span className="truncate">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Connected Voice Channel footer toolbar */}
      {joinedVoiceChannelId && (
        <div className="bg-slate-950 border-t border-slate-900 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wide font-mono uppercase block">
                🎙️ Voice Connected
              </span>
              <span className="text-xs text-slate-300 truncate max-w-[130px] inline-block font-sans">
                {voiceChannels.find(v => v.id === joinedVoiceChannelId)?.name}
              </span>
            </div>
            <button 
              onClick={leaveVoiceChannel}
              className="px-2 py-0.5 border border-rose-950 bg-rose-950/20 hover:bg-rose-950/80 hover:text-white text-rose-400 rounded-md text-[10px] font-mono transition-colors"
            >
              Disconnect
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1.5 rounded-lg">
            <button 
              onClick={() => toggleParam('mute')}
              className={`py-1 rounded text-xs flex justify-center items-center transition-colors ${
                currentUser?.voiceState?.mute ? "bg-rose-900/20 text-rose-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="Toggle Microphone"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => toggleParam('deaf')}
              className={`py-1 rounded text-xs flex justify-center items-center transition-colors ${
                currentUser?.voiceState?.deaf ? "bg-rose-900/20 text-rose-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="Toggle Deafen"
            >
              <Headphones className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => toggleParam('screen')}
              className={`py-1 rounded text-xs flex justify-center items-center transition-colors ${
                currentUser?.voiceState?.screen ? "bg-blue-600/20 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="Toggle Screen share"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* User settings profile card anchor at very bottom */}
      <div className="h-14 bg-slate-950 border-t border-slate-900/80 px-4 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 truncate">
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-black text-xs font-mono flex items-center justify-center border border-blue-900">
            {currentUser?.username[0].toUpperCase() || "G"}
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-white block truncate leading-tight">
              {currentUser?.username || "Gamer"}
            </span>
            <span className="text-[9px] text-slate-500 block truncate leading-tight font-mono">
              ping: 11ms
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" title="Connection Active" />
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-white rounded-lg transition-colors"
              title="Switch Username / Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
