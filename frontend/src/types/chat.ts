export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }
  
  export interface ChatSession {
    messages: Message[];
    isLoading: boolean;
  }