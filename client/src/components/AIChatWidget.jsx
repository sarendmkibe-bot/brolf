
import { useState } from 'react';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Send message to backend
  async function handleSend(e) {
    e.preventDefault();

    const newMessage = message.trim();

    if (!newMessage || isLoading) return;

    setMessages((previous) => [
      ...previous,
      { role: 'user', text: newMessage }
    ]);

    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(
        'http://localhost:5000/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: newMessage
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Something went wrong.'
        );
      }

      setMessages((previous) => [
        ...previous,
        { role: 'assistant', text: data.reply }
      ]);

    } catch (error) {
      console.error('Chatbot error:', error);

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: 'Sorry, I cannot connect to MarketHub right now. Please try again.\n\nይቅርታ፣ አሁን ከMarketHub ጋር መገናኘት አልቻልኩም። እባክዎ እንደገና ይሞክሩ።'
        }
      ]);

    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-brand p-4 text-ink shadow-xl hover:bg-brand-dark"
        >
          <span className="text-xl">🤖</span>
          <span className="ml-2 font-semibold">
            Ask MarketHub AI
          </span>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="flex h-[480px] w-[350px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between bg-panel2 p-4">
            <div>
              <h2 className="font-bold text-fg">
                🤖 MarketHub AI
              </h2>

              <p className="text-xs text-brand">
                Online · English & Amharic
              </p>

              <p className="text-xs text-muted">
                በአማርኛ ወይም በእንግሊዝኛ ይጠይቁን
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-xl text-muted hover:text-fg"
            >
              ✕
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">

            {/* Welcome message */}
            <div className="max-w-[90%] rounded-xl bg-panel2 p-3">
              <p className="text-sm text-fg">
                Hello! 👋 Welcome to MarketHub.
                I'm your AI shopping assistant.
              </p>

              <p className="mt-2 text-sm text-brand">
                ሰላም! 👋 ወደ MarketHub እንኳን በደህና መጡ።
              </p>

              <p className="mt-2 text-sm text-muted">
                How can I help you today?
              </p>

              <p className="mt-1 text-sm text-muted">
                ዛሬ እንዴት ልርዳዎት?
              </p>
            </div>

            {/* Conversation messages */}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-3 text-sm ${
                  msg.role === 'user'
                    ? 'ml-auto bg-brand text-ink'
                    : 'mr-auto bg-panel2 text-fg'
                }`}
              >
                {msg.text}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="mr-auto rounded-xl bg-panel2 p-3 text-sm text-brand">
                MarketHub AI is typing...
                <p className="mt-1">
                  MarketHub AI በመመለስ ላይ ነው...
                </p>
              </div>
            )}

          </div>

          {/* Message input */}
          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything... / በነፃነት ይጠይቁ..."
              disabled={isLoading}
              className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg outline-none focus:border-brand disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="rounded-lg bg-brand px-4 font-semibold text-ink hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
