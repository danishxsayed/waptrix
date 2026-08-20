"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/context/TenantContext";
import {
  MessageSquare, Send, Paperclip, Search, CheckCheck, Check,
  Clock, FileText, Mic, X, Loader2, Download, Play, Plus, Phone, AlertCircle,
  SlidersHorizontal, ChevronRight, ArrowUpDown, Trash2, CheckSquare, Square,
  Smile, User, Tag, PenLine, ChevronDown, ChevronUp, Info, ExternalLink,
  StickyNote, CheckCircle2, Zap, Activity, Pencil
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
  assigned_to?: string | null;
  assigned_name?: string | null;
}

interface TeamMember {
  id: string;
  member_user_id: string | null; // Supabase auth user ID — used for assignment matching
  email: string;
  role: string;
  status: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  type: string;
  content: string;
  template_name?: string;
  media_url?: string;
  media_id?: string;
  media_mime?: string;
  meta_message_id?: string;
  replied_to_message_id?: string;
  status: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  language: string;
  components: any[];
  meta_status: string;
  header_type?: string;
  header_text?: string;
  footer?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatConvTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yy");
}

function formatMsgTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function groupByDate(messages: ChatMessage[]) {
  // Sort by created_at first so same-date messages are always contiguous
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const groups: { label: string; messages: ChatMessage[] }[] = [];
  let currentLabel = "";
  for (const msg of sorted) {
    const d = new Date(msg.created_at);
    const label = isToday(d)
      ? "Today"
      : isYesterday(d)
      ? "Yesterday"
      : format(d, "MMMM d, yyyy");
    if (label !== currentLabel) {
      groups.push({ label, messages: [] });
      currentLabel = label;
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// ─── Read More Text ───────────────────────────────────────────────────────────
const READ_MORE_LIMIT = 60; // chars

function ReadMoreText({
  text,
  className = "",
  noteStyle = false,
}: {
  text: string;
  className?: string;
  noteStyle?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > READ_MORE_LIMIT;

  const displayText = isLong && !expanded ? text.slice(0, READ_MORE_LIMIT) : text;
  const btnColor = noteStyle ? "text-amber-300 hover:text-amber-100" : "text-[#25D366] hover:text-[#128C7E]";

  return (
    <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${className}`}>
      {displayText}
      {isLong && !expanded && (
        <>
          {"… "}
          <button
            onClick={() => setExpanded(true)}
            className={`font-semibold underline underline-offset-2 ${btnColor} focus:outline-none`}
          >
            Read more
          </button>
        </>
      )}
      {isLong && expanded && (
        <>
          {" "}
          <button
            onClick={() => setExpanded(false)}
            className={`font-semibold underline underline-offset-2 ${btnColor} focus:outline-none`}
          >
            Read less
          </button>
        </>
      )}
    </p>
  );
}

// ─── Template Bubble ──────────────────────────────────────────────────────────
function TemplateBubble({ template, resolvedBody, time, statusEl }: { template: Template; resolvedBody?: string; time?: string; statusEl?: React.ReactNode }) {
  const headerType = template.header_type || "NONE";
  const headerText = template.header_text || "";
  const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
  const isUrl = headerText.startsWith("http");

  return (
    <div className="rounded-2xl overflow-hidden min-w-[220px] max-w-[260px] bg-white text-[#111B21]">
      {/* Header */}
      {headerType === "TEXT" && headerText && (
        <div className="px-3 pt-2.5 pb-1">
          <p className="font-bold text-sm leading-snug text-[#111B21]">{headerText}</p>
        </div>
      )}
      {headerType === "IMAGE" && (
        isUrl ? (
          <img src={headerText} alt="Header" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
        ) : (
          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        )
      )}
      {headerType === "VIDEO" && (
        isUrl ? (
          <video src={headerText} className="w-full h-32 object-cover" muted playsInline />
        ) : (
          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
        )
      )}
      {headerType === "DOCUMENT" && (
        <div className="w-full px-3 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
          <FileText className="w-5 h-5 text-gray-500" />
          <span className="text-xs text-gray-600 truncate">{isUrl ? headerText.split("/").pop() : "Document"}</span>
        </div>
      )}

      {/* Body */}
      <div className="px-3 pt-2.5 pb-1">
        <ReadMoreText text={resolvedBody || template.body} className="text-[#111B21]" />
      </div>

      {/* Footer + timestamp row */}
      <div className="px-3 pb-2 flex items-end justify-between gap-2">
        {template.footer
          ? <p className="text-xs text-[#667781] flex-1">{template.footer}</p>
          : <span />
        }
        {time && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[#667781]">{time}</span>
            {statusEl}
          </div>
        )}
      </div>

      {/* Buttons */}
      {template.buttons && template.buttons.length > 0 && (
        <div className="border-t border-gray-200">
          {template.buttons.map((btn, i) => (
            <div
              key={i}
              className="px-3 py-2.5 text-center text-xs font-semibold text-[#25D366] border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Extract ordered variable indices from a template body, e.g. ["1","2"] from "Hello {{1}}, enjoy {{2}}!" */
function extractTemplateVars(body: string): string[] {
  const matches = [...new Set((body || "").match(/{{(\d+)}}/g)?.map(m => m.replace(/[{}]/g, "")) ?? [])];
  return matches.sort((a, b) => Number(a) - Number(b));
}

/** Returns the indices (in the buttons array) of URL buttons that have a dynamic {{1}} suffix */
function urlButtonIndices(buttons?: { type: string; url?: string }[]): number[] {
  if (!buttons) return [];
  return buttons.reduce<number[]>((acc, btn, i) => {
    if (btn.type === "URL" && btn.url && /\{\{1\}\}/.test(btn.url)) acc.push(i);
    return acc;
  }, []);
}

function avatarInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-text-muted" />;
  if (status === "failed") return <X className="w-3.5 h-3.5 text-red-400" />;
  if (status === "sending") return <Loader2 className="w-3 h-3 text-background/60 animate-spin" />;
  return <Clock className="w-3 h-3 text-text-muted" />;
}

// ─── WhatsApp-style Emoji Picker ─────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  {
    id: 'smileys', label: 'Smileys & People',
    icon: '😊',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚',
      '😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄',
      '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸',
      '😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
      '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
      '👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶',
      '👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸',
    ],
  },
  {
    id: 'animals', label: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊',
      '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗',
      '🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊',
      '🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏',
      '🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇',
      '🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍',
      '🎋','🍃','🍂','🍁','🍄','🐚','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚',
      '🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','🌌','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️',
    ],
  },
  {
    id: 'food', label: 'Food & Drink',
    icon: '🍎',
    emojis: [
      '🍏','🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦',
      '🥬','🥒','🌶️','🫑','🌽','🥕','🫛','🧄','🧅','🥔','🍠','🫚','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳',
      '🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘',
      '🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂',
      '🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍶','🍺','🍻','🥂',
      '🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥢','🧂',
    ],
  },
  {
    id: 'activities', label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁',
      '🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺',
      '🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪',
      '🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🪘','🥁','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯',
      '🎳','🎮','🎰','🧩','🧸','🪆','🖼️','🧵','🪡','🧶','🪢',
    ],
  },
  {
    id: 'travel', label: 'Travel & Places',
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵',
      '🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇',
      '🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛸','🚀','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧',
      '🚦','🚥','🛑','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛺','🌁','🌃','🏙️','🌄',
      '🌅','🌆','🌇','🌉','🎑','🏞️','🌌','🌠','🌃','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏗️','🏘️',
      '🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽',
    ],
  },
  {
    id: 'objects', label: 'Objects',
    icon: '💡',
    emojis: [
      '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','💾','💿','📀','🧮','📷','📸','📹','🎥','📽️','🎞️',
      '📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔',
      '🧯','🛢️','💰','💵','💴','💶','💷','🪙','💸','💳','🧾','💹','💱','💲','✉️','📧','📨','📩','📪','📫',
      '📬','📭','📮','🗳️','✏️','✒️','🖋️','🖊️','📝','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊',
      '📋','📌','📍','🗺️','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓',
      '⛏️','⚒️','🛠️','🗡️','⚔️','🔫','🪃','🏹','🛡️','🪚','🔧','🪛','🔩','⚙️','🗜️','🔗','⛓️','🧲','🪜',
      '⚗️','🧪','🧫','🧬','🔭','🔬','🩺','💊','🩹','🩼','💉','🩸','🧬','🔬','🧪','🧫','🩻','🧹','🧺',
    ],
  },
  {
    id: 'symbols', label: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
      '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📵','🚫','🚳','🚭','🚯','🚱','🚷','📵','🔞','❌','⭕','🛑',
      '⛔','📛','🔰','✅','☑️','✔️','❎','🔱','⚜️','🔰','♻️','🔄','🔃','🔙','🔛','🔝','🔜','🔚','⚠️','🚦',
      '🆒','🆕','🆙','🆓','🆖','🅰️','🅱️','🆎','🆑','🅾️','🆘','💤','🔇','🔈','🔉','🔊','📢','📣','🔔','🔕',
      '🎵','🎶','⁉️','🔅','🔆','📶','🔱','⚜️','🏧','💲','©️','®️','™️','💱','🆚','🉐','㊙️','㊗️','🈴',
      '#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','▶️','⏸️','⏹️','⏺️',
    ],
  },
];

function InboxEmojiPicker({
  onSelect,
  onClose,
  pickerRef,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  pickerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('wp_recent_emojis') || '[]'); } catch { return []; }
  });
  const bodyRef = useRef<HTMLDivElement>(null);

  const addToRecent = (emoji: string) => {
    setRecentEmojis(prev => {
      const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 32);
      try { localStorage.setItem('wp_recent_emojis', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  const handleSelect = (emoji: string) => {
    addToRecent(emoji);
    onSelect(emoji);
  };

  const searchResults = search.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => {
        // Simple filter — include emoji if it matches current search character roughly
        return true; // We'll show all and let user browse; deep search needs emoji names db
      }).slice(0, 80)
    : null;

  // Category icons (text emoji as buttons)
  const catIcons = EMOJI_CATEGORIES.map(c => c.icon);

  const displayEmojis = searchResults
    ? searchResults
    : activeCategory === -1
    ? recentEmojis
    : EMOJI_CATEGORIES[activeCategory]?.emojis ?? [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 z-50 w-[340px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
      style={{ height: 380 }}
    >
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-1.5 border border-border">
          <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emoji…"
            className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category label */}
      {!search && (
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {activeCategory === -1 ? 'Recently Used' : EMOJI_CATEGORIES[activeCategory]?.label}
          </span>
        </div>
      )}

      {/* Emoji grid */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
        {displayEmojis.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-muted">No emojis found</p>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {displayEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-surface transition-colors duration-100 active:scale-90"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center justify-around border-t border-border bg-card px-1 py-1.5 flex-shrink-0">
        {/* Recent */}
        <button
          type="button"
          onClick={() => setActiveCategory(-1)}
          title="Recently Used"
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
            activeCategory === -1 ? 'bg-jade/20 text-jade' : 'text-text-muted hover:text-text-primary hover:bg-surface'
          }`}
        >
          🕐
        </button>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(i)}
            title={cat.label}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
              activeCategory === i ? 'bg-jade/20 text-jade' : 'text-text-muted hover:text-text-primary hover:bg-surface'
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Quoted message bubble ────────────────────────────────────────────────────

/** Quoted context rendered INSIDE the message bubble — matches WhatsApp style */
function QuotedBubble({ quoted, isOutbound, onJump }: { quoted: ChatMessage; isOutbound: boolean; onJump?: () => void }) {
  let preview = quoted.content || "";
  if (quoted.type === "template" || preview.startsWith("[Template:")) {
    const m = preview.match(/^\[Template:\s*(.+)\]$/);
    preview = m ? `Template: ${m[1]}` : "Template message";
  } else if (["image", "video", "audio", "document", "sticker"].includes(quoted.type)) {
    preview = `📎 ${quoted.type.charAt(0).toUpperCase() + quoted.type.slice(1)}`;
  } else if (preview === "[button message]") {
    preview = "Button reply";
  }
  if (preview.length > 100) preview = preview.slice(0, 100) + "…";

  return (
    <div
      onClick={onJump}
      className={`border-l-4 pl-3 pr-2 py-1.5 mb-2 rounded-r-lg transition-colors ${
        onJump ? "cursor-pointer hover:opacity-80 active:opacity-60" : ""
      } ${
        isOutbound
          ? "border-background/50 bg-background/10"
          : "border-jade/60 bg-jade/5"
      }`}
    >
      <p className={`text-[11px] font-bold mb-0.5 ${isOutbound ? "text-background/70" : "text-jade"}`}>
        {quoted.direction === "outbound" ? "You" : "Contact"}
      </p>
      <p className={`text-xs leading-snug line-clamp-2 ${isOutbound ? "text-background/60" : "text-text-muted"}`}>
        {preview}
      </p>
    </div>
  );
}

// ─── Inbox Filter Types ───────────────────────────────────────────────────────
interface InboxFilters {
  chatStatus: 'all' | 'open' | 'closed';
  readStatus: 'all' | 'read' | 'unread';
  replyStatus: 'all' | 'unreplied' | 'replied';
  tags: string[];
  lastMsgFrom: string;
  lastMsgTo: string;
}
const DEFAULT_FILTERS: InboxFilters = {
  chatStatus: 'all', readStatus: 'all', replyStatus: 'all',
  tags: [], lastMsgFrom: '', lastMsgTo: '',
};

// ─── Filter Modal ─────────────────────────────────────────────────────────────
function InboxFilterModal({
  pending, setPending, availableTags, onClose, onApply, onReset,
}: {
  pending: InboxFilters;
  setPending: (f: InboxFilters) => void;
  availableTags: string[];
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const [section, setSection] = useState('Chat Status');
  const [tagSearch, setTagSearch] = useState('');

  // Sections with working logic only — no stubs
  const FILTER_SECTIONS = ['Tags', 'Chat Status', 'Reply Status', 'Read/Unread', 'Last Message Time'];

  const filteredTags = availableTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));

  const toggleTag = (tag: string) => {
    const next = pending.tags.includes(tag)
      ? pending.tags.filter(t => t !== tag)
      : [...pending.tags, tag];
    setPending({ ...pending, tags: next });
  };

  const sectionHasValue = (s: string) => {
    if (s === 'Chat Status') return pending.chatStatus !== 'all';
    if (s === 'Read/Unread') return pending.readStatus !== 'all';
    if (s === 'Tags') return pending.tags.length > 0;
    if (s === 'Reply Status') return pending.replyStatus !== 'all';
    if (s === 'Last Message Time') return !!(pending.lastMsgFrom || pending.lastMsgTo);
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-[680px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold font-syne">Filters</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-surface transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-48 border-r border-border flex flex-col overflow-y-auto flex-shrink-0">
            {FILTER_SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex items-center justify-between w-full px-4 py-3.5 text-sm text-left transition-colors border-b border-border/40 ${
                  section === s
                    ? 'bg-jade/10 text-jade font-semibold'
                    : 'text-text-primary hover:bg-surface'
                }`}
              >
                <span>{s}</span>
                {sectionHasValue(s) && (
                  <span className="w-2 h-2 bg-jade rounded-full flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* Tags — filters by contact segment */}
            {section === 'Tags' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Tags</h3>
                  <button onClick={() => setPending({ ...pending, tags: [] })} className="text-xs text-jade hover:underline">Clear</button>
                </div>
                <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2 border border-border">
                  <Search className="w-3.5 h-3.5 text-text-muted" />
                  <input
                    value={tagSearch}
                    onChange={e => setTagSearch(e.target.value)}
                    placeholder="Search Tags"
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
                {filteredTags.length === 0 ? (
                  <p className="text-xs text-text-muted py-3">No tags found. Add contacts with segments to use this filter.</p>
                ) : (
                  <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {filteredTags.map(tag => (
                      <label key={tag} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface rounded-lg px-2 transition-colors">
                        <input
                          type="checkbox"
                          checked={pending.tags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                          className="w-4 h-4 accent-jade"
                        />
                        <span className="text-sm text-text-primary">{tag}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat Status */}
            {section === 'Chat Status' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Chat Status</h3>
                  <button onClick={() => setPending({ ...pending, chatStatus: 'all' })} className="text-xs text-jade hover:underline">Reset</button>
                </div>
                {([
                  { val: 'all', label: 'All Chats' },
                  { val: 'open', label: 'Open Chats' },
                  { val: 'closed', label: 'Closed Chats' },
                ] as const).map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface rounded-lg px-2 transition-colors">
                    <input
                      type="radio"
                      name="chatStatus"
                      checked={pending.chatStatus === val}
                      onChange={() => setPending({ ...pending, chatStatus: val })}
                      className="w-4 h-4 accent-jade"
                    />
                    <span className="text-sm text-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Reply Status — "Unreplied" = has unread inbound messages; "Replied" = no unread */}
            {section === 'Reply Status' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Reply Status</h3>
                  <button onClick={() => setPending({ ...pending, replyStatus: 'all' })} className="text-xs text-jade hover:underline">Reset</button>
                </div>
                {([
                  { val: 'all', label: 'All' },
                  { val: 'unreplied', label: 'Unreplied' },
                  { val: 'replied', label: 'Replied' },
                ] as const).map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface rounded-lg px-2 transition-colors">
                    <input
                      type="radio"
                      name="replyStatus"
                      checked={pending.replyStatus === val}
                      onChange={() => setPending({ ...pending, replyStatus: val })}
                      className="w-4 h-4 accent-jade"
                    />
                    <span className="text-sm text-text-primary">{label}</span>
                  </label>
                ))}
                <p className="text-[11px] text-text-muted px-2 pt-2">
                  Unreplied = conversations with unread messages from the contact.
                </p>
              </div>
            )}

            {/* Read/Unread */}
            {section === 'Read/Unread' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Read / Unread</h3>
                  <button onClick={() => setPending({ ...pending, readStatus: 'all' })} className="text-xs text-jade hover:underline">Reset</button>
                </div>
                {([
                  { val: 'all', label: 'All' },
                  { val: 'read', label: 'Read' },
                  { val: 'unread', label: 'Unread' },
                ] as const).map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface rounded-lg px-2 transition-colors">
                    <input
                      type="radio"
                      name="readStatus"
                      checked={pending.readStatus === val}
                      onChange={() => setPending({ ...pending, readStatus: val })}
                      className="w-4 h-4 accent-jade"
                    />
                    <span className="text-sm text-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Last Message Time */}
            {section === 'Last Message Time' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Last Message Time</h3>
                  <button onClick={() => setPending({ ...pending, lastMsgFrom: '', lastMsgTo: '' })} className="text-xs text-jade hover:underline">Reset</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">From</label>
                    <input
                      type="date"
                      value={pending.lastMsgFrom}
                      onChange={e => setPending({ ...pending, lastMsgFrom: e.target.value })}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-jade"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">To</label>
                    <input
                      type="date"
                      value={pending.lastMsgTo}
                      onChange={e => setPending({ ...pending, lastMsgTo: e.target.value })}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-jade"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onReset}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-primary hover:bg-surface transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-2.5 rounded-xl bg-jade text-background text-sm font-bold hover:bg-jade-hover transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InboxPanel({
  onUnreadChange,
  fullHeight = false,
  initialPhone,
  initialName,
}: {
  onUnreadChange?: (count: number) => void;
  fullHeight?: boolean;
  initialPhone?: string;
  initialName?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState<"text" | "template" | "media">("text");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [sendError, setSendError] = useState<string>("");
  const [templateVarValues, setTemplateVarValues] = useState<string[]>([]);
  const [templateBtnValues, setTemplateBtnValues] = useState<string[]>([]);

  const { role, userId } = useTenant();
  const isAgent = role === 'agent';

  // ── Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<InboxFilters>(DEFAULT_FILTERS);
  // "Assigned to me" quick-filter — defaults ON for agents
  const [assignedToMe, setAssignedToMe] = useState(false);
  useEffect(() => { if (isAgent) setAssignedToMe(true); }, [isAgent]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  // phone (normalized, no +) → segment name — built from contacts+segments fetch
  const [phoneTagMap, setPhoneTagMap] = useState<Record<string, string>>({});
  // phone (normalized) → custom2 tags array — for contact-panel tags filter
  const [phoneCustomTagMap, setPhoneCustomTagMap] = useState<Record<string, string[]>>({});

  // ── Sort state
  type SortMode = 'newest' | 'oldest' | 'shortest_window' | 'longest_window';
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // ── Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── New Chat state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatTemplate, setNewChatTemplate] = useState<Template | null>(null);
  const [newChatVarValues, setNewChatVarValues] = useState<string[]>([]);
  const [newChatBtnValues, setNewChatBtnValues] = useState<string[]>([]);
  const [newChatSending, setNewChatSending] = useState(false);
  const [newChatError, setNewChatError] = useState("");

  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // ── Contact Details panel
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [contactInfo, setContactInfo] = useState<any | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [contactShowMore, setContactShowMore] = useState(false);

  // ── Emoji picker (text reply mode)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Note mode
  const [showNoteArea, setShowNoteArea] = useState(false);

  // ── 24h window: track which conv had template sent (reopens free-text)
  const [reopenedConvId, setReopenedConvId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // ── Quick replies
  interface QuickReply { id: string; title: string; body: string; }
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [showQrForm, setShowQrForm] = useState(false);
  const [qrTitle, setQrTitle] = useState("");
  const [qrBody, setQrBody] = useState("");
  const qrPanelRef = useRef<HTMLDivElement>(null);

  // Load/save quick replies from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('waptrix_quick_replies');
      if (stored) setQuickReplies(JSON.parse(stored));
    } catch { }
  }, []);

  const persistQr = (list: QuickReply[]) => {
    setQuickReplies(list);
    localStorage.setItem('waptrix_quick_replies', JSON.stringify(list));
  };

  const addQuickReply = () => {
    if (!qrTitle.trim() || !qrBody.trim()) return;
    const next: QuickReply[] = [...quickReplies, { id: Date.now().toString(), title: qrTitle.trim(), body: qrBody.trim() }];
    persistQr(next);
    setQrTitle(""); setQrBody(""); setShowQrForm(false);
  };

  const deleteQuickReply = (id: string) => persistQr(quickReplies.filter(r => r.id !== id));

  // Close QR panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (qrPanelRef.current && !qrPanelRef.current.contains(e.target as Node)) {
        setShowQrPanel(false);
        setShowQrForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Contact Activity Timeline
  const [activityData, setActivityData] = useState<{ chatMessages: any[]; campaignLogs: any[] } | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const fetchActivity = async (contactId: string) => {
    setActivityLoading(true);
    setActivityData(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivityData({ chatMessages: data.chatMessages || [], campaignLogs: data.campaignLogs || [] });
      }
    } catch { }
    finally { setActivityLoading(false); }
  };

  // ── Assignment
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assigning, setAssigning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const onUnreadChangeRef = useRef(onUnreadChange);
  const selectConversationRef = useRef<((conv: Conversation) => Promise<void>) | null>(null);
  // ── Stable client: MUST NOT be re-created on every render or realtime breaks
  const supabase = useMemo(() => createClient(), []);

  // Keep refs in sync with latest props/state
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { onUnreadChangeRef.current = onUnreadChange; }, [onUnreadChange]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Notification sound — warm C-E-G chime
  // Jump to a quoted/replied message and briefly highlight it
  const jumpToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 2000);
  }, []);

  // Fetch contact record when conversation changes
  const fetchContact = useCallback(async (phone: string) => {
    setContactLoading(true);
    setContactInfo(null);
    try {
      const res = await fetch(`/api/contacts/by-phone?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' });
      if (!res.ok) { setContactInfo(null); return; }
      const data = await res.json();
      setContactInfo(data ?? null);
    } catch { /* silent */ } finally {
      setContactLoading(false);
    }
  }, []);

  // Close emoji picker on outside click — but NOT when clicking the toggle button
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePicker = emojiPickerRef.current?.contains(target);
      const insideButton = emojiButtonRef.current?.contains(target);
      if (!insidePicker && !insideButton) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  // Emoji constants
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { setReplyText(t => t + emoji); return; }
    const start = el.selectionStart ?? replyText.length;
    const end = el.selectionEnd ?? replyText.length;
    const next = replyText.slice(0, start) + emoji + replyText.slice(end);
    setReplyText(next);
    setShowEmojiPicker(false);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  };

  // Save internal note to chat_messages
  const sendNote = async () => {
    if (!activeConv || !noteText.trim()) return;
    setIsSendingNote(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', content: noteText.trim() }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => [...prev, { ...saved, type: 'note' }]);
        setNoteText('');
      }
    } catch { /* silent */ } finally {
      setIsSendingNote(false);
    }
  };

  const deleteNote = async (msgId: string) => {
    if (!activeConv) return;
    const res = await fetch(`/api/conversations/${activeConv.id}/messages/${msgId}`, { method: 'DELETE' });
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const saveNoteEdit = async (msgId: string) => {
    if (!activeConv || !editingNoteText.trim()) return;
    const res = await fetch(`/api/conversations/${activeConv.id}/messages/${msgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editingNoteText.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updated.content } : m));
      setEditingNoteId(null);
    }
  };

  // Ensure a contact record exists — creates one if not found, returns the id
  const ensureContact = async (): Promise<string | null> => {
    if (contactInfo?.id) return contactInfo.id;
    if (!activeConv) return null;
    // Auto-create a minimal contact record for this phone number
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeConv.contact_name || activeConv.contact_phone,
          phone: activeConv.contact_phone,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setContactInfo(created);
        return created.id;
      }
      // 409 = contact already exists (duplicate phone) — re-fetch it by phone
      if (res.status === 409) {
        const errData = await res.json().catch(() => ({}));
        if (errData.existing_id) return errData.existing_id;
        // fallback: re-fetch via by-phone
        if (activeConv.contact_phone) {
          const byPhone = await fetch(`/api/contacts/by-phone?phone=${encodeURIComponent(activeConv.contact_phone)}`, { cache: 'no-store' });
          if (byPhone.ok) {
            const c = await byPhone.json();
            if (c?.id) { setContactInfo(c); return c.id; }
          }
        }
      }
    } catch (err: any) {
      console.error('[ensureContact] error:', err.message);
    }
    return null;
  };

  // Update contact tags
  const updateContactTags = async (tags: string[]) => {
    const id = await ensureContact();
    if (!id) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContactInfo(updated);
      }
    } catch { /* silent */ }
  };


  const assignConversation = async (memberId: string | null, memberEmail: string | null) => {
    if (!activeConv) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: memberId, assigned_name: memberEmail }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveConv(prev => prev ? { ...prev, assigned_to: updated.assigned_to, assigned_name: updated.assigned_name } : prev);
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, assigned_to: updated.assigned_to, assigned_name: updated.assigned_name } : c));
      }
    } catch { /* silent */ } finally {
      setAssigning(false);
    }
  };

  const playNotificationSound = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      const play = () => {
        const t = ctx.currentTime;
        [
          { freq: 523.25, delay: 0,    dur: 0.45 },
          { freq: 659.25, delay: 0.10, dur: 0.45 },
          { freq: 783.99, delay: 0.20, dur: 0.60 },
        ].forEach(({ freq, delay, dur }) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, t + delay);
          gain.gain.linearRampToValueAtTime(0.22, t + delay + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
          osc.start(t + delay);
          osc.stop(t + delay + dur + 0.05);
        });
      };
      ctx.state === 'suspended' ? ctx.resume().then(play) : play();
    } catch (_) {}
  }, []);

  // ── Unlock AudioContext on any user interaction
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // ── Fetch conversations
  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data: Conversation[] = await res.json();
      setConversations(data);
      const total = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      onUnreadChange?.(total);
    }
    setLoadingConvs(false);
  }, [onUnreadChange]);

  // ── Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) {
      const data: ChatMessage[] = await res.json();
      setMessages(data);
      // Always scroll to bottom (most recent) when loading a conversation
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    }
    setLoadingMsgs(false);
  }, []);

  // ── Fetch approved templates
  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data: Template[] = await res.json();
      setTemplates(data.filter((t) => t.meta_status === "APPROVED"));
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
    // Fetch team members for assignment dropdown
    fetch('/api/team').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTeamMembers(d.filter((m: TeamMember) => m.status === 'active'));
    }).catch(() => {});
    // Fetch segments + contacts to build phone→segmentName map for Tags filter
    Promise.all([
      fetch('/api/contacts/segments').then(r => r.json()).catch(() => []),
      fetch('/api/contacts').then(r => r.json()).catch(() => []),
    ]).then(([segments, contacts]) => {
      const segMap: Record<string, string> = {};
      const segTagNames: string[] = [];
      if (Array.isArray(segments)) {
        segments.forEach((s: any) => { if (s.name) { segMap[s.id] = s.name; segTagNames.push(s.name); } });
      }
      const pMap: Record<string, string> = {};
      const cTagMap: Record<string, string[]> = {};
      const customTagSet = new Set<string>();
      if (Array.isArray(contacts)) {
        contacts.forEach((c: any) => {
          if (!c.phone) return;
          const norm = (c.phone as string).replace(/^\+/, '').replace(/\s/g, '');
          if (c.segment_id && segMap[c.segment_id]) pMap[norm] = segMap[c.segment_id];
          if (c.custom2) {
            const tags = (c.custom2 as string).split(',').map((t: string) => t.trim()).filter(Boolean);
            cTagMap[norm] = tags;
            tags.forEach(t => customTagSet.add(t));
          }
        });
      }
      setPhoneTagMap(pMap);
      setPhoneCustomTagMap(cTagMap);
      setAvailableTags([...new Set([...segTagNames, ...Array.from(customTagSet)])]);
    });
  }, [fetchConversations, fetchTemplates]);

  // ── Auto-select conversation when initialPhone is provided (from contacts page)
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (!initialPhone || didAutoSelect.current || loadingConvs) return;
    didAutoSelect.current = true;

    const clean = initialPhone.replace(/\D/g, "");
    const match = conversations.find((c) => c.contact_phone.replace(/\D/g, "") === clean);
    if (match) {
      selectConversationRef.current?.(match);
    } else {
      // No existing conversation — find or create one silently, then open it
      fetch('/api/conversations/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: initialPhone, name: initialName }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.conversation) {
            const conv: Conversation = data.conversation;
            setConversations(prev =>
              prev.find((c: Conversation) => c.id === conv.id) ? prev : [conv, ...prev]
            );
            selectConversationRef.current?.(conv);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone, initialName, conversations, loadingConvs]);

  // ── Polling fallback — guarantees updates even if Supabase Realtime is down
  useEffect(() => {
    const poll = async () => {
      // Refresh conversations and check for new unread
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const fresh: Conversation[] = await res.json();

      const newTotal = fresh.reduce((s, c) => s + (c.unread_count || 0), 0);

      setConversations(prev => {
        const prevUnread = prev.reduce((s, c) => s + (c.unread_count || 0), 0);
        if (newTotal > prevUnread) playNotificationSound();
        const changed = JSON.stringify(fresh.map(c => `${c.id}:${c.last_message_at}:${c.unread_count}`))
                     !== JSON.stringify(prev.map(c => `${c.id}:${c.last_message_at}:${c.unread_count}`));
        return changed ? fresh : prev;
      });

      // Always sync sidebar badge with latest server count
      onUnreadChangeRef.current?.(newTotal);

      // Refresh active conversation messages
      const conv = activeConvRef.current;
      if (!conv) return;
      const mRes = await fetch(`/api/conversations/${conv.id}/messages`);
      if (!mRes.ok) return;
      const freshMsgs: ChatMessage[] = await mRes.json();
      setMessages(prev => {
        if (freshMsgs.length === prev.filter(m => !m.id.startsWith('temp-')).length) return prev;
        // Merge: keep optimistic temp messages, add new real ones
        const realIds = new Set(prev.filter(m => !m.id.startsWith('temp-')).map(m => m.id));
        const newReal = freshMsgs.filter(m => !realIds.has(m.id));
        return newReal.length > 0 ? [...prev.filter(m => !m.id.startsWith('temp-')), ...freshMsgs.slice(-200)] : prev;
      });
    };

    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [playNotificationSound]);

  // ── Select a conversation
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConv(conv);
      setReplyText("");
      setMediaFile(null);
      setMediaPreview("");
      setSelectedTemplate(null);
      await fetchMessages(conv.id);

      // Mark as read
      if (conv.unread_count > 0) {
        await fetch(`/api/conversations/${conv.id}/mark-read`, { method: "POST" });
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
        onUnreadChange?.(
          conversations.reduce(
            (sum, c) => sum + (c.id === conv.id ? 0 : c.unread_count || 0),
            0
          )
        );
      }
    },
    [fetchMessages, conversations, onUnreadChange]
  );
  // Keep ref always pointing to the latest version (safe to do inline after declaration)
  selectConversationRef.current = selectConversation;

  // ── Scroll to bottom only when user is already near bottom (prevents stealing scroll)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    // Auto-scroll only if within 200px of bottom (user hasn't scrolled up to read history)
    if (distFromBottom < 200) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Fetch contact + load conversation note when conversation changes
  useEffect(() => {
    if (activeConv?.contact_phone) {
      fetchContact(activeConv.contact_phone);
    } else {
      setContactInfo(null);
    }
    // Reset activity when switching conversations
    setActivityData(null);
    setShowActivity(false);
    setReopenedConvId(null);
  }, [activeConv?.id]); // eslint-disable-line

  // ── Supabase Realtime — single stable subscription (no re-mount on conv change)
  // Uses activeConvRef to avoid stale closures when switching conversations.
  useEffect(() => {
    const channel = supabase
      .channel(`inbox-${Date.now()}`) // unique name prevents ghost subscriptions
      // New inbound/outbound messages
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        const currentConv = activeConvRef.current;

        // Append to active conversation's message list
        if (newMsg.conversation_id === currentConv?.id) {
          setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }

        if (newMsg.direction === "inbound") {
          playNotificationSound();
          setConversations((prev) => {
            const exists = prev.find((c) => c.id === newMsg.conversation_id);
            if (!exists) {
              fetchConversations();
              return prev;
            }
            return prev
              .map((c) => c.id === newMsg.conversation_id ? {
                ...c,
                last_message: newMsg.content,
                last_message_at: newMsg.created_at,
                unread_count: currentConv?.id === c.id ? 0 : (c.unread_count || 0) + 1,
              } : c)
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });

          // ── Smart re-fetch: auto-replies fire ~1s after inbound message.
          // Schedule a messages re-fetch after 3s to catch any auto-reply that
          // Supabase Realtime might miss due to serverless timing.
          setTimeout(() => {
            const conv = activeConvRef.current;
            if (conv && conv.id === newMsg.conversation_id) {
              fetch(`/api/conversations/${conv.id}/messages`)
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (Array.isArray(data)) setMessages(data); })
                .catch(() => {});
            }
          }, 3000);

        } else if (newMsg.direction === "outbound") {
          // Auto-replies and sent messages — update sidebar preview too
          setConversations((prev) =>
            prev
              .map((c) => c.id === newMsg.conversation_id ? {
                ...c,
                last_message: newMsg.content,
                last_message_at: newMsg.created_at,
              } : c)
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
          );
        }
      })
      // Message status updates (sent → delivered → read)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload: any) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, status: updated.status } : m));
      })
      // New conversations (first message from a new contact)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, (payload: any) => {
        const newConv = payload.new as Conversation;
        setConversations((prev) => prev.find((c) => c.id === newConv.id) ? prev : [newConv, ...prev]);
      })
      // Conversation updates (last_message, unread_count)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload: any) => {
        const updated = payload.new as Conversation;
        setConversations((prev) =>
          prev
            .map((c) => c.id === updated.id ? { ...c, ...updated } : c)
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        );
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') console.log('Inbox realtime connected');
        // CHANNEL_ERROR is expected for team members (agents/admins) whose anon JWT
        // doesn't match the owner's tenant_id in RLS — polling still works fine.
        if (status === 'CHANNEL_ERROR') console.warn('Inbox realtime: falling back to polling (team member session)');
      });

    return () => { supabase.removeChannel(channel); };
  }, []); // ← empty deps: subscribe ONCE for the lifetime of the component

  // ── Send reply — optimistic UI for instant feel
  const sendReply = async () => {
    if (!activeConv) return;
    if (replyMode === "text" && !replyText.trim()) return;
    if (replyMode === "template" && !selectedTemplate) return;
    if (replyMode === "media" && !mediaFile && !mediaPreview) return;

    let body: any = {};
    let optimisticContent = "";

    if (replyMode === "text") {
      optimisticContent = replyText.trim();
      body = { type: "text", content: optimisticContent };
    } else if (replyMode === "template" && selectedTemplate) {
      optimisticContent = `[Template: ${selectedTemplate.name}]`;

      // Header component — required for IMAGE/VIDEO/DOCUMENT headers on every send
      const headerComponents: any[] = [];
      if (
        selectedTemplate.header_type &&
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(selectedTemplate.header_type) &&
        selectedTemplate.header_text?.startsWith("https://")
      ) {
        const mediaType = selectedTemplate.header_type.toLowerCase(); // "image" | "video" | "document"
        headerComponents.push({
          type: "header",
          parameters: [{ type: mediaType, [mediaType]: { link: selectedTemplate.header_text } }],
        });
      }

      const vars = extractTemplateVars(selectedTemplate.body);
      const bodyComponents = vars.length > 0
        ? [{ type: "body", parameters: templateVarValues.map(v => ({ type: "text", text: v || " " })) }]
        : [];
      const btnIndices = urlButtonIndices(selectedTemplate.buttons);
      const btnComponents = btnIndices.map((btnIdx, i) => ({
        type: "button",
        sub_type: "url",
        index: String(btnIdx),
        parameters: [{ type: "text", text: templateBtnValues[i] || "" }],
      }));
      body = {
        type: "template",
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language || "en_US",
        components: [...headerComponents, ...bodyComponents, ...btnComponents],
      };
    } else if (replyMode === "media" && mediaFile) {
      const mediaType = mediaFile.type.startsWith("image/") ? "image"
        : mediaFile.type.startsWith("video/") ? "video"
        : mediaFile.type.startsWith("audio/") ? "audio"
        : "document";
      optimisticContent = `[${mediaType}]`;

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(mediaFile);
      });
      body = { type: mediaType, mediaUrl: dataUrl, mediaMimeType: mediaFile.type };
    }

    // ── Optimistic: show message instantly with "sending" status
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: activeConv.id,
      direction: "outbound",
      type: body.type || "text",
      content: optimisticContent,
      // For media: use local object URL so image shows immediately
      media_url: replyMode === "media" && mediaPreview ? mediaPreview : undefined,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyText("");
    setMediaFile(null);
    setMediaPreview("");
    setSelectedTemplate(null);
    setTemplateVarValues([]);
    setTemplateBtnValues([]);
    setSendError("");

    setIsSending(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        // Replace optimistic message with failed status
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...m, status: "failed" } : m)
        );
        setSendError(data.error || "Failed to send message. Please try again.");
        return;
      }

      // Replace optimistic message with real one from server
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...data, id: data.id || tempId } : m)
      );

      // If template was sent while 24h window was expired, unlock free-text for this conv
      if (replyMode === 'template') {
        setReopenedConvId(activeConv.id);
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message: optimisticContent, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, status: "failed" } : m)
      );
      setSendError(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Handle media file pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    } else {
      setMediaPreview("");
    }
    setReplyMode("media");
  };

  // ── Start a new conversation with any phone number via template message
  const handleStartConversation = async () => {
    if (!newChatPhone.trim()) { setNewChatError("Phone number is required."); return; }
    if (!newChatTemplate) { setNewChatError("Select a template — WhatsApp requires a template to start a new conversation."); return; }
    setNewChatError("");
    setNewChatSending(true);
    try {
      // Header component for media templates
      const newChatHeaderComponents: any[] = [];
      if (
        newChatTemplate.header_type &&
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(newChatTemplate.header_type) &&
        newChatTemplate.header_text?.startsWith("https://")
      ) {
        const mediaType = newChatTemplate.header_type.toLowerCase();
        newChatHeaderComponents.push({
          type: "header",
          parameters: [{ type: mediaType, [mediaType]: { link: newChatTemplate.header_text } }],
        });
      }

      const newChatVars = extractTemplateVars(newChatTemplate.body);
      const newChatBodyComponents = newChatVars.length > 0
        ? [{ type: "body", parameters: newChatVarValues.map(v => ({ type: "text", text: v || " " })) }]
        : [];
      const newChatBtnIndices = urlButtonIndices(newChatTemplate.buttons);
      const newChatBtnComponents = newChatBtnIndices.map((btnIdx, i) => ({
        type: "button",
        sub_type: "url",
        index: String(btnIdx),
        parameters: [{ type: "text", text: newChatBtnValues[i] || "" }],
      }));
      const newChatComponents = [...newChatHeaderComponents, ...newChatBodyComponents, ...newChatBtnComponents];
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newChatPhone.trim(),
          contactName: newChatName.trim() || undefined,
          templateName: newChatTemplate.name,
          languageCode: newChatTemplate.language || "en_US",
          components: newChatComponents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewChatError(data.error || "Failed to start conversation.");
        return;
      }
      // Add/refresh the conversation in the list and select it
      const conv: Conversation = data.conversation;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        if (exists) return prev.map((c) => c.id === conv.id ? { ...c, ...conv } : c);
        return [conv, ...prev];
      });
      setShowNewChat(false);
      setNewChatPhone("");
      setNewChatName("");
      setNewChatTemplate(null);
      setNewChatVarValues([]);
      setNewChatBtnValues([]);
      selectConversation(conv);
    } catch (err: any) {
      setNewChatError(err.message || "Failed to start conversation.");
    } finally {
      setNewChatSending(false);
    }
  };

  const activeFilterCount = [
    appliedFilters.chatStatus !== 'all',
    appliedFilters.readStatus !== 'all',
    appliedFilters.replyStatus !== 'all',
    appliedFilters.tags.length > 0,
    !!(appliedFilters.lastMsgFrom || appliedFilters.lastMsgTo),
    assignedToMe,
  ].filter(Boolean).length;

  const filteredConversations = conversations.filter((c) => {
    // "Assigned to me" quick filter
    if (assignedToMe && userId && c.assigned_to !== userId) return false;

    // Search
    const q = searchQuery.toLowerCase();
    if (q && !c.contact_name.toLowerCase().includes(q) && !c.contact_phone.includes(q)) return false;

    const convStatus = c.status || 'open';

    // Chat Status filter — when set to 'all', still hide closed chats (only show via explicit 'closed' filter)
    if (appliedFilters.chatStatus === 'all') {
      if (convStatus === 'closed') return false;
    } else {
      if (convStatus !== appliedFilters.chatStatus) return false;
    }

    // Read/Unread — unread_count > 0 means the contact sent messages we haven't read yet
    const unread = Number(c.unread_count) || 0;
    if (appliedFilters.readStatus === 'read'   && unread > 0) return false;
    if (appliedFilters.readStatus === 'unread' && unread === 0) return false;

    // Reply Status — "Unreplied" = has unread; "Replied" = all read
    if (appliedFilters.replyStatus === 'unreplied' && unread === 0) return false;
    if (appliedFilters.replyStatus === 'replied'   && unread > 0)  return false;

    // Tags — check both segment-based tags and custom2 contact tags
    if (appliedFilters.tags.length > 0) {
      const norm = c.contact_phone.replace(/^\+/, '').replace(/\s/g, '');
      const segTag = phoneTagMap[norm];
      const customTags = phoneCustomTagMap[norm] || [];
      const hasMatch = appliedFilters.tags.some(t => t === segTag || customTags.includes(t));
      if (!hasMatch) return false;
    }

    // Last Message Time — date range on last_message_at
    if (appliedFilters.lastMsgFrom) {
      if (new Date(c.last_message_at) < new Date(appliedFilters.lastMsgFrom)) return false;
    }
    if (appliedFilters.lastMsgTo) {
      const to = new Date(appliedFilters.lastMsgTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(c.last_message_at) > to) return false;
    }

    return true;
  });

  // ── Apply sort to filtered list
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (sortMode === 'newest') return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    if (sortMode === 'oldest') return new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime();
    // Response window: approximated by last_message_at when contact has unread (inbound) messages.
    // Shortest window = unread chats with oldest last message (24hr window almost expired)
    if (sortMode === 'shortest_window') {
      const aHasWindow = (a.unread_count || 0) > 0;
      const bHasWindow = (b.unread_count || 0) > 0;
      if (aHasWindow && !bHasWindow) return -1;
      if (!aHasWindow && bHasWindow) return 1;
      return new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime();
    }
    // Longest window = unread chats with newest last message (most time remaining in 24hr window)
    if (sortMode === 'longest_window') {
      const aHasWindow = (a.unread_count || 0) > 0;
      const bHasWindow = (b.unread_count || 0) > 0;
      if (aHasWindow && !bHasWindow) return -1;
      if (!aHasWindow && bHasWindow) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    }
    return 0;
  });

  // ── Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => !selectedIds.has(c.id)));
        if (activeConv && selectedIds.has(activeConv.id)) setActiveConv(null);
        setSelectedIds(new Set());
        setBulkMode(false);
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const SORT_OPTIONS: { key: SortMode; label: string }[] = [
    { key: 'newest', label: 'Newest Customer Message' },
    { key: 'oldest', label: 'Oldest Customer Message' },
    { key: 'shortest_window', label: 'Shortest Response Window' },
    { key: 'longest_window', label: 'Longest Response Window' },
  ];

  const messageGroups = groupByDate(messages);
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-jade/10 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-jade" />
          </div>
          <span className="font-bold font-syne text-sm">
            {totalUnread > 0 ? `${totalUnread} unread` : "Inbox"}
          </span>
        </div>
        <button
          onClick={() => { setShowNewChat(true); setNewChatError(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-jade text-background text-xs font-bold rounded-xl hover:bg-jade-hover transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          title="Start a new conversation"
        >
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
      </div>

      <div className={`flex ${fullHeight ? "flex-1 min-h-0" : "h-[600px]"}`}>
        {/* ── Left: Conversation List ────────────────────────────── */}
        <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
          {/* Search + Filter + Sort + Bulk */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2 border border-border">
              <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
            {/* "Assigned to me" quick filter chip */}
            <button
              onClick={() => setAssignedToMe(v => !v)}
              className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                assignedToMe
                  ? 'bg-[#25D366]/10 border-[#25D366]/30 text-[#075E54]'
                  : 'bg-surface border-border text-text-muted hover:text-text-primary'
              }`}
            >
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Assigned to me</span>
              {assignedToMe && <span className="ml-auto w-2 h-2 rounded-full bg-[#25D366]" />}
            </button>

            <div className="flex items-center gap-2">
              {/* Filter button */}
              <button
                onClick={() => { setPendingFilters(appliedFilters); setShowFilters(true); }}
                className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  activeFilterCount > 0
                    ? 'bg-jade/10 border-jade/30 text-jade'
                    : 'bg-surface border-border text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-jade text-background text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              {/* Sort button */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setShowSortMenu(v => !v)}
                  title="Sort conversations"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                    sortMode !== 'newest'
                      ? 'bg-jade/10 border-jade/30 text-jade'
                      : 'bg-surface border-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-10 z-40 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">Sort By</p>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortMode(opt.key); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                          sortMode === opt.key
                            ? 'bg-jade/10 text-jade font-semibold'
                            : 'text-text-primary hover:bg-surface'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk select toggle */}
              <button
                onClick={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }}
                title={bulkMode ? 'Exit bulk select' : 'Bulk select'}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                  bulkMode
                    ? 'bg-jade/10 border-jade/30 text-jade'
                    : 'bg-surface border-border text-text-muted hover:text-text-primary'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bulk action bar */}
            {bulkMode && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-text-muted">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Tap to select'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allIds = new Set(sortedConversations.map(c => c.id));
                      setSelectedIds(selectedIds.size === sortedConversations.length ? new Set() : allIds);
                    }}
                    className="text-xs text-jade hover:underline"
                  >
                    {selectedIds.size === sortedConversations.length ? 'Deselect all' : 'Select all'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-jade animate-spin" />
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                <MessageSquare className="w-10 h-10 text-text-muted opacity-30 mb-3" />
                <p className="text-sm text-text-muted font-medium">No conversations yet</p>
                <p className="text-[11px] text-text-muted mt-1">
                  Messages from customers will appear here
                </p>
              </div>
            ) : (
              sortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (bulkMode) {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.has(conv.id) ? next.delete(conv.id) : next.add(conv.id);
                        return next;
                      });
                    } else {
                      selectConversation(conv);
                    }
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/50 hover:bg-card transition-colors cursor-pointer ${
                    !bulkMode && activeConv?.id === conv.id ? "bg-jade/5 border-l-2 border-l-jade" : ""
                  } ${bulkMode && selectedIds.has(conv.id) ? "bg-jade/5" : ""}`}
                >
                  {/* Checkbox in bulk mode, Avatar otherwise */}
                  {bulkMode ? (
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                      {selectedIds.has(conv.id)
                        ? <CheckSquare className="w-5 h-5 text-jade" />
                        : <Square className="w-5 h-5 text-text-muted" />
                      }
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-jade/20 text-jade font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {avatarInitials(conv.contact_name || conv.contact_phone)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {conv.contact_name || conv.contact_phone}
                      </span>
                      <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                        {formatConvTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-text-muted truncate">
                        {conv.last_message || "No messages yet"}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-jade text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Chat View + Contact Panel ─────────────────── */}
        {activeConv ? (
          <div className="flex-1 flex min-w-0 overflow-hidden">
          {/* Chat column */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-jade/20 text-jade font-bold text-sm flex items-center justify-center">
                  {avatarInitials(activeConv.contact_name || activeConv.contact_phone)}
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {activeConv.contact_name || activeConv.contact_phone}
                  </p>
                  <p className="text-[11px] text-text-muted">{activeConv.contact_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Close / Reopen chat */}
                <div className="relative group">
                  <button
                    onClick={async () => {
                      if (!activeConv) return;
                      const newStatus = (activeConv.status || 'open') === 'open' ? 'closed' : 'open';
                      const res = await fetch(`/api/conversations/${activeConv.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                      });
                      if (res.ok) {
                        setConversations(prev =>
                          prev.map(c => c.id === activeConv.id ? { ...c, status: newStatus } : c)
                        );
                        setActiveConv(prev => prev ? { ...prev, status: newStatus } : prev);
                        // Inject a local system event message in the chat
                        const systemMsg = {
                          id: `sys-${Date.now()}`,
                          conversation_id: activeConv.id,
                          direction: 'outbound' as const,
                          type: 'system',
                          content: newStatus === 'closed' ? 'You closed this chat' : 'You reopened this chat',
                          created_at: new Date().toISOString(),
                          status: 'sent',
                        };
                        setMessages(prev => [...prev, systemMsg as any]);
                      }
                    }}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                      (activeConv?.status || 'open') === 'closed'
                        ? 'bg-jade/10 border-jade/30 text-jade'
                        : 'bg-surface border-border text-text-muted hover:border-rose-400/40 hover:text-rose-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="pointer-events-none absolute top-full right-0 mt-1.5 px-2 py-1 bg-[#111B21] text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    {(activeConv?.status || 'open') === 'open' ? 'Close Chat' : 'Reopen Chat'}
                  </div>
                </div>
                {/* Toggle contact panel */}
                <div className="relative group">
                  <button
                    onClick={() => setShowContactPanel(v => !v)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                      showContactPanel
                        ? 'bg-jade/10 border-jade/30 text-jade'
                        : 'bg-surface border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <div className="pointer-events-none absolute top-full right-0 mt-1.5 px-2 py-1 bg-[#111B21] text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Contact Details
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar bg-background/40">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-jade animate-spin" />
                </div>
              ) : messageGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-text-muted opacity-30 mb-3" />
                  <p className="text-sm text-text-muted">No messages yet</p>
                  <p className="text-xs text-text-muted mt-1">Send the first message below</p>
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={`${group.label}-${gi}`}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider px-2">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-2">
                      {group.messages.map((msg) => {
                        const isOutbound = msg.direction === "outbound";
                        // System events — tiny centered text, no bubble
                        if (msg.type === 'system') {
                          return (
                            <div key={msg.id} className="flex items-center justify-center py-1">
                              <span className="text-[11px] text-text-muted italic">{msg.content}</span>
                            </div>
                          );
                        }
                        // Internal notes — render specially
                        if (msg.type === 'note') {
                          return (
                            <div key={msg.id} id={`msg-${msg.id}`}
                              className={`flex justify-center transition-all duration-300 ${highlightedMsgId === msg.id ? 'rounded-xl ring-2 ring-amber-400/40' : ''}`}
                            >
                              <div className="max-w-[70%] bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <StickyNote className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Internal Note</span>
                                </div>
                                <ReadMoreText text={msg.content} className="text-amber-800" noteStyle />
                                <p className="text-[10px] text-amber-400/60 mt-1 text-right">{formatMsgTime(msg.created_at)}</p>
                              </div>
                            </div>
                          );
                        }
                        // Find the message being replied to (matched by meta_message_id)
                        const quotedMsg = msg.replied_to_message_id
                          ? messages.find(m => m.meta_message_id === msg.replied_to_message_id)
                          : null;
                        const isTemplate = msg.type === "template" || !!msg.content?.startsWith("[Template:");
                        return (
                        <div key={msg.id} id={`msg-${msg.id}`}
                          className={`transition-all duration-300 ${highlightedMsgId === msg.id ? 'rounded-xl ring-2 ring-jade/60 bg-jade/5' : ''}`}
                        >
                        <div
                          className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl ${
                              isTemplate
                                ? "overflow-hidden shadow-sm"
                                : msg.direction === "outbound"
                                  ? "px-4 py-2.5 bg-jade text-background rounded-br-sm"
                                  : "px-4 py-2.5 bg-card border border-border text-text-primary rounded-bl-sm"
                            }`}
                          >
                            {/* Quoted context — inside the bubble */}
                            {quotedMsg && (
                              <QuotedBubble quoted={quotedMsg} isOutbound={isOutbound} onJump={() => jumpToMessage(quotedMsg.id)} />
                            )}

                            {/* Media rendering */}
                            {msg.type === "image" && (msg.media_id || msg.media_url) && (() => {
                              const src = msg.media_url || `/api/whatsapp/media/${msg.media_id}`;
                              return (
                                <div className="mb-2 rounded-xl overflow-hidden max-w-[240px]">
                                  <img
                                    src={src}
                                    alt="Photo"
                                    className="w-full h-auto object-cover rounded-xl cursor-pointer"
                                    onClick={() => window.open(src, '_blank')}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                </div>
                              );
                            })()}
                            {msg.type === "video" && (msg.media_id || msg.media_url) && (
                              <div className="mb-2 rounded-xl overflow-hidden max-w-[240px]">
                                <video
                                  controls
                                  className="w-full h-auto rounded-xl"
                                  src={msg.media_url || `/api/whatsapp/media/${msg.media_id}`}
                                />
                              </div>
                            )}
                            {msg.type === "audio" && (msg.media_id || msg.media_url) && (
                              <div className="mb-2">
                                <audio controls className="w-full max-w-[220px]"
                                  src={msg.media_url || `/api/whatsapp/media/${msg.media_id}`} />
                              </div>
                            )}
                            {msg.type === "document" && (msg.media_id || msg.media_url) && (() => {
                              const href = msg.media_url || `/api/whatsapp/media/${msg.media_id}`;
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                  className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-xl border ${
                                    msg.direction === "outbound"
                                      ? "border-background/20 text-background/80 hover:text-background"
                                      : "border-border text-text-muted hover:text-text-primary"
                                  } transition-colors`}
                                >
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs font-medium truncate max-w-[160px]">
                                    {msg.content || "Document"}
                                  </span>
                                  <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                                </a>
                              );
                            })()}
                            {msg.type === "sticker" && (msg.media_id || msg.media_url) && (
                              <div className="mb-2 w-20 h-20">
                                <img
                                  src={msg.media_url || `/api/whatsapp/media/${msg.media_id}`}
                                  alt="Sticker"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            {/* Template message bubble */}
                            {(msg.type === "template" || msg.content?.startsWith("[Template:")) && (() => {
                              // Prefer the stored template_name (set by campaign & inbox send).
                              // Fall back to parsing [Template: name] from old-style content.
                              const storedName = msg.template_name;
                              const legacyMatch = msg.content?.match(/^\[Template:\s*(.+)\]$/);
                              const legacyName = legacyMatch?.[1]?.trim();
                              const tplName = storedName || legacyName;

                              // Case-insensitive lookup — template names are normalized to lowercase_underscore
                              const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
                              let tpl = templates.find(t =>
                                t.name === tplName ||
                                normalize(t.name) === normalize(tplName || '')
                              );

                              // Fallback for old messages that have no template_name stored:
                              // match by body prefix (ignoring {{N}} variables), first 40 chars
                              if (!tpl && msg.content && !legacyMatch) {
                                const stripVars = (s: string) => (s || '').replace(/\{\{\d+\}\}/g, '').trim();
                                const contentPrefix = stripVars(msg.content).slice(0, 40).toLowerCase();
                                tpl = templates.find(t =>
                                  contentPrefix.length > 10 &&
                                  stripVars(t.body).slice(0, 40).toLowerCase() === contentPrefix
                                );
                              }

                              // resolvedBody: use msg.content when it's a resolved body (no raw {{N}}).
                              // If content still has {{N}} (old message), let TemplateBubble show the
                              // template's own body field instead (better than showing raw variables).
                              const hasUnresolvedVars = /\{\{\d+\}\}/.test(msg.content || '');
                              const resolvedBody = (!legacyMatch && msg.content && msg.type === 'template' && !hasUnresolvedVars)
                                ? msg.content
                                : undefined;

                              return tpl ? (
                                <TemplateBubble
                                  template={tpl}
                                  resolvedBody={resolvedBody}
                                  time={formatMsgTime(msg.created_at)}
                                  statusEl={msg.direction === 'outbound' ? <StatusIcon status={msg.status} /> : undefined}
                                />
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words opacity-70 italic">
                                  {tplName ? `Template: ${tplName}` : msg.content}
                                </p>
                              );
                            })()}

                            {/* Button reply (quick reply tap) — render as plain text */}
                            {(msg.type === "button" || msg.content === "[button message]") && (
                              <p className="text-sm font-medium">
                                {msg.content === "[button message]" ? "—" : msg.content}
                              </p>
                            )}

                            {/* Text content — show for text messages and as caption for media */}
                            {msg.type !== "template" && msg.type !== "button" &&
                             msg.content !== "[button message]" &&
                             !msg.content?.startsWith("[Template:") &&
                             (msg.type === "text" || (msg.content && !["[image]","[video]","[audio]","[document]","[sticker]"].includes(msg.content))) && (
                              <ReadMoreText text={msg.content} />
                            )}

                            {!isTemplate && (
                              <div
                                className={`flex items-center gap-1 mt-1 ${
                                  msg.direction === "outbound" ? "justify-end" : "justify-start"
                                }`}
                              >
                                <span
                                  className={`text-[10px] ${
                                    msg.direction === "outbound" ? "text-background/60" : "text-text-muted"
                                  }`}
                                >
                                  {formatMsgTime(msg.created_at)}
                                </span>
                                {msg.direction === "outbound" && (
                                  <StatusIcon status={msg.status} />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Reply bar ──────────────────────────────────────── */}
            <div className="border-t border-border bg-card p-4 space-y-3">
              {/* Send error */}
              {sendError && (
                <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{sendError}</span>
                  <button onClick={() => setSendError("")} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              )}
              {/* Mode tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {(["text", "template", "media"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setReplyMode(mode);
                      setReplyText("");
                      setMediaFile(null);
                      setMediaPreview("");
                      setSelectedTemplate(null);
                      setShowEmojiPicker(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                      replyMode === mode
                        ? "bg-jade text-background"
                        : "text-text-muted hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
                {/* Note toggle */}
                <button
                  onClick={() => setShowNoteArea(v => !v)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    showNoteArea
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-text-muted hover:text-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  <StickyNote className="w-3 h-3" /> Note
                </button>
                <span className="ml-auto text-[10px] text-text-muted">
                  {replyMode === "text" && "Free-text (within 24h window)"}
                  {replyMode === "template" && "Works outside 24h window"}
                  {replyMode === "media" && "Send image, video, or document"}
                </span>
              </div>

              {/* Internal Note area */}
              {showNoteArea && (
                <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Internal Note</span>
                    <span className="text-[10px] text-text-muted ml-1">— not sent to customer</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNote(); } }}
                      placeholder="Add an internal note for your team…"
                      className="flex-1 bg-surface border border-amber-500/20 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/40 resize-none"
                    />
                    <button
                      onClick={sendNote}
                      disabled={isSendingNote || !noteText.trim()}
                      className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-amber-400 transition-colors flex-shrink-0"
                    >
                      {isSendingNote ? <Loader2 className="w-4 h-4 text-background animate-spin" /> : <Send className="w-4 h-4 text-background" />}
                    </button>
                  </div>
                </div>
              )}

              {/* TEXT mode */}
              {replyMode === "text" && (() => {
                const lastMsgAt = activeConv?.last_message_at;
                const hoursSince = lastMsgAt
                  ? (Date.now() - new Date(lastMsgAt).getTime()) / 3_600_000
                  : 0;
                const windowExpired = hoursSince >= 24 && reopenedConvId !== activeConv?.id;

                if (windowExpired) {
                  return (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Clock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-400">24-hour messaging window expired</p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Last message was {hoursSince >= 48
                              ? `${Math.floor(hoursSince / 24)} days ago`
                              : `${Math.floor(hoursSince)}h ago`}. Send a template first to reopen the conversation, then you can reply freely.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setReplyMode('template'); setShowNoteArea(false); }}
                        className="self-start flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-background text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Open Conversation
                      </button>
                    </div>
                  );
                }

                return (
                <div className="space-y-1.5">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none"
                      />
                      {/* Emoji trigger */}
                      <button
                        ref={emojiButtonRef}
                        type="button"
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="absolute right-2 bottom-2.5 text-text-muted hover:text-jade transition-colors"
                        title="Emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      {/* Emoji Picker — positioned inside relative wrapper so bottom-full works correctly */}
                      {showEmojiPicker && (
                        <InboxEmojiPicker
                          pickerRef={emojiPickerRef}
                          onSelect={(emoji) => insertEmoji(emoji)}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </div>
                    <button
                      onClick={sendReply}
                      disabled={isSending || !replyText.trim()}
                      className="w-10 h-10 bg-jade rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-jade/90 transition-colors flex-shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 text-background animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 text-background" />
                      )}
                    </button>
                  </div>

                  {/* Quick Replies row */}
                  <div className="relative" ref={qrPanelRef}>
                    <button
                      type="button"
                      onClick={() => { setShowQrPanel(v => !v); setShowQrForm(false); }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-jade transition-colors"
                    >
                      <Zap className="w-3 h-3" /> Quick Replies
                      {quickReplies.length > 0 && (
                        <span className="ml-0.5 bg-jade/15 text-jade text-[10px] font-bold px-1.5 py-0.5 rounded-full">{quickReplies.length}</span>
                      )}
                    </button>

                    {/* Quick replies panel */}
                    {showQrPanel && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5"><Zap className="w-3 h-3 text-jade" /> Quick Replies</span>
                          <button
                            onClick={() => { setShowQrForm(v => !v); setQrTitle(""); setQrBody(""); }}
                            className="text-[11px] text-jade font-bold hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>

                        {/* Add form */}
                        {showQrForm && (
                          <div className="p-3 border-b border-border space-y-2 bg-surface/50">
                            <input
                              value={qrTitle}
                              onChange={e => setQrTitle(e.target.value)}
                              placeholder="Title (e.g. Greeting)"
                              className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                            />
                            <textarea
                              value={qrBody}
                              onChange={e => setQrBody(e.target.value)}
                              rows={3}
                              placeholder="Reply text…"
                              className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50 resize-none"
                            />
                            <button
                              onClick={addQuickReply}
                              disabled={!qrTitle.trim() || !qrBody.trim()}
                              className="w-full py-1.5 bg-jade text-background text-xs font-bold rounded-lg hover:bg-jade/90 transition-colors disabled:opacity-50"
                            >
                              Save Reply
                            </button>
                          </div>
                        )}

                        {/* Reply list */}
                        <div className="max-h-52 overflow-y-auto">
                          {quickReplies.length === 0 && !showQrForm && (
                            <p className="text-xs text-text-muted text-center py-6">No quick replies yet.<br/>Click Add to create one.</p>
                          )}
                          {quickReplies.map(qr => (
                            <div
                              key={qr.id}
                              className="group flex items-start gap-2 px-3 py-2.5 hover:bg-surface/60 cursor-pointer border-b border-border/40 last:border-b-0"
                              onClick={() => { setReplyText(qr.body); setShowQrPanel(false); }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">{qr.title}</p>
                                <p className="text-[11px] text-text-muted truncate mt-0.5">{qr.body}</p>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); deleteQuickReply(qr.id); }}
                                className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger transition-all shrink-0 mt-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}

              {/* TEMPLATE mode */}
              {replyMode === "template" && (
                <div className="space-y-2">
                  {templates.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-3">
                      No approved templates. Create one in the Templates section.
                    </p>
                  ) : (
                    <>
                      <select
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-jade/50"
                        onChange={(e) => {
                          const t = templates.find((t) => t.id === e.target.value) || null;
                          setSelectedTemplate(t);
                          const vars = extractTemplateVars(t?.body || "");
                          setTemplateVarValues(vars.map(() => ""));
                          const btnIdxs = urlButtonIndices(t?.buttons);
                          setTemplateBtnValues(btnIdxs.map(() => ""));
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Choose a template...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      {selectedTemplate && (() => {
                        const vars = extractTemplateVars(selectedTemplate.body);
                        const btnIdxs = urlButtonIndices(selectedTemplate.buttons);
                        return (
                          <>
                            {/* Template body preview */}
                            <div className="bg-surface border border-jade/20 rounded-xl p-3 text-xs text-text-muted italic">
                              &ldquo;{selectedTemplate.body}&rdquo;
                            </div>

                            {/* Body variable inputs */}
                            {vars.length > 0 && (
                              <div className="space-y-2 p-3 bg-surface/50 border border-border rounded-xl">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Fill in template variables
                                </p>
                                {vars.map((varIndex, i) => (
                                  <div key={varIndex} className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-jade bg-jade/10 border border-jade/20 px-1.5 py-0.5 rounded shrink-0">
                                      {`{{${varIndex}}}`}
                                    </span>
                                    <input
                                      type="text"
                                      value={templateVarValues[i] || ""}
                                      onChange={e => {
                                        const updated = [...templateVarValues];
                                        updated[i] = e.target.value;
                                        setTemplateVarValues(updated);
                                      }}
                                      placeholder={`Value for {{${varIndex}}}`}
                                      className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-jade/50"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* URL button suffix inputs */}
                            {btnIdxs.length > 0 && (
                              <div className="space-y-2 p-3 bg-surface/50 border border-amber-500/20 rounded-xl">
                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  Button URL suffix
                                </p>
                                {btnIdxs.map((btnIdx, i) => {
                                  const btn = selectedTemplate.buttons![btnIdx];
                                  const baseUrl = (btn.url || "").replace(/\{\{1\}\}$/, "");
                                  return (
                                    <div key={btnIdx} className="space-y-1">
                                      <p className="text-[10px] text-text-muted truncate">{btn.text}: <span className="text-amber-400">{baseUrl}</span><span className="text-jade">…</span></p>
                                      <input
                                        type="text"
                                        value={templateBtnValues[i] || ""}
                                        onChange={e => {
                                          const updated = [...templateBtnValues];
                                          updated[i] = e.target.value;
                                          setTemplateBtnValues(updated);
                                        }}
                                        placeholder="URL suffix (e.g. page/123)"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-amber-500/50"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <button
                        onClick={sendReply}
                        disabled={isSending || !selectedTemplate || (
                          extractTemplateVars(selectedTemplate?.body || "").length > 0 &&
                          templateVarValues.some(v => !v.trim())
                        ) || (
                          urlButtonIndices(selectedTemplate?.buttons).length > 0 &&
                          templateBtnValues.some(v => !v.trim())
                        )}
                        className="w-full py-2.5 bg-jade text-background text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-jade/90 transition-colors flex items-center justify-center gap-2"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Template
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* MEDIA mode */}
              {replyMode === "media" && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {!mediaFile ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2 text-text-muted hover:border-jade/50 hover:text-jade transition-colors"
                    >
                      <Paperclip className="w-6 h-6" />
                      <span className="text-xs font-medium">
                        Click to select image, video, audio, or document
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
                      {mediaPreview ? (
                        <img src={mediaPreview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-text-muted" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mediaFile.name}</p>
                        <p className="text-xs text-text-muted">
                          {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview("");
                        }}
                        className="text-text-muted hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={sendReply}
                    disabled={isSending || !mediaFile}
                    className="w-full py-2.5 bg-jade text-background text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-jade/90 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                    Send File
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* ── Contact Details Right Panel ──────────────────────── */}
          {showContactPanel && (
            <div className="w-72 border-l border-border flex flex-col flex-shrink-0 bg-card overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Contact Details
                </span>
                <button type="button" onClick={() => setShowContactPanel(false)} className="text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {contactLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 text-jade animate-spin" />
                </div>
              ) : (
                <div className="flex-1 p-4 space-y-5">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-jade/20 text-jade font-bold text-base flex items-center justify-center flex-shrink-0">
                      {avatarInitials(activeConv?.contact_name || activeConv?.contact_phone || '?')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{activeConv?.contact_name || 'Unknown'}</p>
                      <a
                        href={`https://wa.me/${(activeConv?.contact_phone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-jade hover:underline flex items-center gap-1 truncate"
                      >
                        {activeConv?.contact_phone}
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Core info */}
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Email</p>
                      <p className="text-text-primary text-xs">{contactInfo?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">WhatsApp Opted</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        contactInfo?.opted_in !== false
                          ? 'bg-jade/10 text-jade border border-jade/20'
                          : 'bg-danger/10 text-danger border border-danger/20'
                      }`}>
                        {contactInfo?.opted_in !== false ? 'Yes' : 'No'}
                      </span>
                    </div>

                    {/* Extra fields - show more toggle */}
                    {contactShowMore && contactInfo && (
                      <>
                        {contactInfo.custom1 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Custom 1</p>
                            <p className="text-xs text-text-primary">{contactInfo.custom1}</p>
                          </div>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setContactShowMore(v => !v)}
                      className="flex items-center gap-1 text-[11px] text-text-muted hover:text-jade transition-colors"
                    >
                      {contactShowMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {contactShowMore ? 'Show Less' : 'Show More'}
                    </button>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Tags
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingTags(v => !v)}
                        className="text-[11px] text-jade hover:underline"
                      >
                        {editingTags ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {/* Tag chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(contactInfo?.custom2
                        ? contactInfo.custom2.split(',').map((t: string) => t.trim()).filter(Boolean)
                        : []
                      ).map((tag: string) => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-surface border border-border rounded-full text-[11px] text-text-primary">
                          {tag}
                          {editingTags && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = (contactInfo?.custom2 || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                                updateContactTags(current.filter((t: string) => t !== tag));
                              }}
                              className="text-text-muted hover:text-danger transition-colors ml-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                      {(!contactInfo?.custom2 || !contactInfo.custom2.trim()) && (
                        <span className="text-xs text-text-muted italic">No tags</span>
                      )}
                    </div>
                    {editingTags && (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!newTagInput.trim()) return;
                              const current = (contactInfo?.custom2 || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                              if (!current.includes(newTagInput.trim())) {
                                updateContactTags([...current, newTagInput.trim()]);
                              }
                              setNewTagInput('');
                            }
                          }}
                          placeholder="Add tag…"
                          className="flex-1 bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-jade/50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newTagInput.trim()) return;
                            const current = (contactInfo?.custom2 || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                            if (!current.includes(newTagInput.trim())) {
                              updateContactTags([...current, newTagInput.trim()]);
                            }
                            setNewTagInput('');
                          }}
                          className="px-2 py-1 bg-jade text-background text-xs font-bold rounded-lg hover:bg-jade/90 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  {/* Assigned To */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" /> Assigned To
                    </p>
                    <select
                      value={activeConv?.assigned_to || ""}
                      disabled={assigning}
                      onChange={e => {
                        const val = e.target.value;
                        const member = teamMembers.find(m => m.member_user_id === val);
                        assignConversation(val || null, member?.email || null);
                      }}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-jade/50 disabled:opacity-60"
                    >
                      <option value="">— Unassigned —</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.member_user_id || m.id}>{m.email} ({m.role})</option>
                      ))}
                    </select>
                    {activeConv?.assigned_name && (
                      <p className="text-[10px] text-jade mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Assigned to {activeConv.assigned_name}
                      </p>
                    )}
                    {teamMembers.length === 0 && (
                      <p className="text-[10px] text-text-muted mt-1">No team members yet. Invite staff from the Team page.</p>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  {/* Internal Notes — read-only display of notes from the chat */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1">
                      <PenLine className="w-3 h-3" /> Internal Notes
                    </p>
                    {messages.filter(m => m.type === 'note').length === 0 ? (
                      <p className="text-[11px] text-text-muted italic">No internal notes yet. Use the Note tab in the chat to add one.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {messages.filter(m => m.type === 'note').map(m => {
                          const isEditing = editingNoteId === m.id;
                          return (
                            <div key={m.id} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                              {isEditing ? (
                                <div className="flex flex-col gap-1.5">
                                  <textarea
                                    rows={3}
                                    value={editingNoteText}
                                    onChange={e => setEditingNoteText(e.target.value)}
                                    className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5 text-xs text-amber-800 focus:outline-none resize-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-1.5">
                                    <button onClick={() => saveNoteEdit(m.id)}
                                      className="flex-1 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-400 transition-colors">
                                      Save
                                    </button>
                                    <button onClick={() => setEditingNoteId(null)}
                                      className="flex-1 py-1 bg-surface border border-border text-xs rounded-lg hover:bg-card transition-colors">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="text-xs text-amber-800 whitespace-pre-wrap flex-1">{m.content}</p>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <button onClick={() => { setEditingNoteId(m.id); setEditingNoteText(m.content); }}
                                        className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-colors" title="Edit">
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => deleteNote(m.id)}
                                        className="p-1 rounded hover:bg-red-500/20 text-amber-400 hover:text-red-500 transition-colors" title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-amber-500/70 mt-1 text-right">
                                    {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  {/* Activity Timeline */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = !showActivity;
                        setShowActivity(newVal);
                        if (newVal && !activityData && contactInfo?.id) {
                          fetchActivity(contactInfo.id);
                        }
                      }}
                      className="w-full text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1 hover:text-jade transition-colors"
                    >
                      <Activity className="w-3 h-3" /> Activity Timeline
                      {showActivity ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                    </button>

                    {showActivity && (
                      <div className="space-y-2">
                        {activityLoading && (
                          <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading activity…
                          </div>
                        )}
                        {!activityLoading && activityData && (() => {
                          // Merge and sort all events
                          const events: { time: string; label: string; sub?: string; type: 'chat' | 'campaign' }[] = [
                            ...(activityData.chatMessages || []).filter((m: any) => m.type !== 'note').map((m: any) => ({
                              time: m.created_at,
                              label: m.direction === 'inbound' ? 'Sent you a message' : 'You replied',
                              sub: m.content?.slice(0, 60) || (m.type === 'template' ? '📋 Template sent' : '📎 Media'),
                              type: 'chat' as const,
                            })),
                            ...(activityData.campaignLogs || []).map((l: any) => ({
                              time: l.created_at,
                              label: `Campaign: ${l.campaign_name || 'Broadcast'}`,
                              sub: `Status: ${l.status || 'sent'}`,
                              type: 'campaign' as const,
                            })),
                          ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

                          if (events.length === 0) return (
                            <p className="text-[11px] text-text-muted py-2 text-center">No activity recorded yet.</p>
                          );

                          return (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {events.map((ev, i) => (
                                <div key={i} className="flex gap-2.5 items-start">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ev.type === 'campaign' ? 'bg-amber-400' : 'bg-jade'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-text-primary">{ev.label}</p>
                                    {ev.sub && <p className="text-[10px] text-text-muted truncate">{ev.sub}</p>}
                                    <p className="text-[10px] text-text-muted opacity-60">
                                      {format(new Date(ev.time), 'dd MMM yyyy · HH:mm')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {!activityLoading && !activityData && !contactInfo?.id && (
                          <p className="text-[11px] text-text-muted">Save the contact first to view activity.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* No contact record warning */}
                  {!contactInfo && !contactLoading && (
                    <div className="text-center py-4">
                      <Info className="w-8 h-8 text-text-muted opacity-30 mx-auto mb-2" />
                      <p className="text-xs text-text-muted">No contact record found</p>
                      <p className="text-[11px] text-text-muted mt-1">This number isn't in your Contacts yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        ) : (
          /* Empty state — no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-jade/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-jade opacity-60" />
            </div>
            <h4 className="font-bold font-syne text-lg">WhatsApp Inbox</h4>
            <p className="text-sm text-text-muted mt-2 max-w-xs">
              Select a conversation from the left, or start a new one.
            </p>
            <button
              onClick={() => { setShowNewChat(true); setNewChatError(""); }}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-jade text-background text-sm font-bold rounded-xl hover:bg-jade-hover transition-all shadow-[0_0_16px_rgba(16,185,129,0.25)]"
            >
              <Plus className="w-4 h-4" /> Start New Conversation
            </button>
          </div>
        )}
      </div>

      {/* ── New Chat Modal ──────────────────────────────────────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-jade/10 rounded-xl border border-jade/25 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-jade" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">Start New Conversation</p>
                  <p className="text-[10px] text-text-muted">Requires a WhatsApp-approved template</p>
                </div>
              </div>
              <button
                onClick={() => { setShowNewChat(false); setNewChatError(""); setNewChatPhone(""); setNewChatName(""); setNewChatTemplate(null); }}
                className="p-1.5 hover:bg-surface rounded-lg text-text-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Info banner */}
              <div className="flex gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>WhatsApp only allows template messages to start a new conversation. Free-text is available once the contact replies.</span>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  placeholder="+971501234567"
                  className="input-field w-full text-sm font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-text-muted">Include country code, e.g. +971 for UAE, +91 for India</p>
              </div>

              {/* Contact name (optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Contact Name (optional)</label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Template picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  Template <span className="text-rose-400">*</span>
                </label>
                {templates.length === 0 ? (
                  <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted text-center">
                    No approved templates found. Create and get templates approved in the Templates section.
                  </div>
                ) : (
                  <select
                    value={newChatTemplate?.name || ""}
                    onChange={e => {
                      const t = templates.find(t => t.name === e.target.value) || null;
                      setNewChatTemplate(t);
                      const vars = extractTemplateVars(t?.body || "");
                      setNewChatVarValues(vars.map(() => ""));
                      const btnIdxs = urlButtonIndices(t?.buttons);
                      setNewChatBtnValues(btnIdxs.map(() => ""));
                    }}
                    className="input-field w-full text-sm bg-background border-border"
                  >
                    <option value="">Select an approved template…</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                    ))}
                  </select>
                )}
                {newChatTemplate && (() => {
                  const vars = extractTemplateVars(newChatTemplate.body);
                  const btnIdxs = urlButtonIndices(newChatTemplate.buttons);
                  return (
                    <>
                      <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted leading-relaxed">
                        <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Preview</span>
                        {newChatTemplate.body}
                      </div>
                      {vars.length > 0 && (
                        <div className="space-y-2 p-3 bg-surface/50 border border-border rounded-xl">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fill in variables</p>
                          {vars.map((varIndex, i) => (
                            <div key={varIndex} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-jade bg-jade/10 border border-jade/20 px-1.5 py-0.5 rounded shrink-0">
                                {`{{${varIndex}}}`}
                              </span>
                              <input
                                type="text"
                                value={newChatVarValues[i] || ""}
                                onChange={e => {
                                  const updated = [...newChatVarValues];
                                  updated[i] = e.target.value;
                                  setNewChatVarValues(updated);
                                }}
                                placeholder={`Value for {{${varIndex}}}`}
                                className="input-field flex-1 text-xs py-1.5"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {btnIdxs.length > 0 && (
                        <div className="space-y-2 p-3 bg-surface/50 border border-amber-500/20 rounded-xl">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Button URL suffix</p>
                          {btnIdxs.map((btnIdx, i) => {
                            const btn = newChatTemplate.buttons![btnIdx];
                            const baseUrl = (btn.url || "").replace(/\{\{1\}\}$/, "");
                            return (
                              <div key={btnIdx} className="space-y-1">
                                <p className="text-[10px] text-text-muted truncate">{btn.text}: <span className="text-amber-400">{baseUrl}</span><span className="text-jade">…</span></p>
                                <input
                                  type="text"
                                  value={newChatBtnValues[i] || ""}
                                  onChange={e => {
                                    const updated = [...newChatBtnValues];
                                    updated[i] = e.target.value;
                                    setNewChatBtnValues(updated);
                                  }}
                                  placeholder="URL suffix (e.g. page/123)"
                                  className="input-field w-full text-xs py-1.5"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Error */}
              {newChatError && (
                <div className="flex items-start gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {newChatError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowNewChat(false); setNewChatError(""); setNewChatPhone(""); setNewChatName(""); setNewChatTemplate(null); }}
                  className="flex-1 btn-secondary py-2.5 text-sm"
                  disabled={newChatSending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartConversation}
                  disabled={newChatSending || !newChatPhone.trim() || !newChatTemplate || (
                    extractTemplateVars(newChatTemplate?.body || "").length > 0 &&
                    newChatVarValues.some(v => !v.trim())
                  ) || (
                    urlButtonIndices(newChatTemplate?.buttons).length > 0 &&
                    newChatBtnValues.some(v => !v.trim())
                  )}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {newChatSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send &amp; Open Chat</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Modal */}
      {showFilters && (
        <InboxFilterModal
          pending={pendingFilters}
          setPending={setPendingFilters}
          availableTags={availableTags}
          onClose={() => setShowFilters(false)}
          onApply={() => { setAppliedFilters(pendingFilters); setShowFilters(false); }}
          onReset={() => { setPendingFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); setShowFilters(false); }}
        />
      )}
    </div>
  );
}
