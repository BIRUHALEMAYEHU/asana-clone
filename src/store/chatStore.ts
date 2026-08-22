import { create } from 'zustand';
import type {
  ChatChannel,
  ChatConversation,
  ChatMessage,
  DmTarget
} from '../types';

interface ChatState {
  channels: ChatChannel[];
  conversations: ChatConversation[];
  dmTargets: DmTarget[];
  messages: ChatMessage[];
  hasMoreMessages: boolean;
  activeKind: 'channel' | 'dm' | null;
  activeId: string | null;
  loading: boolean;
  sending: boolean;
  error: string | null;

  reset: () => void;
  fetchChannels: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchDmTargets: () => Promise<void>;
  selectChannel: (channelId: string) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  startDm: (targetUserId: string) => Promise<ChatConversation>;
  sendMessage: (body: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  refreshSidebar: () => Promise<void>;
  refreshActiveMessages: () => Promise<void>;
}

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

const throwOnError = async (res: Response, fallback: string) => {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || fallback);
};

const emptyState = {
  channels: [] as ChatChannel[],
  conversations: [] as ChatConversation[],
  dmTargets: [] as DmTarget[],
  messages: [] as ChatMessage[],
  hasMoreMessages: false,
  activeKind: null as 'channel' | 'dm' | null,
  activeId: null as string | null,
  loading: false,
  sending: false,
  error: null as string | null
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...emptyState,

  reset: () => set(emptyState),

  fetchChannels: async () => {
    const res = await fetch('/api/chat/channels', { headers: authHeaders() });
    await throwOnError(res, 'Failed to load channels');
    const channels = await res.json();
    set({ channels });
  },

  fetchConversations: async () => {
    const res = await fetch('/api/chat/conversations', { headers: authHeaders() });
    await throwOnError(res, 'Failed to load conversations');
    const conversations = await res.json();
    set({ conversations });
  },

  fetchDmTargets: async () => {
    const res = await fetch('/api/chat/dm-targets', { headers: authHeaders() });
    await throwOnError(res, 'Failed to load DM targets');
    const dmTargets = await res.json();
    set({ dmTargets });
  },

  refreshSidebar: async () => {
    await Promise.all([get().fetchChannels(), get().fetchConversations()]);
  },

  refreshActiveMessages: async () => {
    const { activeKind, activeId } = get();
    if (!activeKind || !activeId) return;

    const url =
      activeKind === 'channel'
        ? `/api/chat/channels/${activeId}/messages`
        : `/api/chat/conversations/${activeId}/messages`;

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    set({ messages: data.messages, hasMoreMessages: data.hasMore });
  },

  selectChannel: async (channelId: string) => {
    set({ loading: true, error: null, activeKind: 'channel', activeId: channelId, messages: [] });
    try {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
        headers: authHeaders()
      });
      await throwOnError(res, 'Failed to load messages');
      const data = await res.json();
      set({ messages: data.messages, hasMoreMessages: data.hasMore, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message || 'Failed to load messages' });
    }
  },

  selectConversation: async (conversationId: string) => {
    set({ loading: true, error: null, activeKind: 'dm', activeId: conversationId, messages: [] });
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        headers: authHeaders()
      });
      await throwOnError(res, 'Failed to load messages');
      const data = await res.json();
      set({ messages: data.messages, hasMoreMessages: data.hasMore, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message || 'Failed to load messages' });
    }
  },

  startDm: async (targetUserId: string) => {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ targetUserId })
    });
    await throwOnError(res, 'Could not start conversation');
    const conversation = await res.json();
    await get().fetchConversations();
    await get().selectConversation(conversation.id);
    return conversation;
  },

  sendMessage: async (body: string) => {
    const { activeKind, activeId } = get();
    if (!activeKind || !activeId || !body.trim()) return;

    set({ sending: true, error: null });
    try {
      const url =
        activeKind === 'channel'
          ? `/api/chat/channels/${activeId}/messages`
          : `/api/chat/conversations/${activeId}/messages`;

      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ body: body.trim() })
      });
      await throwOnError(res, 'Failed to send message');
      const message = await res.json();
      set(state => ({ messages: [...state.messages, message], sending: false }));
      await get().refreshSidebar();
    } catch (e: any) {
      set({ sending: false, error: e.message || 'Failed to send message' });
    }
  },

  loadOlderMessages: async () => {
    const { activeKind, activeId, messages, hasMoreMessages, loading } = get();
    if (!activeKind || !activeId || !hasMoreMessages || loading || messages.length === 0) return;

    const oldest = messages[0];
    const base =
      activeKind === 'channel'
        ? `/api/chat/channels/${activeId}/messages`
        : `/api/chat/conversations/${activeId}/messages`;

    set({ loading: true });
    try {
      const res = await fetch(`${base}?before=${encodeURIComponent(oldest.id)}`, {
        headers: authHeaders()
      });
      await throwOnError(res, 'Failed to load older messages');
      const data = await res.json();
      set(state => ({
        messages: [...data.messages, ...state.messages],
        hasMoreMessages: data.hasMore,
        loading: false
      }));
    } catch (e: any) {
      set({ loading: false, error: e.message || 'Failed to load older messages' });
    }
  }
}));
