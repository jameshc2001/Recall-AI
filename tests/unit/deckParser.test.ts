import { describe, it, expect, vi } from "vitest";
import { parseDeckFromMessage, parseNewCardsFromMessage, MAX_NEW_CARDS } from "@/lib/deckParser";

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

describe("parseNewCardsFromMessage", () => {
  const NEW_CARDS = {
    cards: [
      { question: "What is a promise?", answer: "An object representing a future value." },
      { question: "What does await do?", answer: "Pauses an async function until a promise settles." },
    ],
  };

  it("parses new cards from a ```json block with leading text", () => {
    const result = parseNewCardsFromMessage(`Here are your new cards!\n${wrap(NEW_CARDS)}`);
    expect(result).toHaveLength(2);
    expect(result![0].question).toBe("What is a promise?");
    expect(result![1].answer).toBe("Pauses an async function until a promise settles.");
  });

  it("assigns fresh unique ids, ignoring any ids Claude supplies", () => {
    // setup.ts stubs randomUUID with a constant; count calls to get distinct ids
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++n}` as `${string}-${string}-${string}-${string}-${string}`);
    const withIds = { cards: NEW_CARDS.cards.map((c, i) => ({ ...c, id: String(i + 1) })) };
    const result = parseNewCardsFromMessage(wrap(withIds))!;
    expect(result[0].id).not.toBe("1");
    expect(result[0].id).not.toBe(result[1].id);
  });

  it("returns null when there is no fenced block", () => {
    expect(parseNewCardsFromMessage("no cards here")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseNewCardsFromMessage("```json\n{ cards: [\n```")).toBeNull();
  });

  it("returns null for an empty or missing cards array", () => {
    expect(parseNewCardsFromMessage(wrap({ cards: [] }))).toBeNull();
    expect(parseNewCardsFromMessage(wrap({}))).toBeNull();
  });

  it("returns null when a card is missing a question or answer", () => {
    expect(parseNewCardsFromMessage(wrap({ cards: [{ question: "Q only" }] }))).toBeNull();
    expect(parseNewCardsFromMessage(wrap({ cards: [{ question: "Q", answer: "  " }] }))).toBeNull();
  });

  it(`returns null when more than ${MAX_NEW_CARDS} cards are returned`, () => {
    const many = { cards: Array.from({ length: MAX_NEW_CARDS + 1 }, (_, i) => ({ question: `Q${i}`, answer: "A" })) };
    expect(parseNewCardsFromMessage(wrap(many))).toBeNull();
    const max = { cards: many.cards.slice(0, MAX_NEW_CARDS) };
    expect(parseNewCardsFromMessage(wrap(max))).toHaveLength(MAX_NEW_CARDS);
  });
});
