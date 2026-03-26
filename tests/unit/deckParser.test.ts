import { describe, it, expect } from "vitest";
import { parseDeckFromMessage } from "@/lib/deckParser";

const VALID_DECK_JSON = {
  title: "JavaScript Basics",
  topic: "JavaScript",
  cards: [
    { id: "c1", question: "What is a closure?", answer: "A function that captures its surrounding scope." },
    { id: "c2", question: "What is hoisting?", answer: "Variable/function declarations moved to top of scope." },
  ],
};

function wrap(json: unknown, tag = "json") {
  return `\`\`\`${tag}\n${JSON.stringify(json)}\n\`\`\``;
}

describe("parseDeckFromMessage", () => {
  describe("happy path", () => {
    it("parses a valid deck in a ```json block", () => {
      const result = parseDeckFromMessage(wrap(VALID_DECK_JSON));
      expect(result).not.toBeNull();
      expect(result!.title).toBe("JavaScript Basics");
      expect(result!.topic).toBe("JavaScript");
      expect(result!.cards).toHaveLength(2);
      expect(result!.cards[0]).toEqual(VALID_DECK_JSON.cards[0]);
    });

    it("parses a valid deck in a plain ``` block (no language tag)", () => {
      const result = parseDeckFromMessage(wrap(VALID_DECK_JSON, ""));
      expect(result).not.toBeNull();
      expect(result!.cards).toHaveLength(2);
    });

    it("assigns a generated id and createdAt", () => {
      const result = parseDeckFromMessage(wrap(VALID_DECK_JSON));
      expect(result!.id).toBe("test-uuid-1234");
      expect(result!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("parses when the JSON block is embedded in surrounding prose", () => {
      const message = `Here is your deck!\n\n${wrap(VALID_DECK_JSON)}\n\nEnjoy!`;
      const result = parseDeckFromMessage(message);
      expect(result).not.toBeNull();
      expect(result!.title).toBe("JavaScript Basics");
    });
  });

  describe("no code block", () => {
    it("returns null when message has no code block", () => {
      expect(parseDeckFromMessage("Here is your deck!")).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(parseDeckFromMessage("")).toBeNull();
    });
  });

  describe("invalid JSON", () => {
    it("returns null for a code block with non-JSON content", () => {
      expect(parseDeckFromMessage("```\nnot json\n```")).toBeNull();
    });

    it("returns null for a code block with malformed JSON", () => {
      expect(parseDeckFromMessage("```json\n{ title: 'bad' }\n```")).toBeNull();
    });
  });

  describe("missing top-level fields", () => {
    it("returns null when title is missing", () => {
      const { title: _title, ...noTitle } = VALID_DECK_JSON;
      expect(parseDeckFromMessage(wrap(noTitle))).toBeNull();
    });

    it("returns null when topic is missing", () => {
      const { topic: _topic, ...noTopic } = VALID_DECK_JSON;
      expect(parseDeckFromMessage(wrap(noTopic))).toBeNull();
    });

    it("returns null when cards is missing", () => {
      const { cards: _cards, ...noCards } = VALID_DECK_JSON;
      expect(parseDeckFromMessage(wrap(noCards))).toBeNull();
    });

    it("returns null when title is not a string", () => {
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, title: 42 }))).toBeNull();
    });

    it("returns null when topic is not a string", () => {
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, topic: null }))).toBeNull();
    });

    it("returns null when cards is not an array", () => {
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards: "bad" }))).toBeNull();
    });
  });

  describe("empty or invalid cards array", () => {
    it("returns null for an empty cards array", () => {
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards: [] }))).toBeNull();
    });

    it("returns null when a card is missing id", () => {
      const cards = [{ question: "Q?", answer: "A." }];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });

    it("returns null when a card is missing question", () => {
      const cards = [{ id: "c1", answer: "A." }];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });

    it("returns null when a card is missing answer", () => {
      const cards = [{ id: "c1", question: "Q?" }];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });

    it("returns null when a card has an empty string for id", () => {
      const cards = [{ id: "", question: "Q?", answer: "A." }];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });

    it("returns null when a card has an empty string for question", () => {
      const cards = [{ id: "c1", question: "", answer: "A." }];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });

    it("returns null when a card is null", () => {
      const cards = [null];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });

    it("returns null when a card field is the wrong type", () => {
      const cards = [{ id: 1, question: "Q?", answer: "A." }];
      expect(parseDeckFromMessage(wrap({ ...VALID_DECK_JSON, cards }))).toBeNull();
    });
  });
});
