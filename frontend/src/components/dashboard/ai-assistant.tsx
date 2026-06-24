"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { MessageSquare, Send, X, Sparkles, Bot, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

export function AiAssistant() {
  const api = useApiClient()
  const [isOpen, setIsOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI Cohort & Cost Advisor. Ask me anything about your active sandboxes, training groups, or compute spend.",
    },
  ])
  const [loading, setLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await api.post<{ response: string }>("/api/analytics/ai/chat", {
        message: userMessage,
        history: history,
      })

      if (response && response.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: response.response }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I received an empty response. Please try again." },
        ])
      }
    } catch (err) {
      console.error("AI Assistant error:", err)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I am unable to connect to the assistant service right now. Please verify backend configurations.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-zinc-50 shadow-lg shadow-indigo-500/20 hover:scale-105 hover:shadow-indigo-500/30 transition-all duration-200 cursor-pointer"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
        </button>
      )}

      {/* Glassmorphic Chat Panel */}
      {isOpen && (
        <div className="flex h-[500px] w-[380px] flex-col rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-lg shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3 bg-zinc-900/40 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-indigo-400">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-100 font-sans">Portal AI Advisor</h3>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium font-sans">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online Contextual
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === "assistant"
              return (
                <div key={index} className={`flex gap-2 max-w-[85%] ${isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"}`}>
                  {isAssistant && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-950 border border-indigo-500/20 text-indigo-400 text-[10px]">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-3 text-xs leading-relaxed font-sans ${
                      isAssistant
                        ? "bg-zinc-905 border border-zinc-800 text-zinc-200"
                        : "bg-indigo-600 text-zinc-50"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
            {loading && (
              <div className="flex gap-2 max-w-[85%] mr-auto">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-950 border border-indigo-500/20 text-indigo-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-400 italic font-sans">
                  AI is searching portal databases and typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="border-t border-zinc-900 p-3 flex gap-2">
            <input
              type="text"
              placeholder="Ask about sandboxes, spend, budgets..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-105 placeholder-zinc-550 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 text-zinc-100 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-zinc-50 hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
