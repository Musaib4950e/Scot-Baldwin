import React from 'react';
import type { Message, User } from '../types';
import { MegaphoneIcon } from './icons';

interface ChatMessageProps {
  message: Message;
  author: User;
  isCurrentUser: boolean;
  isGroupChat: boolean;
}

const parseRichText = (text: string) => {
  // A simple and safe parser for our specific markdown-like syntax
  // Note: For a production app, a more robust library like 'marked' or 'DOMPurify' would be better.
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safeText = safeText
    // Bold: *text*
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    // Italic: _text_
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Strikethrough: ~text~
    .replace(/~(.*?)~/g, '<s>$1</s>')
    // Inline code: `code`
    .replace(/`(.*?)`/g, '<code class="rich-text-code">$1</code>');
  
  return { __html: safeText };
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message, author, isCurrentUser, isGroupChat }) => {

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.type === 'announcement') {
    return (
        <div className="my-4 mx-auto max-w-3xl bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 backdrop-blur-md border border-cyan-400/20 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
                <MegaphoneIcon className="w-6 h-6 text-cyan-400" />
                <h3 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Announcement</h3>
            </div>
            <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{message.text}</p>
            <p className="text-xs text-slate-500 mt-3">{new Date(message.timestamp).toLocaleString()}</p>
        </div>
    );
  }

  return (
    <div className={`flex items-end gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {author.avatar}
        </div>
      )}
      <div className={`flex flex-col max-w-lg lg:max-w-xl ${isCurrentUser ? 'items-end' : 'items-start'}`}>
         {isGroupChat && !isCurrentUser && (
            <p className="text-xs text-cyan-300 mb-1 ml-3 font-semibold">{author.username}</p>
         )}
        <div
          className={`px-4 py-2.5 shadow-md text-white ${
            isCurrentUser
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 rounded-l-2xl rounded-tr-2xl'
              : 'bg-white/10 backdrop-blur-sm rounded-r-2xl rounded-tl-2xl'
          }`}
        >
          <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={parseRichText(message.text)} />
        </div>
        <p className="text-xs text-slate-500 mt-1.5 mx-2">{formatTimestamp(message.timestamp)}</p>
      </div>
    </div>
  );
};

export default ChatMessage;