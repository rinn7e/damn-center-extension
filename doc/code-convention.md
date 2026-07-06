# Damn Center Code Convention

This document describes the code design principles and style conventions that must be adhered to in the Damn Center project.

## 1. Font Size Constraints
- **Minimum Font Size:** The minimum allowable font size class in styling is `text-[0.625rem]` (`10px` equivalent).
- **Unit Standard:** Use relative `rem` units (e.g. `text-[0.625rem]`, `text-xs`) for all text dimensions in the popup UI to ensure they scale dynamically when the user adjusts the font size setting. Do NOT use absolute pixel units (`px`) for styling text.

## 2. UI View Conventions
- **View Naming:** Composable view rendering functions (plain functions returning React/TSX elements, not full components) found in `src/app.tsx` and `src/program.tsx` must end with the `View` suffix instead of beginning with `render` (e.g., `headerView`, `matchesCardView`, `matchRowView`, `preLoadingView`).

## 3. Architecture & State Modularity (Elm Architecture / tea-cup-fp)
- **Architecture Standard:** The application follows the Elm Architecture, implemented via `tea-cup-fp` and `fp-ts`. State is represented by a central `Model` and modified via action messages (`Msg`).
- **Logic Modularization:** Complex state transitions (such as initializing data, toggling enablement, adding/deleting matches, and reordering matches) must delegate their logic to dedicated, pure sub-updater functions in `src/update.ts` (e.g., `handleInit`, `handleToggleDomainEnabled`, `handleAddPadSetting`). Simple toggle logic (e.g., `ToggleMatchesCollapsed`) or properties modified via helper dispatchers (e.g., `updateActiveSetting`) may be handled inline.
- **Immutability:** Reducer functions must treat the `Model` state as immutable, returning a new state and a command (`[Model, Cmd<Msg>]`).

## 4. Data Verification & Storage Codecs
- **Storage Codecs:** Use `io-ts` codecs (specifically `PaddingSettingCodec` and `GlobalSettingCodec`) to decode and validate data read from browser storage, maintaining backward compatibility for legacy structures.
- **Backup Verification:** Ensure configuration backup data imports are validated via `validateBackupData` using the correct codec arrays before importing.

## 5. Testing Conventions
- **Vitest & Coverage:** All logic sub-updater functions, helper functions, and codecs must have 100% test coverage using Vitest, with tests residing inside the `test/` directory (e.g., `test/update.test.ts`, `test/codec.test.ts`).

## 6. Layout & Spacing (No Margin Rule)
- **No Margin Utility Usage:** Do NOT use margin utility classes (e.g., `mt-`, `mb-`, `mx-`, `my-`, `ml-`, `mr-`, `m-`) for layout element spacing.
- **Layout Spacing Standard:** Layout spacing between elements must be achieved using parent container `padding` (e.g., `pt-`, `pb-`, `pl-`, `pr-`, `p-`) or flexbox/grid layout properties like `gap-` (e.g., `gap-[12px]`). This keeps element sizing localized and prevents layout overlaps when DOM elements are toggled dynamically.
