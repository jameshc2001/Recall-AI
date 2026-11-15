import "@testing-library/jest-dom/vitest"; // matcher types (tests/ is excluded from tsconfig, so setup.ts types aren't seen here)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CardNote from "@/components/CardNote";

// jsdom can't lay out real Mermaid SVGs, so mock the (lazily imported) library
const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(),
  render: vi.fn(),
}));
vi.mock("mermaid", () => ({ default: mermaidMock }));

function renderNote(initialNote?: string, onSave = vi.fn()) {
  return render(
    <CardNote cardId="c1" question="Q" answer="A" initialNote={initialNote} onSave={onSave} />
  );
}

describe("CardNote", () => {
  it("shows 'Add a note' when initialNote is undefined", () => {
    renderNote(undefined);
    expect(screen.getByText("Add a note")).toBeInTheDocument();
  });

  it("shows 'Add a note' when initialNote is empty string", () => {
    renderNote("");
    expect(screen.getByText("Add a note")).toBeInTheDocument();
  });

  it("clicking 'Add a note' opens the textarea editor", () => {
    renderNote(undefined);
    fireEvent.click(screen.getByText("Add a note"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("textarea is pre-filled with initialNote when editing an existing note", () => {
    renderNote("## My note");
    // existing note renders in view mode — click Edit
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByRole<HTMLTextAreaElement>("textbox").value).toBe("## My note");
  });

  it("Cancel from empty state hides the editor without calling onSave", () => {
    const onSave = vi.fn();
    renderNote(undefined, onSave);
    fireEvent.click(screen.getByText("Add a note"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Cancel from existing note returns to rendered view without calling onSave", () => {
    const onSave = vi.fn();
    renderNote("existing note", onSave);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "changed" } });
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Save calls onSave with the textarea value", () => {
    const onSave = vi.fn();
    renderNote(undefined, onSave);
    fireEvent.click(screen.getByText("Add a note"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my note text" } });
    fireEvent.click(screen.getByText("Save note"));
    expect(onSave).toHaveBeenCalledWith("my note text");
  });

  it("Save with blank textarea calls onSave with empty string", () => {
    const onSave = vi.fn();
    renderNote(undefined, onSave);
    fireEvent.click(screen.getByText("Add a note"));
    fireEvent.click(screen.getByText("Save note"));
    expect(onSave).toHaveBeenCalledWith("");
  });

  it("switches to view mode after saving and shows the Edit button", () => {
    renderNote(undefined);
    fireEvent.click(screen.getByText("Add a note"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.click(screen.getByText("Save note"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("renders a markdown table with visible cell content", () => {
    const tableNote = "| A | B |\n|---|---|\n| one | two |";
    renderNote(tableNote);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "one" })).toBeInTheDocument();
  });

  it("renders display math with KaTeX instead of showing raw LaTeX", () => {
    const { container } = renderNote(
      "Vega:\n\n$$\n\\text{Vega} = \\frac{\\partial V}{\\partial \\sigma}\n$$"
    );
    expect(container.querySelector(".katex-display")).not.toBeNull();
    expect(container.textContent).not.toContain("$$");
    // .katex-html is the visible output (KaTeX also keeps the TeX source in a
    // hidden MathML annotation for screen readers, so check only the visible part)
    expect(container.querySelector(".katex-html")?.textContent).not.toContain("\\frac");
  });

  it("renders inline math with KaTeX", () => {
    const { container } = renderNote("Volatility $\\sigma$ drives vega.");
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".katex-display")).toBeNull();
    expect(container.textContent).not.toContain("$\\sigma$");
  });

  it("does not turn underscores inside math into italics", () => {
    const { container } = renderNote("$$\nx_i + y_i\n$$");
    expect(container.querySelector("em")).toBeNull();
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("keeps escaped dollar signs as literal text", () => {
    const { container } = renderNote("It costs \\$100 and \\$200.");
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$100 and $200");
  });

  it("shows invalid LaTeX as an error span rather than crashing", () => {
    const { container } = renderNote("$$\n\\frac{\\partial\n$$");
    expect(container.querySelector(".katex-error, .katex")).not.toBeNull();
  });

  it("labels the AI button 'fill' for an empty draft and 'edit' once the draft has content", () => {
    renderNote(undefined);
    fireEvent.click(screen.getByText("Add a note"));
    expect(screen.getByText("Ask AI to fill this note")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "some content" } });
    expect(screen.getByText("Ask AI to edit this note")).toBeInTheDocument();
  });

  it("sends the current draft to /api/note as currentNote and replaces the draft", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: "revised" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<CardNote cardId="c1" question="Q" answer="A" initialNote="old note" onSave={vi.fn()} />);
      fireEvent.click(screen.getByText("Edit"));
      fireEvent.click(screen.getByText("Ask AI to edit this note"));
      fireEvent.change(screen.getByPlaceholderText("What should AI change?"), { target: { value: "shorter" } });
      fireEvent.click(screen.getByText("Generate"));

      await waitFor(() =>
        expect(screen.getByPlaceholderText("Add a note… Markdown supported")).toHaveValue("revised")
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ question: "Q", answer: "A", prompt: "shorter", currentNote: "old note" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("omits currentNote when the draft is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: "new" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<CardNote cardId="c1" question="Q" answer="A" initialNote={undefined} onSave={vi.fn()} />);
      fireEvent.click(screen.getByText("Add a note"));
      fireEvent.click(screen.getByText("Ask AI to fill this note"));
      fireEvent.change(screen.getByPlaceholderText("What should AI write?"), { target: { value: "explain" } });
      fireEvent.click(screen.getByText("Generate"));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).not.toHaveProperty("currentNote");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("CardNote mermaid diagrams", () => {
  const CHART = "graph TD\n  A[Start] --> B[End]";
  const NOTE = "Flow:\n\n```mermaid\n" + CHART + "\n```";

  beforeEach(() => {
    mermaidMock.initialize.mockReset();
    mermaidMock.parse.mockReset().mockResolvedValue({ diagramType: "flowchart" });
    mermaidMock.render.mockReset().mockResolvedValue({ svg: '<svg data-mock="diagram"></svg>' });
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("renders a mermaid code block as a diagram", async () => {
    renderNote(NOTE);
    const diagram = await screen.findByTestId("mermaid-diagram");
    expect(diagram.querySelector('svg[data-mock="diagram"]')).not.toBeNull();
    expect(mermaidMock.render).toHaveBeenCalledWith(expect.stringMatching(/^mermaid-[a-zA-Z0-9]+$/), CHART);
    expect(mermaidMock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: "strict", theme: "default" })
    );
  });

  it("falls back to the source when the diagram syntax is invalid", async () => {
    mermaidMock.parse.mockResolvedValue(false);
    renderNote(NOTE);
    const fallback = await screen.findByTestId("mermaid-fallback");
    expect(fallback).toHaveTextContent("A[Start] --> B[End]");
    expect(screen.getByText("Couldn't render diagram")).toBeInTheDocument();
    expect(mermaidMock.render).not.toHaveBeenCalled();
  });

  it("falls back to the source when rendering throws", async () => {
    mermaidMock.render.mockRejectedValue(new Error("boom"));
    renderNote(NOTE);
    expect(await screen.findByTestId("mermaid-fallback")).toHaveTextContent("graph TD");
  });

  it("uses the dark theme in dark mode", async () => {
    document.documentElement.classList.add("dark");
    renderNote(NOTE);
    await screen.findByTestId("mermaid-diagram");
    expect(mermaidMock.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" }));
  });

  it("does not involve mermaid for other code languages", async () => {
    const { container } = renderNote("```js\nconst x = 1;\n```");
    expect(container.textContent).toContain("const x = 1;");
    expect(screen.queryByTestId("mermaid-diagram")).toBeNull();
    expect(screen.queryByTestId("mermaid-loading")).toBeNull();
    expect(mermaidMock.render).not.toHaveBeenCalled();
  });
});
