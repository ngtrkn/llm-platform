import { useState, useEffect } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { listConversations, getConversation } from '../services/api';

function ConversationHistory({ dbProvider, userId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    if (dbProvider) {
      loadConversations();
    }
  }, [dbProvider, userId]);

  const loadConversations = async () => {
    if (!dbProvider) return;
    setLoading(true);
    try {
      const data = await listConversations(dbProvider, userId);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = async (conversationId) => {
    try {
      const conversation = await getConversation(dbProvider, conversationId);
      setSelectedConversation(conversation);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Conversation History</span>
        </h2>
      </div>

      {!dbProvider ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No database selected
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationClick(conv.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        {conv.provider}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(conv.created_at)}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {conv.messages[0]?.content || 'Empty conversation'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {conv.messages.length} messages
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedConversation && (
            <div className="border-t border-gray-200 p-4 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Messages:</h3>
              <div className="space-y-2">
                {selectedConversation.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded ${
                      msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">{msg.role}:</span>{' '}
                    <span className="text-gray-700">{msg.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ConversationHistory;
