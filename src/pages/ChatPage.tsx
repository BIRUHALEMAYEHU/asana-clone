import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, MessageCircle, Plus, Send, Users, Building2, FolderKanban } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/common/Avatar';
import type { ChannelType, ChatChannel } from '../types';
import '../components/chat/chat.css';

const POLL_MS = 8000;

const channelIcon = (type: ChannelType) => {
  switch (type) {
    case 'WORKSPACE':
      return <Building2 size={14} />;
    case 'DEPARTMENT':
      return <Users size={14} />;
    case 'PROJECT':
      return <FolderKanban size={14} />;
    default:
      return <Hash size={14} />;
  }
};

const formatChannelLabel = (channel: ChatChannel) => {
  if (channel.type === 'WORKSPACE' && channel.isDefault) return `#${channel.name}`;
  if (channel.type === 'DEPARTMENT') return channel.name;
  return `#${channel.name}`;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    channels,
    conversations,
    dmTargets,
    messages,
    hasMoreMessages,
    activeKind,
    activeId,
    loading,
    sending,
    error,
    refreshSidebar,
    fetchDmTargets,
    selectChannel,
    selectConversation,
    startDm,
    sendMessage,
    loadOlderMessages,
    refreshActiveMessages
  } = useChatStore();

  const [draft, setDraft] = useState('');
  const [showDmModal, setShowDmModal] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshSidebar();
    const timer = window.setInterval(async () => {
      await refreshSidebar();
      await refreshActiveMessages();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (channels.length > 0 && !activeId) {
      selectChannel(channels[0].id);
    }
  }, [channels, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const groupedChannels = useMemo(() => ({
    workspace: channels.filter(c => c.type === 'WORKSPACE'),
    department: channels.filter(c => c.type === 'DEPARTMENT'),
    project: channels.filter(c => c.type === 'PROJECT')
  }), [channels]);

  const activeTitle = useMemo(() => {
    if (activeKind === 'channel') {
      const ch = channels.find(c => c.id === activeId);
      return ch ? formatChannelLabel(ch) : 'Channel';
    }
    if (activeKind === 'dm') {
      const conv = conversations.find(c => c.id === activeId);
      return conv?.otherUserName || 'Direct message';
    }
    return 'Chat';
  }, [activeKind, activeId, channels, conversations]);

  const activeSubtitle = useMemo(() => {
    if (activeKind === 'channel') {
      const ch = channels.find(c => c.id === activeId);
      if (!ch) return '';
      if (ch.type === 'WORKSPACE') return 'Company-wide channel';
      if (ch.type === 'DEPARTMENT') return 'Department channel';
      return 'Project channel';
    }
    if (activeKind === 'dm') return 'Restricted direct message';
    return '';
  }, [activeKind, activeId, channels]);

  const handleOpenDmModal = async () => {
    setShowDmModal(true);
    setDmSearch('');
    await fetchDmTargets();
  };

  const filteredTargets = dmTargets.filter(t =>
    t.name.toLowerCase().includes(dmSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(dmSearch.toLowerCase())
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    await sendMessage(text);
  };

  const renderChannelGroup = (label: string, items: ChatChannel[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="chat-section-label">{label}</div>
        {items.map(channel => (
          <button
            key={channel.id}
            type="button"
            className={`chat-thread-item ${activeKind === 'channel' && activeId === channel.id ? 'active' : ''}`}
            onClick={() => selectChannel(channel.id)}
          >
            <div className="chat-thread-title">
              {channelIcon(channel.type)}
              <span>{formatChannelLabel(channel)}</span>
            </div>
            {channel.lastMessage && (
              <div className="chat-thread-preview">
                {channel.lastMessage.authorName}: {channel.lastMessage.body}
              </div>
            )}
          </button>
        ))}
      </>
    );
  };

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h1>Chat</h1>
          <p>Company channels and admin DMs</p>
        </div>

        <div className="chat-sidebar-scroll">
          {renderChannelGroup('Company', groupedChannels.workspace)}
          {renderChannelGroup('Departments', groupedChannels.department)}
          {renderChannelGroup('Projects', groupedChannels.project)}

          <div className="chat-section-label">Direct messages</div>
          {conversations.length === 0 && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No conversations yet
            </div>
          )}
          {conversations.map(conv => (
            <button
              key={conv.id}
              type="button"
              className={`chat-thread-item ${activeKind === 'dm' && activeId === conv.id ? 'active' : ''}`}
              onClick={() => selectConversation(conv.id)}
            >
              <div className="chat-thread-title">
                <MessageCircle size={14} />
                <span>{conv.otherUserName}</span>
              </div>
              {conv.lastMessage && (
                <div className="chat-thread-preview">
                  {conv.lastMessage.authorName}: {conv.lastMessage.body}
                </div>
              )}
            </button>
          ))}

          <div className="chat-new-dm">
            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={handleOpenDmModal}>
              <Plus size={16} />
              New message
            </button>
          </div>
        </div>
      </aside>

      <section className="chat-main">
        {!activeId ? (
          <div className="chat-empty">
            <MessageCircle size={40} />
            <p>Select a channel or start a direct message</p>
          </div>
        ) : (
          <>
            <header className="chat-main-header">
              <h2>{activeTitle}</h2>
              <span>{activeSubtitle}</span>
            </header>

            <div className="chat-messages" ref={messagesRef}>
              {hasMoreMessages && (
                <button type="button" className="btn btn-ghost chat-load-more" onClick={loadOlderMessages} disabled={loading}>
                  Load older messages
                </button>
              )}

              {loading && messages.length === 0 && <div className="chat-empty">Loading messages…</div>}
              {!loading && messages.length === 0 && (
                <div className="chat-empty">
                  <p>No messages yet. Say hello!</p>
                </div>
              )}

              {messages.map(msg => {
                const isOwn = msg.authorId === user?.id;
                return (
                  <div key={msg.id} className={`chat-message ${isOwn ? 'own' : ''}`}>
                    <Avatar name={msg.authorName} src={msg.authorProfilePic} size="sm" />
                    <div className="chat-message-bubble">
                      <div className="chat-message-meta">
                        {!isOwn && <strong>{msg.authorName}</strong>}
                        {!isOwn && ' · '}
                        {formatTime(msg.createdAt)}
                      </div>
                      <div className="chat-message-body">{msg.body}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && (
              <div style={{ padding: '0 1rem', color: 'var(--danger, #ef4444)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form className="chat-composer" onSubmit={handleSend}>
              <textarea
                className="input"
                placeholder="Write a message…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                rows={1}
              />
              <button type="submit" className="btn btn-primary" disabled={!draft.trim() || sending}>
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </section>

      {showDmModal && (
        <div className="chat-dm-modal-backdrop" onClick={() => setShowDmModal(false)}>
          <div className="chat-dm-modal" onClick={e => e.stopPropagation()}>
            <h3>New direct message</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Members can only message admins and project admins.
            </p>
            <input
              className="input"
              placeholder="Search people…"
              value={dmSearch}
              onChange={e => setDmSearch(e.target.value)}
              style={{ width: '100%', marginBottom: '0.75rem' }}
            />
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {filteredTargets.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No eligible contacts
                </div>
              )}
              {filteredTargets.map(target => (
                <button
                  key={target.id}
                  type="button"
                  className="chat-dm-target"
                  onClick={async () => {
                    setShowDmModal(false);
                    await startDm(target.id);
                  }}
                >
                  <Avatar name={target.name} src={target.profilePic} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{target.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{target.email}</div>
                  </div>
                  <span className="chat-type-badge">{target.role.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
