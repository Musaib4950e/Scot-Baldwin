import React from 'react';
import type { Message, User } from '../types';
import { MegaphoneIcon } from './icons';

interface ChatMessageProps {
  message: Message;
  author: User;
  isCurrentUser: boolean;
  isGroupChat: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, author, isCurrentUser, isGroupChat }) => {

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.type === 'announcement') {
    return (
        <div className="my-4 mx-auto max-w-2xl bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
                <MegaphoneIcon className="w-6 h-6 text-blue-400" />
                <h3 className="font-bold text-lg text-blue-300">Announcement</h3>
            </div>
            <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{message.text}</p>
            <p className="text-xs text-slate-500 mt-3">{new Date(message.timestamp).toLocaleString()}</p>
        </div>
    );
  }

  return (
    <div className={`flex items-end gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {author.avatar}
        </div>
      )}
      <div className={`flex flex-col max-w-lg ${isCurrentUser ? 'items-end' : 'items-start'}`}>
         {isGroupChat && !isCurrentUser && (
            <p className="text-xs text-blue-300 mb-1 ml-3">{author.username}</p>
         )}
        <div
          className={`px-4 py-2.5 ${
            isCurrentUser
              ? 'bg-blue-600 text-white rounded-l-xl rounded-tr-xl'
              : 'bg-slate-600 text-gray-200 rounded-r-xl rounded-tl-xl'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 mx-2">{formatTimestamp(message.timestamp)}</p>
      </div>
    </div>
  );
};

export default ChatMessage;