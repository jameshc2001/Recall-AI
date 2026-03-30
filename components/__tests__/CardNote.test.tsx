import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CardNote from "@/components/CardNote";

function renderNote(initialNote?: string, onSave = vi.fn()) {
  return render(
    <CardNote cardId="c1" initialNote={initialNote} onSave={onSave} />
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
});
