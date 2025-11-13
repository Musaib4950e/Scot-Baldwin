import React from 'react';
import type { Message, User } from '../types';

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