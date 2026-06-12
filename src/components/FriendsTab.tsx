import React, { useState } from "react";
import { User, FriendRequest } from "../types";
import { Users, UserX, UserCheck, MessageSquare, Plus, Mail, Check, X, ShieldAlert } from "lucide-react";

interface FriendsTabProps {
  currentUser: User | null;
  usersList: User[];
  friendRequests: FriendRequest[];
  friendships: [string, string][];
  sendFriendRequest: (targetUsername: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  setSelectedDMUserId: (id: string | null) => void;
  friendRequestError: string | null;
}

export default function FriendsTab({
  currentUser,
  usersList,
  friendRequests,
  friendships,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  setSelectedDMUserId,
  friendRequestError
}: FriendsTabProps) {
  const [targetUsername, setTargetUsername] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"online" | "all" | "pending" | "add">("all");

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;

    sendFriendRequest(targetUsername);
    
    if (!friendRequestError) {
      setSuccessMsg(`Dispatching invitation to "${targetUsername}"...`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setTargetUsername("");
  };

  // Helper code to map friends
  const friendIds = friendships.flatMap((pair) => {
    if (pair[0] === currentUser?.id) return [pair[1]];
    if (pair[1] === currentUser?.id) return [pair[0]];
    return [];
  });

  const friends = usersList.filter((u) => friendIds.includes(u.id));
  const onlineFriends = friends.filter((u) => u.status !== "offline");

  // Filter requests targeting current logged user
  const incomingRequests = friendRequests.filter(
    (req) => req.receiverId === currentUser?.id && req.status === "pending"
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-y-auto p-4 md:p-6">
      
      {/* Upper Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white font-sans tracking-tight">Co-Op Friends Deck</h2>
        </div>

        {/* Action filter sub tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setSubTab("online")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              subTab === "online" 
                ? "bg-slate-800 text-white font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Online ({onlineFriends.length})
          </button>
          <button 
            onClick={() => setSubTab("all")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              subTab === "all" 
                ? "bg-slate-800 text-white font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Friends ({friends.length})
          </button>
          <button 
            onClick={() => setSubTab("pending")}
            className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${
              subTab === "pending" 
                ? "bg-slate-800 text-white font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Inbox</span>
            {incomingRequests.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
            <span className="text-[10px] bg-slate-900 px-1 py-0.2 rounded font-mono">
              {incomingRequests.length}
            </span>
          </button>
          <button 
            onClick={() => setSubTab("add")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              subTab === "add" 
                ? "bg-blue-600 text-white font-semibold shadow shadow-blue-900/40" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Add Friend +
          </button>
        </div>
      </div>

      {subTab === "add" ? (
        /* ADD FRIEND SUBPANEL PANEL */
        <div className="max-w-xl bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider font-sans">
            Invite Your Gaming Brother
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            By typing their exactly logged system username, you can instantly establish a real-time voice, video, screen-sharing and P2P connection channel.
          </p>

          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              type="text"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="Enter exact gamer username (e.g., BrotherGamer)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-600 font-mono"
            />
            <button 
              type="submit"
              className="px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Send Invite</span>
            </button>
          </form>

          {/* Error alert mapping */}
          {friendRequestError && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-lg text-xs leading-none">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{friendRequestError}</span>
            </div>
          )}

          {/* Success indicators */}
          {successMsg && !friendRequestError && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 rounded-lg text-xs">
              <Mail className="h-4 w-4 animate-bounce text-emerald-300" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick instructions with default target gamer */}
          <div className="mt-6 pt-6 border-t border-slate-900">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">
              Default SEEDED GAMERS
            </h4>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 font-mono">BrotherGamer</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Seeded bot buddy. Copy this and paste above to check invites!</p>
              </div>
              <button 
                onClick={() => setTargetUsername("BrotherGamer")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
              >
                Use Name
              </button>
            </div>
          </div>
        </div>
      ) : subTab === "pending" ? (
        /* PENDING INBOX PANEL */
        <div className="space-y-3">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/45 rounded-xl border border-slate-800/40">
              <Mail className="h-6 w-6 text-slate-700 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Inbox is empty
              </h4>
              <p className="text-[10px] text-slate-600 mt-1">No pending invitations received.</p>
            </div>
          ) : (
            incomingRequests.map((req) => (
              <div 
                key={req.id} 
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-950/90 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                    {req.senderName[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight font-mono">{req.senderName}</h4>
                    <span className="text-[9px] text-slate-500 block mt-0.5 leading-none">
                      Sent co-op invitation • {new Date(req.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptFriendRequest(req.id)}
                    className="p-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Accept Invitation"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(req.id)}
                    className="p-1.5 bg-rose-950/40 hover:bg-rose-950 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Decline Invitation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ONLINE or ALL FRIENDS LISTS */
        <div className="space-y-2">
          const activeList = subTab === "online" ? onlineFriends : friends;
          
          {(subTab === "online" ? onlineFriends : friends).length === 0 ? (
            <div className="text-center py-12 bg-slate-950/45 rounded-xl border border-slate-800/40">
              <Users className="h-6 w-6 text-slate-700 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                No Friends Listed
              </h4>
              <p className="text-[10px] text-slate-600 max-w-xs mx-auto mt-1 leading-relaxed">
                Click "Add Friend" tab above and send an request. Or enter "BrotherGamer" to add your seeded bot brother!
              </p>
            </div>
          ) : (
            (subTab === "online" ? onlineFriends : friends).map((friend) => (
              <div 
                key={friend.id} 
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between hover:bg-slate-950/90 hover:border-slate-700 transition-all select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-blue-300">
                      {friend.username[0].toUpperCase()}
                    </div>
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-slate-950 ${
                      friend.status === "online" 
                        ? "bg-emerald-500" 
                        : friend.status === "idle" 
                          ? "bg-amber-500" 
                          : friend.status === "dnd" 
                            ? "bg-rose-500" 
                            : "bg-slate-600"
                    }`} />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white font-mono">{friend.username}</h4>
                      {friend.isBot && (
                        <span className="bg-slate-800 px-1 py-0.2 rounded text-[8px] font-mono text-slate-400">
                          BOT
                        </span>
                      )}
                    </div>
                    {friend.customStatus ? (
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-none truncate max-w-[180px]">
                        {friend.customStatus}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-0.5 leading-none font-mono">
                        status: {friend.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDMUserId(friend.id)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Chat PM</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
