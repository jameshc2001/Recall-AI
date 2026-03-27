export interface Card {
  id: string;
  question: string;
  answer: string;
  note?: string;
}

export interface Deck {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  cards: Card[];
}

