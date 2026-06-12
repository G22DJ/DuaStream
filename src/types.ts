export interface User {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  voiceState: VoiceState | null;
  isBot?: boolean;
}

export interface VoiceState {
  channelId: string;
  deaf: boolean;
  mute: boolean;
  video: boolean;
  screen: boolean;
}

export interface TextChannel {
  id: string;
  name: string;
  topic: string;
}

export interface VoiceChannel {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  channelId: string | null;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  dmRecipientId?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
}

export interface StreamStats {
  resolution: string;
  fps: number;
  bitrate: number;
  latency: number;
  packetLoss: string;
  codec: string;
}

export interface ActiveStream {
  userId: string;
  username: string;
  title: string;
  resolution: string;
  fps: number;
  bitrate: number;
  codec: string;
}
