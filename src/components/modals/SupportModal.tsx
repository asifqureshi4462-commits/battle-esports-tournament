import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { SupportTicket } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatDateTime } from '../../utils/formatters.ts';
import {
  X,
  LifeBuoy,
  Send,
  Plus,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  // New ticket form
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [category, setCategory] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'MATCH' | 'ROOM_CREDS' | 'OTHER'>('MATCH');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.getTickets();
      setTickets(res.tickets);
      if (activeTicket) {
        const updated = res.tickets.find((t) => t.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.createTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setTickets([res.ticket, ...tickets]);
      setActiveTicket(res.ticket);
      setShowNewTicketForm(false);
      setSubject('');
      setMessage('');
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.sendTicketMessage(activeTicket.id, replyText.trim());
      setActiveTicket(res.ticket);
      setTickets((prev) => prev.map((t) => (t.id === res.ticket.id ? res.ticket : t)));
      setReplyText('');
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0e1017] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Player Helpdesk</h2>
              <p className="text-[11px] text-zinc-400">Match queries, payouts & room issues</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {showNewTicketForm ? (
            /* Create new ticket */
            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Create Support Ticket</h3>
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Back to tickets
                </button>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-white text-xs focus:outline-none"
                >
                  <option value="MATCH">Tournament / Match Schedule</option>
                  <option value="ROOM_CREDS">Room ID & Password Issue</option>
                  <option value="DEPOSIT">Wallet Deposit Status</option>
                  <option value="WITHDRAWAL">UPI Payout Inquiry</option>
                  <option value="OTHER">Other Query</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your query"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-blue-500 rounded-xl text-white text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Detailed Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide all details, match name or transaction ID..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-blue-500 rounded-xl text-white text-xs focus:outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting Ticket...
                  </>
                ) : (
                  <>Submit Ticket</>
                )}
              </button>
            </form>
          ) : activeTicket ? (
            /* Active ticket message thread */
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div>
                  <button
                    onClick={() => setActiveTicket(null)}
                    className="text-xs text-blue-400 hover:underline mb-1 inline-block"
                  >
                    ← Back to tickets
                  </button>
                  <h3 className="text-xs font-bold text-white">{activeTicket.subject}</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ID: {activeTicket.id} • {activeTicket.category}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeTicket.status === 'RESOLVED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : activeTicket.status === 'IN_PROGRESS'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {activeTicket.status}
                </span>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {activeTicket.messages.map((m) => {
                  const isAdmin = m.sender === 'admin';
                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl text-xs max-w-[85%] ${
                        isAdmin
                          ? 'bg-blue-950/40 border border-blue-600/30 text-blue-100 ml-auto'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200 mr-auto'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                        <span className="font-semibold text-white">
                          {isAdmin ? '🛡️ Battle Esports Support' : m.senderName}
                        </span>
                        <span>{formatDateTime(m.timestamp)}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply form */}
              <form onSubmit={handleSendReply} className="mt-3 flex gap-2 pt-2 border-t border-zinc-800">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-blue-500 rounded-xl text-white text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : (
            /* Ticket list */
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Your Support Inquiries</span>
                <button
                  onClick={() => setShowNewTicketForm(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> New Ticket
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    Loading your tickets...
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No support tickets found.</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Have a query about a match or payment? Create a ticket anytime.
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                          {t.category}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">
                        {t.subject}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                        {t.messages[t.messages.length - 1]?.text}
                      </p>
                      <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-between">
                        <span>{formatDateTime(t.updatedAt)}</span>
                        <span>{t.messages.length} messages</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
