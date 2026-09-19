Technical Specification & Implementation Plan
## 1. Data Layer & Storage Strategy
- Primary Storage (IndexedDB): Use a wrapper library like idb or native IndexedDB to manage two primary stores:
    - `documents`: Stores static imported JSON files (`wsc`, `wlc`, `heidelberg`).
    - `userProgress`: Keyed by `itemId` (e.g., `wsc_q1`) tracking `masteryStatus` and history logs.
- **Local Folder Integration (File System Access API)**:
    - Allow users to grant directory permissions (`showDirectoryPicker()`).
    - Store JSON files directly on disk so progress and document files remain in sync with a local directory.
- **Import/Export**:
    - Simple file inputs/blob triggers export/import of full IndexedDB JSON dumps.

## 2. Quiz Engine & Algorithmic Logic
- Pool Creation Manager:
    - Filters items based on selected IDs from the UI, filtered by selected document + criteria (Unlearned, Revisit, Learned).
    - Applies array sorting: Sequential (by document index) or Fisher-Yates Shuffle algorithm for randomized order.
- Text Normalization Engine (Verbatim Verification):
    - Strips punctuation, normalizes whitespace, and converts strings to lower-case for comparison.
    - *Hard Mode*: Calculates Levenshtein distance or strict word-matching percentages to evaluate accuracy.
    - *Medium Mode*: Splits answer strings into arrays, shuffles extra distractor words, and evaluates sequence match upon dropped elements.
    - *Easy Mode*: Masks a percentage of key words (e.g., every Nth word or specific nouns/verbs) into input fields.

## 3. Analytics & Visualization Engine
- Render charts dynamically using Chart.js:
    - **Mastery Breakdown (Doughnut Chart)**: Displays counts for `Unlearned`, `Revisit`, and `Learned` items relative to the document scope or full system scope.
    - **Progress Trend Line (Line Chart)**: Maps total items transitioned into `Learned` state against historical timestamps to track memory retention speed over time.