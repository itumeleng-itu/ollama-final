import { useState, useEffect } from 'react';
import './App.css';
import { Spinner } from './components/ui/spinner';
import { Button } from './components/ui/button';
import send from '../src/assets/svgexport-10 (1).svg';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metrics?: {
    duration: number;
    tokensPerSec: number;
    totalTokens: number;
  };
}

const STORAGE_KEY = 'novaChat_messages';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const loadMessages = () => {
      try {
        const storedMessages = localStorage.getItem(STORAGE_KEY);
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages);
          setMessages(parsed);
        }
      } catch (error) {
        console.error('Error loading messages from localStorage:', error);
      }
    };

    loadMessages();
  }, []); // Empty dependency array - runs once on mount

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
    }
  }, [messages]); // Runs whenever messages array changes

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tinyllama',
          system: `You are Nova, a helpful AI assistant specializing in UI/UX design. You are assisting a user named Dlozi.
        
        Important instructions:
        - Always maintain a friendly, professional tone
        - Provide practical UI/UX advice and suggestions
        - Be concise but thorough in your explanations
        - When appropriate, refer to yourself as Nova
        - Focus on modern design principles and best practices`,
          prompt: input,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const durationSeconds = data.total_duration / 1e9;
      const tokensPerSec = data.eval_count / (data.eval_duration / 1e9);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        metrics: {
          duration: durationSeconds,
          tokensPerSec: tokensPerSec,
          totalTokens: data.eval_count,
        },
      };

      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Server error, please try again in a few mins',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear chat history
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      <div className="border border-gray-300 rounded-lg h-auto w-full max-w-3xl p-4 mx-auto mt-15 text-center shadow-lg">
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-bold">NovaChat</h2>
          <Button
            onClick={clearChat}
            variant="outline"
            size="sm"
            disabled={loading || messages.length === 0}
          >
            New Chat
          </Button>
        </div>
        <hr  className='p-5'/>
        <div className="rounded-xl h-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.content}

              {/* Only show metrics for AI responses */}
              {msg.role === 'assistant' && msg.metrics && (
                <div className="flex gap-3 mt-2 pt-2 border-t border-white/10 text-xs opacity-70">
                  <p className="m-0 font-bold">Duration: {msg.metrics.duration.toFixed(2)}s</p>
                  <p className="m-0 font-bold">Tokens/sec: {msg.metrics.tokensPerSec.toFixed(1)} tok/s</p>
                  <p className="m-0 font-bold">Total tokens: {msg.metrics.totalTokens} tokens</p>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div>
              <Spinner className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Ask anything you want..."
            disabled={loading}
          />
          <Button
            className="bg-transparent rounded-lg"
            size={'lg'}
            onClick={sendMessage}
            disabled={loading}
          >
            <img src={send} alt="send" className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default App;