import { useState, useEffect } from 'react';
import { MessageSquare, Image as ImageIcon } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import ProviderSelector from './components/ProviderSelector';
import ConversationHistory from './components/ConversationHistory';
import ObjectDetection from './components/ObjectDetection';
import ModelTraining from './components/ModelTraining';
import { getProviders } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('llm');
  const [providers, setProviders] = useState({ llm_providers: [], database_providers: [] });
  const [selectedLLMProvider, setSelectedLLMProvider] = useState('');
  const [selectedDBProvider, setSelectedDBProvider] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await getProviders();
      setProviders(data);
      if (data.llm_providers.length > 0) {
        setSelectedLLMProvider(data.llm_providers[0]);
      }
      if (data.database_providers.length > 0) {
        setSelectedDBProvider(data.database_providers[0]);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Platform</h1>
          <p className="text-gray-600">Multi-provider LLM interface with Computer Vision support</p>
        </header>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('llm')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'llm'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageSquare className="w-5 h-5 inline mr-2" />
              LLM Chat
            </button>
            <button
              onClick={() => setActiveTab('detection')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'detection'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <ImageIcon className="w-5 h-5 inline mr-2" />
              Object Detection
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'training'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <ImageIcon className="w-5 h-5 inline mr-2" />
              Model Training
            </button>
          </div>
        </div>

        {/* LLM Tab Content */}
        {activeTab === 'llm' && (
          <>
            <div className="mb-6">
              <ProviderSelector
                llmProviders={providers.llm_providers}
                dbProviders={providers.database_providers}
                selectedLLMProvider={selectedLLMProvider}
                selectedDBProvider={selectedDBProvider}
                onLLMProviderChange={setSelectedLLMProvider}
                onDBProviderChange={setSelectedDBProvider}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChatInterface
                  provider={selectedLLMProvider}
                  dbProvider={selectedDBProvider}
                />
              </div>
              <div className="lg:col-span-1">
                <ConversationHistory
                  dbProvider={selectedDBProvider}
                  userId="default"
                />
              </div>
            </div>
          </>
        )}

        {/* Object Detection Tab Content */}
        {activeTab === 'detection' && (
          <div className="max-w-4xl mx-auto">
            <ObjectDetection />
          </div>
        )}

        {/* Training Tab Content */}
        {activeTab === 'training' && (
          <div className="max-w-6xl mx-auto">
            <ModelTraining />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
