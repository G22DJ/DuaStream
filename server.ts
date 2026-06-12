import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// In-Memory Multi-user States
interface VoiceState {
  channelId: string;
  deaf: boolean;
  mute: boolean;
  video: boolean;
  screen: boolean;
}

interface User {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  voiceState: VoiceState | null;
  isBot?: boolean;
}

interface Message {
  id: string;
  channelId: string | null; // null for direct messages
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  dmRecipientId?: string; // used for DMs
}

interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
}

// Global state
const users: Map<string, User> = new Map();
const activeConnections: Map<string, WebSocket> = new Map();
const friendRequests: FriendRequest[] = [];
// friendships is a list of [user1, user2] pairs
const friendships: [string, string][] = [];

// System channels
const textChannels = [
  { id: "general", name: "general", topic: "General discussion and hangout" },
  { id: "game-room", name: "game-room", topic: "Co-op gaming plans and chat" },
  { id: "streams", name: "streams", topic: "Active gameplay streams and highlights" },
];

const voiceChannels = [
  { id: "lobby-vc", name: "Lobby" },
  { id: "co-op-room", name: "Gaming Duo Room" },
  { id: "squad-alpha", name: "Squad Alpha" },
];

// Seed message history for default channels
const messages: Message[] = [
  {
    id: "m1",
    channelId: "general",
    senderId: "brother-seed-id",
    senderName: "BrotherGamer",
    content: "Yo! Setup is looking sick. Open this on your device so we can test the screen sharing and voice stream quality! 🎮",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "m2",
    channelId: "general",
    senderId: "system",
    senderName: "Nexus System",
    content: "Welcome to Screen Share & Game Chat. To stream, click a Voice Channel (like 'Gaming Duo Room') then click 'Share Screen'!",
    timestamp: new Date().toISOString(),
  }
];

// Initialize default Bot Users (like the brother username) to help solo testers feel the game-ready experience!
const brotherBot: User = {
  id: "brother-seed-id",
  username: "BrotherGamer",
  avatar: "gaming-brother",
  status: "online",
  customStatus: "Ready for Co-Op matches! 🤝",
  voiceState: null,
  isBot: true,
};

const sentinelBot: User = {
  id: "sentinel-bot-id",
  username: "Co-Op Buddy AI",
  avatar: "gaming-ai",
  status: "online",
  customStatus: "Ask me technical queries with '/ai' 🤖",
  voiceState: null,
  isBot: true,
};

users.set(brotherBot.id, brotherBot);
users.set(sentinelBot.id, sentinelBot);

// Pre-create friendships to let the user see active DM options and status
// Friend request history:
friendRequests.push({
  id: "req-1",
  senderId: "brother-seed-id",
  senderName: brotherBot.username,
  receiverId: "default", // will be matched dynamically to the first logged user
  status: "pending",
  timestamp: new Date().toISOString()
});

// JSON body parser
app.use(express.json());

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", usersConnected: activeConnections.size });
});

app.get("/api/server-info", (req, res) => {
  res.json({
    textChannels,
    voiceChannels,
    totalConnections: activeConnections.size
  });
});

// Initiate the WebSocket signaling and sync server
const wss = new WebSocketServer({ noServer: true });

// Handle HTTP upgrades to WebSockets
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Broadcast state to all connected clients
function broadcast(data: any, excludeUserId?: string) {
  const jsonStr = JSON.stringify(data);
  activeConnections.forEach((ws, userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(jsonStr);
    }
  });
}

// Send private message to specific user
function sendToUser(userId: string, data: any) {
  const ws = activeConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// Broadcast user list updates
function broadcastUserList() {
  const list = Array.from(users.values());
  broadcast({
    type: "user_list_update",
    payload: { users: list }
  });
}

// Handle AI response using Gemini if server api key exists, or a friendly responsive fallback bot
async function handleAiResponse(userMessage: string, channelId: string | null, privateRecipientId?: string) {
  let replyText = "";
  const cleanedPrompt = userMessage.substring(4).trim(); // Remove "/ai "

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are "Co-Op Buddy AI", a smart assistant integrated into a Discord-like custom gaming platform designed for gamers, screen streaming, and voice channels. 
      Answer the following user question inside a game room with ultra low latency and stream optimization context: "${cleanedPrompt}". Keep your response concise, fun, gamer-centric (maximum 3-4 sentences) and styled with markdown.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      replyText = response.text || "No response received.";
    } catch (err) {
      console.error("Gemini AI API Error:", err);
      replyText = "🎮 Hey gamer! Standard stream telemetry indicates I experienced a ping spike processing that request. Try again, or optimize your resolution!";
    }
  } else {
    // Quality fallback response if Gemini Key is not entered
    const textLower = cleanedPrompt.toLowerCase();
    if (textLower.includes("latency") || textLower.includes("stream") || textLower.includes("lag")) {
      replyText = "💡 **Pro Tip for Low-Latency Gaming Screens:**\n- Ensure both you and your brother select the **AV1** or **VP9** codec under stream parameters.\n- Lock the resolution to **1080p 60FPS** for perfect pixel density, requiring only ~12Mbps bandwidth!";
    } else if (textLower.includes("resolution") || textLower.includes("4k")) {
      replyText = "📺 **Resolution Analytics:**\n- **4K Ultra (2160p)**: Best for single player cinematic games (requires ~25Mbps, bitrates up to 30Mbps).\n- **1080p (Full HD)**: Optimal for fast shooter games (requires ~10Mbps, zero frame pacing issues!).\n- **720p (HD esports)**: Absolutely lowest packet processing delay, sub-5ms delay!";
    } else if (textLower.includes("hello") || textLower.includes("hi") || textLower.includes("hey")) {
      replyText = "🤖 **Co-Op Buddy AI here!** Welcome to our ultra-low latency game-coordination deck. Ask me anything about stream parameters, WebRTC specs, codecs, or how to invite your brother!";
    } else {
      replyText = "🕹️ **Nexus Team Tip**: To game with your brother, share the **Shared App URL** with him, log in, approve the friend request, jump in the **Gaming Duo Room** voice channel, and click 'Share Screen'!";
    }
  }

  const aiMessage: Message = {
    id: "ai-" + Math.random().toString(36).substring(2, 9),
    channelId,
    senderId: "sentinel-bot-id",
    senderName: "Co-Op Buddy AI",
    content: replyText,
    timestamp: new Date().toISOString(),
    dmRecipientId: privateRecipientId
  };

  messages.push(aiMessage);

  if (channelId) {
    broadcast({
      type: "chat_msg_receive",
      payload: { message: aiMessage }
    });
  } else if (privateRecipientId) {
    // DM response
    sendToUser(privateRecipientId, {
      type: "private_msg_receive",
      payload: { message: aiMessage }
    });
  }
}

wss.on("connection", (ws: WebSocket) => {
  let currentUserId: string | null = null;

  ws.on("message", async (rawMessage: string) => {
    try {
      const data = JSON.parse(rawMessage);
      const { type, payload } = data;

      switch (type) {
        case "login": {
          const { username, preferredId } = payload;
          const uId = preferredId || `user-${Math.random().toString(36).substring(2, 9)}`;
          currentUserId = uId;

          // Add or update user info
          const existingUser = users.get(uId);
          const newUser: User = {
            id: uId,
            username: username || "Gamer",
            avatar: existingUser?.avatar || `avatar-${~~(Math.random() * 5 + 1)}`,
            status: "online",
            customStatus: existingUser?.customStatus || "Ready to game! 🚀",
            voiceState: null
          };

          users.set(uId, newUser);
          activeConnections.set(uId, ws);

          // Correct matching default target friend request to of current user
          friendRequests.forEach(req => {
            if (req.receiverId === "default") {
              req.receiverId = uId;
            }
          });

          // Send current local sync states
          ws.send(JSON.stringify({
            type: "login_success",
            payload: {
              currentUser: newUser,
              users: Array.from(users.values()),
              channels: textChannels,
              voiceChannels,
              messages: messages.filter(m => m.channelId !== null),
              friendRequests: friendRequests.filter(req => req.senderId === uId || req.receiverId === uId),
              friendships: friendships.filter(f => f.includes(uId))
            }
          }));

          // Notify others of login and state update
          broadcastUserList();

          // Send system join notification
          const sysMsg: Message = {
            id: `join-${Date.now()}`,
            channelId: "general",
            senderId: "system",
            senderName: "Nexus System",
            content: `✨ _**${newUser.username}** logged in and is ready to stream._`,
            timestamp: new Date().toISOString(),
          };
          messages.push(sysMsg);
          broadcast({
            type: "chat_msg_receive",
            payload: { message: sysMsg }
          });
          break;
        }

        case "get_users": {
          ws.send(JSON.stringify({
            type: "user_list_update",
            payload: { users: Array.from(users.values()) }
          }));
          break;
        }

        case "update_status": {
          if (!currentUserId) return;
          const user = users.get(currentUserId);
          if (user) {
            user.status = payload.status;
            if (payload.customStatus !== undefined) {
              user.customStatus = payload.customStatus;
            }
            users.set(currentUserId, user);
            broadcastUserList();
          }
          break;
        }

        case "send_friend_request": {
          if (!currentUserId) return;
          const { targetUsername } = payload;
          
          // Find user by username
          const receiver = Array.from(users.values()).find(
            u => u.username.toLowerCase() === targetUsername.trim().toLowerCase()
          );

          if (!receiver) {
            ws.send(JSON.stringify({
              type: "friend_request_error",
              payload: { error: `User with username "${targetUsername}" not found.` }
            }));
            break;
          }

          if (receiver.id === currentUserId) {
            ws.send(JSON.stringify({
              type: "friend_request_error",
              payload: { error: "You cannot add yourself as a friend." }
            }));
            break;
          }

          // Check if already friends or request exists
          const alreadyFriends = friendships.some(
            f => (f[0] === currentUserId && f[1] === receiver.id) || (f[0] === receiver.id && f[1] === currentUserId)
          );

          if (alreadyFriends) {
            ws.send(JSON.stringify({
              type: "friend_request_error",
              payload: { error: `You are already friends with ${receiver.username}.` }
            }));
            break;
          }

          const existingRequest = friendRequests.find(
            r => (r.senderId === currentUserId && r.receiverId === receiver.id) ||
                 (r.senderId === receiver.id && r.receiverId === currentUserId)
          );

          if (existingRequest) {
            ws.send(JSON.stringify({
              type: "friend_request_error",
              payload: { error: "A friend request between you is already pending." }
            }));
            break;
          }

          const newRequest: FriendRequest = {
            id: `req-${Date.now()}`,
            senderId: currentUserId,
            senderName: users.get(currentUserId)?.username || "Gamer",
            receiverId: receiver.id,
            status: "pending",
            timestamp: new Date().toISOString()
          };

          friendRequests.push(newRequest);

          // Update both sender and receiver
          ws.send(JSON.stringify({
            type: "friend_request_sent",
            payload: { request: newRequest }
          }));

          sendToUser(receiver.id, {
            type: "friend_request_receive",
            payload: { request: newRequest }
          });
          break;
        }

        case "accept_friend_request": {
          if (!currentUserId) return;
          const { requestId } = payload;
          const requestIdx = friendRequests.findIndex(r => r.id === requestId);

          if (requestIdx !== -1) {
            const request = friendRequests[requestIdx];
            request.status = "accepted";

            // Add to friendships
            friendships.push([request.senderId, request.receiverId]);

            // Notify both parties
            sendToUser(request.senderId, {
              type: "friend_request_accepted",
              payload: { requestId, friendId: request.receiverId, friendships }
            });

            sendToUser(request.receiverId, {
              type: "friend_request_accepted",
              payload: { requestId, friendId: request.senderId, friendships }
            });

            // Auto reply for brother bot!
            if (request.senderId === brotherBot.id) {
              const greetPM: Message = {
                id: `pm-${Date.now()}`,
                channelId: null,
                senderId: brotherBot.id,
                senderName: brotherBot.username,
                content: "Awesome, you accepted my request! Grab a headset, let's join 'Gaming Duo Room' to stream together. 🎧👊",
                timestamp: new Date().toISOString(),
                dmRecipientId: currentUserId
              };
              messages.push(greetPM);
              ws.send(JSON.stringify({
                type: "private_msg_receive",
                payload: { message: greetPM }
              }));
            }
          }
          break;
        }

        case "reject_friend_request": {
          if (!currentUserId) return;
          const { requestId } = payload;
          const requestIdx = friendRequests.findIndex(r => r.id === requestId);

          if (requestIdx !== -1) {
            const request = friendRequests[requestIdx];
            request.status = "declined";

            // Notify both
            sendToUser(request.senderId, {
              type: "friend_request_declined",
              payload: { requestId }
            });
            ws.send(JSON.stringify({
              type: "friend_request_declined",
              payload: { requestId }
            }));

            // Remove from the list entirely
            friendRequests.splice(requestIdx, 1);
          }
          break;
        }

        case "chat_msg": {
          if (!currentUserId) return;
          const { channelId, content } = payload;
          const user = users.get(currentUserId);

          if (user) {
            const newMsg: Message = {
              id: `msg-${Date.now()}`,
              channelId,
              senderId: currentUserId,
              senderName: user.username,
              content,
              timestamp: new Date().toISOString()
            };

            messages.push(newMsg);

            // Broadcast message
            broadcast({
              type: "chat_msg_receive",
              payload: { message: newMsg }
            });

            // Is the message aimed at the AI Assistant?
            if (content.startsWith("/ai ")) {
              // Trigger AI response loop
              await handleAiResponse(content, channelId);
            }
          }
          break;
        }

        case "private_msg": {
          if (!currentUserId) return;
          const { recipientId, content } = payload;
          const user = users.get(currentUserId);

          if (user) {
            const newMsg: Message = {
              id: `pm-${Date.now()}`,
              channelId: null,
              senderId: currentUserId,
              senderName: user.username,
              content,
              timestamp: new Date().toISOString(),
              dmRecipientId: recipientId
            };

            messages.push(newMsg);

            // Send to sender and recipient
            ws.send(JSON.stringify({
              type: "private_msg_receive",
              payload: { message: newMsg }
            }));

            sendToUser(recipientId, {
              type: "private_msg_receive",
              payload: { message: newMsg }
            });

            // Bot response triggers
            if (recipientId === brotherBot.id) {
              setTimeout(() => {
                const triggerWord = content.toLowerCase();
                let replies = [
                  "No lag at all on VP9 codec! Ready whenever you are bro.",
                  "Stream looks incredible! I just locked my quality at 1080p 60FPS.",
                  "Let's play details: join the Duo Room VC and click stream. I can see you in real-time!",
                  "Yeah! We are connected. This platform acts exactly like Discord but with latency tuning."
                ];
                let selectedReply = replies[~~(Math.random() * replies.length)];
                
                if (triggerWord.includes("hello") || triggerWord.includes("hi")) {
                  selectedReply = "What's up bro! Ready to kick-start our lobby streaming? Let's go!";
                } else if (triggerWord.includes("screen") || triggerWord.includes("stream")) {
                  selectedReply = "Click on the 'Gaming Duo Room' VC and choose 'Share Screen'. I will view it perfectly!";
                }

                const botMsg: Message = {
                  id: `pm-reply-${Date.now()}`,
                  channelId: null,
                  senderId: brotherBot.id,
                  senderName: brotherBot.username,
                  content: selectedReply,
                  timestamp: new Date().toISOString(),
                  dmRecipientId: currentUserId as string
                };
                messages.push(botMsg);
                sendToUser(currentUserId as string, {
                  type: "private_msg_receive",
                  payload: { message: botMsg }
                });
              }, 1200);
            } else if (recipientId === sentinelBot.id) {
              await handleAiResponse("/ai " + content, null, currentUserId);
            }
          }
          break;
        }

        case "join_voice": {
          if (!currentUserId) return;
          const { channelId } = payload;
          const user = users.get(currentUserId);

          if (user) {
            user.voiceState = {
              channelId,
              deaf: false,
              mute: false,
              video: false,
              screen: false
            };
            users.set(currentUserId, user);
            broadcastUserList();

            // Notify others in voice channel
            broadcast({
              type: "user_joined_voice",
              payload: { userId: currentUserId, channelId, voiceState: user.voiceState }
            });

            // Setup automated brother join to make voice/audio and streams interactive immediately!
            if (channelId === "co-op-room" && !users.get(brotherBot.id)?.voiceState) {
              setTimeout(() => {
                const bUser = users.get(brotherBot.id);
                if (bUser) {
                  bUser.voiceState = {
                    channelId: "co-op-room",
                    deaf: false,
                    mute: false,
                    video: false,
                    screen: true // brother activates simulated high-speed retro stream
                  };
                  users.set(brotherBot.id, bUser);
                  broadcastUserList();
                  
                  broadcast({
                    type: "user_joined_voice",
                    payload: { userId: brotherBot.id, channelId, voiceState: bUser.voiceState }
                  });

                  // Stream start broadcast from Brother
                  broadcast({
                    type: "brother_stream_start",
                    payload: {
                      userId: brotherBot.id,
                      username: brotherBot.username,
                      title: "Halo Reach Co-op Campaign",
                      resolution: "1080p",
                      fps: 60,
                      bitrate: 14.2,
                      codec: "VP9"
                    }
                  });
                }
              }, 2000);
            }
          }
          break;
        }

        case "leave_voice": {
          if (!currentUserId) return;
          const user = users.get(currentUserId);

          if (user && user.voiceState) {
            const previousChannelId = user.voiceState.channelId;
            user.voiceState = null;
            users.set(currentUserId, user);
            broadcastUserList();

            broadcast({
              type: "user_left_voice",
              payload: { userId: currentUserId, channelId: previousChannelId }
            });
          }
          break;
        }

        case "toggle_voice_param": {
          if (!currentUserId) return;
          const { param } = payload; // 'mute' | 'deaf' | 'video' | 'screen'
          const user = users.get(currentUserId);

          if (user && user.voiceState) {
            user.voiceState = {
              ...user.voiceState,
              [param]: !user.voiceState[param as keyof VoiceState]
            };
            users.set(currentUserId, user);
            broadcastUserList();

            broadcast({
              type: "user_voice_update",
              payload: { userId: currentUserId, voiceState: user.voiceState }
            });
          }
          break;
        }

        // --- WebRTC Real P2P Streaming Signaling Hub ---
        case "rtc_signal": {
          if (!currentUserId) return;
          const { targetId, signal } = payload;
          // Forward directly to target peer
          sendToUser(targetId, {
            type: "rtc_signal_receive",
            payload: {
              senderId: currentUserId,
              signal
            }
          });
          break;
        }

        // Active telemetry and sync stream actions
        case "stream_stats_update": {
          if (!currentUserId) return;
          broadcast({
            type: "stream_stats_receive",
            payload: {
              userId: currentUserId,
              stats: payload
            }
          }, currentUserId);
          break;
        }

        default:
          console.log(`Unknown message schema type: ${type}`);
      }
    } catch (err) {
      console.error("Failure processing incoming WS event code:", err);
    }
  });

  ws.on("close", () => {
    if (currentUserId) {
      activeConnections.delete(currentUserId);
      const user = users.get(currentUserId);
      if (user) {
        user.status = "offline";
        user.voiceState = null;
        users.set(currentUserId, user);
      }
      broadcastUserList();
      console.log(`User ${currentUserId} disconnected safely.`);
    }
  });
});

// Serve assets correctly based on NODE_ENV
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [Nexus Server] listening on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

initServer().catch((err) => {
  console.error("Critical failure during Nexus Server initialization:", err);
});
