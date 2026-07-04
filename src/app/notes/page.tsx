"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const STORAGE_KEY = "lumos-notes";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  function createNote() {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      content: "",
      updatedAt: Date.now(),
    };
    setNotes((prev) => {
      const next = [note, ...prev];
      saveNotes(next);
      return next;
    });
    selectNote(note);
  }

  function updateNote() {
    if (!selectedId) return;
    setNotes((prev) => {
      const next = prev.map((n) =>
        n.id === selectedId
          ? { ...n, title, content, updatedAt: Date.now() }
          : n,
      );
      saveNotes(next);
      return next;
    });
  }

  function deleteNote() {
    if (!selectedId) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== selectedId);
      saveNotes(next);
      return next;
    });
    setSelectedId(null);
    setTitle("");
    setContent("");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <Button size="sm" onClick={createNote}>
          <Plus />
          New note
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-[220px_1fr] gap-0 overflow-hidden rounded-2xl border border-border shadow-sm">
        {/* Sidebar */}
        <div className="flex flex-col gap-0.5 overflow-y-auto border-r border-border bg-muted/30 p-2">
          {notes.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No notes yet.
            </p>
          )}
          {notes.map((note) => (
            <button
              type="button"
              key={note.id}
              onClick={() => selectNote(note)}
              className={[
                "rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                note.id === selectedId
                  ? "bg-brand-teal/10 text-brand-teal"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <span className="block truncate font-medium">{note.title}</span>
              <span className="block truncate text-xs opacity-60">
                {new Date(note.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex flex-col gap-3 bg-card p-5">
          {selected ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={updateNote}
                placeholder="Note title"
                className="bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
              />
              <div className="h-px bg-border" />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={updateNote}
                placeholder="Start writing..."
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
              />
              <div className="flex justify-end border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteNote}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete note
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
