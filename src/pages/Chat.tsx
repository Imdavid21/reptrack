import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useDataChat } from '@/hooks/useDataChat';
import { Brain, Send, Loader2, AlertCircle } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const STARTER_PROMPTS = [
  "How's my strength trending lately?",
  'Am I eating enough protein?',
  'What muscle groups need more volume?',
  'What should I train today?',
];

export default function Chat() {
  const { messages, sendMessage, isSending, error, isContextLoading, hasData } = useDataChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = (text?: string) => {
    const toSend = text ?? input;
    if (!toSend.trim() || isSending || isContextLoading) return;
    haptic('light');
    sendMessage(toSend);
    setInput('');
  };

  return (
    <MainLayout showBack backTo="/app/insights">
      <AnimatedPage>
        <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Chat with your data</h1>
              <p className="text-[11px] text-muted-foreground">
                Grounded in your logged workouts, nutrition, sleep &amp; more
              </p>
            </div>
          </div>

          {/* Message list */}
          <div className="flex-1 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col justify-end gap-3 pb-2">
                <p className="text-xs text-muted-foreground text-center">
                  {isContextLoading
                    ? 'Loading your data…'
                    : hasData
                      ? 'Ask anything about your training, nutrition, or recovery.'
                      : 'Log a workout or two first — there\'s not much to chat about yet.'}
                </p>
                {!isContextLoading && hasData && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {STARTER_PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => handleSend(p)}
                        className="px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-left"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-foreground text-background rounded-2xl rounded-br-sm'
                      : 'bg-muted rounded-2xl rounded-bl-sm'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2 mt-4 pt-3 border-t border-border">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isContextLoading ? 'Loading your data…' : 'Ask about your data…'}
              disabled={isContextLoading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-foreground/20 disabled:opacity-50 max-h-32"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending || isContextLoading}
              className="h-10 w-10 shrink-0 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AnimatedPage>
    </MainLayout>
  );
}
