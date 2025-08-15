"use client";

import React from "react";
import { CompareView } from "./view";

const STORAGE_KEY = "compare:pw";

const ComparePage = () => {
  const REQUIRED = (process.env.NEXT_PUBLIC_COMPARE_PAGE_PASSWORD || "").trim();
  const pwRequired = REQUIRED.length > 0;

  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [authed, setAuthed] = React.useState(false);

  // hydrate auth from sessionStorage; re-check if env changes
  React.useEffect(() => {
    if (!pwRequired) {
      setAuthed(true);
      return;
    }

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      setAuthed(saved === REQUIRED);
    } catch {
      setAuthed(false);
    }
  }, [pwRequired, REQUIRED]);

  // optional: allow ?pw= query param
  React.useEffect(() => {
    if (!pwRequired || authed) {
      return;
    }

    try {
      const q = new URLSearchParams(window.location.search);
      const qp = q.get("pw");

      if (qp && qp === REQUIRED) {
        sessionStorage.setItem(STORAGE_KEY, REQUIRED);
        setAuthed(true);
      }
    } catch {}
  }, [pwRequired, authed, REQUIRED]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input === REQUIRED) {
      try {
        sessionStorage.setItem(STORAGE_KEY, REQUIRED);
      } catch {}
      setAuthed(true);
      setError(null);
    } else {
      setError("Invalid password");
    }
  };

  if (!authed) {
    return (
      <div className="flex justify-center items-center px-4 min-h-[60vh]">
        <form
          onSubmit={submit}
          className="bg-background-secondary/60 p-5 border border-border-secondary rounded-xl w-full max-w-sm"
        >
          <h1 className="mb-1 font-semibold text-primary text-2xl">
            Compare Benchmarks
          </h1>
          <p className="mb-4 text-secondary text-sm">This page is protected</p>
          <label className="block mb-2 text-tertiary text-xs">Password</label>
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            className="bg-background-secondary mb-2 px-3 py-2 border focus:border-primary/60 border-border-secondary rounded-md outline-none w-full text-sm"
            placeholder="Enter password"
            autoComplete="current-password"
          />
          {error && (
            <div className="mb-2 text-red-400 text-sm" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="hover:bg-background-secondary mt-1 px-3 py-2 border border-border-secondary rounded-md w-full text-primary text-sm"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <CompareView />
    </div>
  );
};

export default ComparePage;
