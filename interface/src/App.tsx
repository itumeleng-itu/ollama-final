import { useState } from 'react';
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

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
          model: 'tinyllama', //my installed model
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

  return (
    <>
    <div className="border-1 rounded-lg h-auto m-80 p-1">
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