# ADO Code — Quiz

Ten questions on the **ADO Code** VS Code extension. Questions 1–8 have exactly
**one** correct answer; questions 9–10 are multi-select — select **all** that
apply. Every answer is taken from the shipped marketing content, so the quiz can
be graded from the site alone.

## Instructions

- Q1–Q8: pick the single best option (A–D).
- Q9–Q10: pick every option that applies.
- No version-number questions: the site exposes two different numbers (the
  `?v=` asset cache-buster and the extension release), so those would be
  ambiguous.

## Questions

### 1. Which of the following is NOT one of the four ADO Code interaction modes?

- A. Chat
- B. Plan
- C. Act
- D. Review

### 2. Where does ADO Code place the git worktree for each delegated agent run?

- A. `.git/worktrees/`
- B. `.ado-code/worktrees/`
- C. `worktrees/` at the repository root
- D. A temp directory outside the repository

### 3. For a delegated run, what does ADO Code do automatically to "finish the job"?

- A. Merges the branch into `main` and deletes it
- B. Commits, pushes, and opens the pull request
- C. Deploys the change to production
- D. Opens a review checklist and waits for approval before any commit

### 4. Where is workspace memory stored (auto-ignored by git and Docker)?

- A. `.vscode/memory/`
- B. `.ado-code/memory/`
- C. `.ado/memory/`
- D. `~/.ado-code/memory/`

### 5. Which models can ADO Code use for chat and agents?

- A. Only the models bundled with GitHub Copilot
- B. Azure OpenAI deployments only
- C. Any OpenAI-compatible API (OpenRouter, Ollama, LM Studio) or Anthropic
- D. A single model hard-coded by ADO Code

### 6. Which fenced code block turns into a live interactive diagram in the chat?

- A. ````plantuml`
- B. ````mermaid`
- C. ````graphviz`
- D. ````ascii`

### 7. How does ADO Code let you work without an Azure DevOps project?

- A. It requires a separate "Lite" build
- B. You select "None (no project)" in the project dropdown
- C. You run a local ADO emulator
- D. It is not possible — a project is always required

### 8. What is the pricing model for ADO Code?

- A. Per-seat monthly subscription
- B. Free tier limited to 10 delegated runs per day
- C. Free; you bring your own Azure DevOps access and your own LLM key
- D. Free for open source, paid for private repositories

### 9. (select all that apply) Which of these are named in the built-in skills catalog?

- A. Code Review
- B. Security Audit
- C. Testing
- D. Refactoring
- E. Kubernetes Autoscaling

### 10. (select all that apply) Which diagram types can ADO Code render from a mermaid block?

- A. Flowchart
- B. Sequence
- C. ER (entity-relationship)
- D. Gantt
- E. Figma design frames

## Answer key

| # | Answer | Why (source) |
| --- | --- | --- |
| 1 | **D — Review** | The four modes are **Chat, Plan, Act, YOLO** — "One toggle from ask to autonomy" (features → Modes). |
| 2 | **B — .ado-code/worktrees/** | "Every delegated run gets its own git worktree under `.ado-code/worktrees/`." |
| 3 | **B — commit → push → open the PR** | "ADO Code closes the loop itself: commit → push → open the pull request." |
| 4 | **B — .ado-code/memory/** | "Workspace memory keeps project conventions in `.ado-code/memory/` — auto-ignored by git & Docker." |
| 5 | **C — bring your own model and key** | faq.html: "OpenRouter, Ollama and LM Studio" — bring your own model and key. |
| 6 | **B — mermaid** | "Fenced ```mermaid blocks become real interactive diagrams." |
| 7 | **B — None (no project)** | "Pick **None (no project)** in the project dropdown to run standalone." |
| 8 | **C — free + bring your own** | FAQ: "ADO Code itself is free — you bring your own Azure DevOps access and your own LLM API key." |
| 9 | **A, B, C, D** | Catalog names Code Review, Security Audit, Testing and Refactoring; Kubernetes autoscaling is not a skill. |
| 10 | **A, B, C, D** | Supported: flowchart, sequence, class, state, ER and Gantt; Figma frames are not a diagram type. |

## Scoring

- **Q1–Q8:** 1 point each.
- **Q9–Q10:** 1 point each, awarded **only** if every correct option is selected
  and no incorrect option is.

**Maximum score: 10.**

## Sources

Facts are drawn from the site's own content in [`index.html`](../index.html)
(features, modes, skills catalog, worked-with-any-LLM FAQ) and the
[presentation deck](../deck.html) (`deck.html`), whose slides restate the same
claims. If the marketing copy changes, re-verify the answer key against those
files before reuse.

## Evidence

Every answer is derived from a quote that actually ships on the site. The table
below pins each question to a verbatim snippet of the source file, plus the
distractor that must **not** be found there. `tests/quiz-evidence.test.mjs`
grep-checks this table on every run, so an answer that is no longer derivable
from the site fails the build instead of shipping.

| # | Source | Must contain (verbatim) | Must not contain |
| --- | --- | --- | --- |
| 1 | `faq.html` | `Chat answers questions, Plan inspects read-only, Act performs agentic work with approvals, and YOLO runs fully autonomously.` | — |
| 2 | `features.html` | `its own git worktree under <code>.ado-code/worktrees/</code>` | — |
| 3 | `features.html` | `commit → push → open the pull request` | — |
| 4 | `features.html` | `project conventions in <code>.ado-code/memory/</code>` | — |
| 5 | `faq.html` | `OpenRouter, Ollama and LM Studio` | `GitHub Copilot` |
| 6 | `features.html` | `blocks become real interactive diagrams` | — |
| 7 | `features.html` | `<strong>None (no project)</strong> in the project dropdown` | — |
| 8 | `faq.html` | `you bring your own Azure DevOps access and your own LLM API key` | — |
| 9 | `features.html` | `Code Review, Security Audit, Testing, Refactoring` | `Kubernetes` |
| 10 | `features.html` | `flowcharts, sequence, class, state, ER and Gantt` | `Figma` |

Q1's distractor ("Review") is ruled out by omission rather than by a unique
keyword: the site enumerates exactly four modes and never lists "Review" among
them, so a "must not contain" check on the bare word would be a false positive.
The four-mode quote in the row above is the evidence.

## Deck evidence

The presentation deck (`deck.html`) is a second grading surface, so the quiz can
be marked from the slides without the landing page. Each row below is a snippet
that must appear **verbatim** in `deck.html`; a question counts as
*deck-gradeable* when it has at least one row. Multi-select answers list **every**
correct option, so the deck can grade Q9 and Q10 too, not just confirm them.

| Q | Required snippet in `deck.html` |
| --- | --- |
| 1 | `Chat, Plan, Act and YOLO` |
| 2 | `.ado-code/worktrees/` |
| 3 | `commit → push → PR` |
| 4 | `.ado-code/memory/` |
| 5 | `OpenRouter, Ollama, LM Studio` |
| 6 | `Mermaid` |
| 7 | `None (no project)` |
| 8 | `Free, open source, no telemetry` |
| 8 | `Bring your own key` |
| 9 | `Code Review` |
| 9 | `Security Audit` |
| 9 | `Testing` |
| 9 | `Refactoring` |
| 10 | `flowchart` |
| 10 | `sequence` |
| 10 | `class` |
| 10 | `state` |
| 10 | `ER` |
| 10 | `Gantt` |

**Deck cannot grade:** none — all ten answers are stated on the slides.

_Why no "must not contain" column here:_ the deck is a summary, so distractor
words appear legitimately (e.g. "Review" in "Auto-review", "free" in prose). The
deck guard therefore proves the *correct* answer is stated, and relies on the
`## Evidence` table for distractor-absence.
