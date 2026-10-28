# Storage Migration Strategy

Settings are stored in `chrome.storage.local` and decoded with the `io-ts` codecs in `src/common/type/`. When a future version changes those structures (e.g. `PadSetting` or `GlobalSetting`), follow this strategy so users don't lose their settings.

## Stored Keys

- `global_settings`: the `GlobalSetting`.
- `<hostname>`: the `SiteSetting` of that site (`src/common/type/site-setting.ts`): the site toggle (`enabled`, for every monitor) and a `monitors` list of `{ monitor: { width, height }, rules }`. A monitor without rules has no entry, so `rules` is never empty, and the same monitor never appears twice.

## Schema Versioning

- `GlobalSetting` carries `schema_version`, currently `2` (`CURRENT_SCHEMA_VERSION` in `src/common/type/global-setting.ts`): the format this build expects. It is stored under the `global_settings` key. Data without it (version 1 did not always save global settings) counts as version 1.
- The schema version is a counter of the stored format, not a release number: it changes only when the stored data changes shape, which is much less often than releases. The table below maps each schema version to the releases that write it.
- When the popup opens, it compares the stored `schema_version` with `CURRENT_SCHEMA_VERSION` (`checkStoredSchema` in `src/storage/storage.ts`):
  - Same version: nothing to do.
  - Older: a prompt covers the whole popup ("Settings update needed") and nothing can be edited until the user clicks **OK**. Then `migrateStorage` runs every step from the stored version to the current one, and the popup loads the settings again. If it fails, the prompt shows the error, a button to download the settings (nothing was written, so they are still the old ones) and a link to report the problem. The same screen shows when the stored settings cannot be read at all.
  - Nothing stored yet (a fresh install): the current `schema_version` is written right away, without asking.
  - Newer (saved by a newer version of the extension): a screen covers the whole popup ("Your extension is out of date") with the format this build expects and the format of the saved settings, and asks the user to update. Nothing can be edited, and nothing is written. See rule 4.
- Every change of the format has two parts, and both are needed:
  - **A migration step** in `MIGRATION_STEPS` (`src/storage/storage.ts`). `migrateStoredData` runs every step after the stored version, in order and in memory, and writes the result once: the values the steps changed and the new `schema_version` in one call. Keys a step dropped are removed afterwards; if that fails, the migration still counts as done and the keys stay as unused leftovers.
  - **Decoders that read every older version.** Pages never migrate: until the user confirms the prompt, the content script meets data of any older version and must still apply it. `decodeStoredSiteSetting` reads a version 1 list as the rules of the monitor of the caller (`migrateSiteSettingV1`), so old settings keep applying on every screen until the migration runs. Backup imports check values with it too.

### Versions

| Schema | Written by      | Site value                                |
| ------ | --------------- | ----------------------------------------- |
| 1      | up to 2.0.0     | list of `DomainSetting` and `PathSetting` |
| 2      | 2.1.0 and later | `SiteSetting` with rules per monitor      |

Add a row with each new schema version, with the first release that writes it.

### Adding a schema version

1. Bump `CURRENT_SCHEMA_VERSION` and add a step `{ to: <new version>, migrate }` at the end of `MIGRATION_STEPS`. `migrate` gets every stored value in the format of the version before and returns them all in the new format (a key it leaves out is removed). It is pure: no storage calls. Leave site values it cannot convert as they are. Stored global settings must come out in the new `GlobalSetting` format: if they do not decode, the migration fails (the user gets the failure screen and nothing is written) instead of resetting them to the defaults. A test checks that the steps go up one by one to `CURRENT_SCHEMA_VERSION`.
2. Teach the decoders the new shape while still reading every older one (see above), and keep `isStoredSiteSetting` accepting every version, so old backup files still import.
3. Add the export of the previous release to `test/fixture/` and its tests to `test/old-backups.test.ts` (rule 5), and a row to the table above.
4. Follow the release steps at the end of this page.

The runner and the popup do the rest: the prompt, the new `schema_version`, and doing nothing for data at a newer version.

### Rules

1. Never edit a migration step that has shipped in a release: users may already have run it, and they will not run it again. To change the result, add a new step (a new schema version) that starts from what the shipped one wrote.
2. Each step goes from version N to N+1 and runs in order, so data that missed several releases goes through every step. The steps run in memory and the result is written once, so no half-migrated state is ever stored, and a failed migration writes nothing.
3. No backup is kept in storage: a successful migration means the settings are converted, and a failed one changes nothing and offers the old settings as a download. Users who want a copy before updating can use **Export Config** as always.
4. The popup only saves settings in the format of this build: `saveSiteSetting` and `saveGlobalSetting` write only when storage is empty or its `schema_version` is the current one. They refuse older data (a save would mark settings that wait for their migration as migrated; data with sites but no global settings counts as version 1) and newer data. Data with a newer schema version than the code knows is never written back. It only happens when an older build is installed by hand, since releases that change the format are never rolled back (see [the release guide](release.md#7-no-rollbacks-after-a-format-change)). Then `migrateStoredData` changes nothing, the saves fail with an error in the console, Import refuses a backup made by a newer version, and the popup asks the user to update the extension. The version is read from the raw `global_settings` (`storedSchemaVersion`), not through `GlobalSettingCodec`, so this still holds when a newer `GlobalSetting` does not decode here. Any new code that writes to storage must go through these functions or do the same check. The one exception is Import of a file of this version or older (`runImport` in `src/update.ts`): the user confirms that it replaces everything stored. Do not copy it for other writes.
5. Each change of the format adds a real export of the release before it to `test/fixture/` (`backup-<release>.json`), with tests in `test/old-backups.test.ts` that it loads, migrates and imports with the current code. Keep the exports of older releases and their tests: they check that data that missed several releases still goes through every step. Make each export with that release itself (built from its tag, a few rules on two sites, some global settings changed, then **Export Config**), never by hand. The folder is excluded from Prettier, so the files stay exactly as the extension wrote them.

## Release Steps for Migrations

- [ ] **Write Unit Tests**: Test the new step in `test/` with the stored JSON of the previous version, checking that nothing is lost.
- [ ] **Add the Export Fixture**: Add the export of the previous release to `test/fixture/` with its tests (rule 5 above), and a row to the versions table.
- [ ] **Run Manual QA**: Load the previous release (a dev build from its tag) unpacked, import its export, then build the new version into the same folder and reload the extension. Check that pages keep their padding before the popup is opened, that the popup asks to update the settings and nothing can be edited until **OK**, and that after **OK** every rule, site switch and global setting is there.
