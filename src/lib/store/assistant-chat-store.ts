import { create } from "zustand";

export type AssistantChatRow = {
  role: "user" | "assistant";
  content: string;
  applyHref?: string | null;
  /** Short label for what “See matching products” will apply (from server-side filter resolution). */
  filterSummary?: string | null;
};

const INTRO_CONTENT =
  "Hi — I'm Prisbo Assistant. Tell me who you're gifting, the occasion, or what kind of product you have in mind, and I'll help narrow the catalogue.";

function initialMessages(): AssistantChatRow[] {
  return [{ role: "assistant", content: INTRO_CONTENT }];
}

type AssistantChatState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  messages: AssistantChatRow[];
  setMessages: (
    updater: AssistantChatRow[] | ((previous: AssistantChatRow[]) => AssistantChatRow[]),
  ) => void;
  resetConversation: () => void;
};

export const useAssistantChatStore = create<AssistantChatState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  messages: initialMessages(),
  setMessages: (updater) =>
    set((s) => ({
      messages: typeof updater === "function" ? updater(s.messages) : updater,
    })),
  resetConversation: () => set({ messages: initialMessages() }),
}));
