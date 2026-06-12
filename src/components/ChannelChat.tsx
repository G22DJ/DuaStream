import React, { useState, useEffect, useRef } from "react";
import { Send, Hash, MessageSquare, Terminal, HelpCircle, Sparkles, Cpu } from "lucide-react";
import { User, Message } from "../types";

interface ChannelChatProps {
  currentUser: User | null;
  selectedChannelId: string;
  selectedDMUserId: string | null;
  messages: Message[];
  usersList: User[];
  sendTextMessage: (content: string, channelId: string | null, recipientId: string | null) => void;
}

export default function ChannelChat({
  currentUser,
  selectedChannelId,
  selectedDMUserId,
  messages,
  usersList,
  sendTextMessage
}: ChannelChatProps) {
  const [typedMessage, setTypedMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Compute messages relevant to current viewing context
  const filteredMessages = messages.filter((msg) => {
    if (selectedDMUserId) {
      // It's a DM, find messages between current user and the selected DM recipient
      const isSenderAndRecipient = msg.senderId === currentUser?.id && msg.dmRecipientId === selectedDMUserId;
      const isRecipientAndSender = msg.senderId === selectedDMUserId && msg.dmRecipientId === currentUser?.id;
      return msg.channelId === null && (isSenderAndRecipient || isRecipientAndSender);
    } else {
      // It's a standard text channel
      return msg.channelId === selectedChannelId;
    }
  });

  // Automatically scroll messages when new ones arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    if (selectedDMUserId) {
      sendTextMessage(typedMessage, null, selectedDMUserId);
    } else {
      sendTextMessage(typedMessage, selectedChannelId, null);
    }
    setTypedMessage("");
  };

  // Find recipient user profile if DM view is active
  const dmUser = selectedDMUserId ? usersList.find((u) => u.id === selectedDMUserId) : null;

  return (
    <div className="flex-[0.8] lg:flex-1 flex flex-col bg-slate-900 overflow-hidden h-full">
      
      {/* Thread Title Header */}
      <div className="h-14 border-b border-slate-950 px-4 flex items-center justify-between bg-slate-900/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          {selectedDMUserId ? (
            <>
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-bold">{dmUser?.username || "Private DM"}</span>
                {dmUser?.status === "online" ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                )}
              </div>
            </>
          ) : (
            <>
              <Hash className="h-4 w-4 text-slate-500" />
              <span className="text-white text-sm font-bold">
                {selectedChannelId || "general"}
              </span>
              <span className="hidden md:inline px-2 text-xs text-slate-500 truncate border-l border-slate-800">
                {selectedChannelId === "streams" ? "Share gameplay links/analytics here" : "Discuss and play high-speed co-op matches!"}
              </span>
            </>
          )}
        </div>

        {/* Co-Op Helper Bot Quick guide */}
        <div className="flex items-center gap-2 text-xs text-slate-400 select-none">
          <Cpu className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
          <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-indigo-400 font-mono">
            Type `/ai` to query Co-Op Buddy Copilot
          </span>
        </div>
      </div>

      {/* Bubble Message Log Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-900/60 flex flex-col">
        {filteredMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <Terminal className="h-8 w-8 text-slate-700 mb-3" />
            <p className="text-xs text-slate-500 max-w-sm">
              {selectedDMUserId 
                ? `Send a message to ${dmUser?.username || "your friend"} to initiate standard ultra-low latency direct chat.`
                : `This is the beginning of the #${selectedChannelId} thread.`
              }
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isSystem = msg.senderId === "system";
            const isBot = msg.senderId === "sentinel-bot-id" || msg.senderId === "brother-seed-id";
            const isMe = msg.senderId === currentUser?.id;

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className="text-[10px] text-slate-500 font-mono italic px-3 py-1 bg-slate-950/40 rounded-full border border-slate-950/20">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
              >
                {/* Avatar logo */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner shrink-0 ${
                  isMe 
                    ? "bg-blue-600 text-white" 
                    : isBot 
                      ? "bg-rose-600 text-white border border-rose-500" 
                      : "bg-indigo-600 text-indigo-200"
                }`}>
                  {msg.senderName[0].toUpperCase()}
                </div>

                {/* Bubble details */}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-slate-300">{msg.senderName}</span>
                    {isBot && (
                      <span className="bg-rose-900/60 border border-rose-500/30 text-rose-300 px-1.5 py-0.1 rounded text-[8px] font-mono leading-none font-bold uppercase">
                        AI BOT
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    isMe 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : isBot 
                        ? "bg-slate-950 text-slate-100 border border-slate-800 rounded-tl-none font-sans" 
                        : "bg-slate-800/80 text-slate-200 rounded-tl-none"
                  }`}>
                    {/* Render helper for bots so markdown blocks are cleanly spaced */}
                    {msg.content.includes("**") || msg.content.includes("- ") ? (
                      <div className="space-y-1 font-sans">
                        {msg.content.split("\n").map((line, i) => {
                          const isHeading = line.startsWith("**") && line.endsWith("**");
                          const isBullet = line.startsWith("- ");
                          
                          if (isHeading) {
                            return (
                              <p key={i} className="font-bold text-blue-400 mt-1 first:mt-0">
                                {line.replace(/\*\*/g, "")}
                              </p>
                            );
                          }
                          if (isBullet) {
                            return (
                              <li key={i} className="list-disc pl-1 text-[11px] text-slate-300">
                                {line.replace("- ", "")}
                              </li>
                            );
                          }
                          return <p key={i}>{line}</p>;
                        })}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form container */}
      <form 
        onSubmit={handleSubmit}
        className="p-4 border-t border-slate-950 bg-slate-900 shrink-0"
      >
        <div className="relative">
          <input
            type="text"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder={
              selectedDMUserId 
                ? `Direct message ${dmUser?.username || "friend"}...` 
                : `Message #${selectedChannelId || "general"}...`
            }
            className="w-full bg-slate-950 text-xs text-white placeholder-slate-500 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none border border-slate-900 focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!typedMessage.trim()}
            className="absolute right-2 top-1.5 bottom-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 pl-1 italic font-mono">
          Commands: `/ai [query]` – Let the Co-Op AI assist with streaming configurations instantly.
        </p>
      </form>

    </div>
  );
}
