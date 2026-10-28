# Storage Migration Strategy

Settings are stored in `chrome.storage.local` and decoded with the `io-ts` codecs in `src/common/type/`. When a future version changes those structures (e.g. `PadSetting` or `GlobalSetting`), follow this strategy so users don't lose their settings.

## Stored Keys

- `global_settings`: the `GlobalSetting`.
- `<hostname>`: the `SiteSetting` of that site (`src/common/type/site-setting.ts`): the site toggle (`enabled`, for every monitor) and a `monitors` list of `{ monitor: { width, height }, rules }`. A monitor without rules has no entry, so `rules` is never empty, and the same monitor never appears twice.
- `backup_v1_<hostname>`: the list a site had under schema version 1, kept by the migration below.

## Schema Versioning

- `GlobalSetting` carries `schema_version`, currently `2` (`CURRENT_SCHEMA_VERSION` in `src/common/type/global-setting.ts`). It's stored under the `global_settings` key.
- Version 1 stored each site as an array of `PaddingSetting` (the site toggle as a `DomainSetting` item, mixed with the `PathSetting` rules). Version 2 stores a `SiteSetting` instead.
- Both patterns below are in use for 1 -> 2:
  - `decodeStoredSiteSetting` reads either version. Version 1 had one list for every screen, so `migrateSiteSettingV1` turns it into the rules of the monitor of the caller: pages pass their own monitor, so old settings keep applying on every screen until the migration runs. Backup imports check values with it too.
  - The popup runs `migrateStorage` when it opens, before reading anything, with the monitor of the active tab. When `schema_version` is below 2 (or missing), it rewrites every version 1 site as a `SiteSetting` whose rules belong to that monitor, keeps the old list under `backup_v1_<hostname>`, and saves `schema_version: 2`.
- For the next migration, bump `CURRENT_SCHEMA_VERSION` and extend `migrateStoredData` in `src/storage/storage.ts`.

## Migration Implementation Patterns

If the schema needs modification in future versions, use one of the following patterns in `src/storage/storage.ts`:

1. **io-ts Decoder Fallbacks (Soft Migration)**:
   - Use `io-ts` unions (`t.union`) or custom types to decode older versions of the codec.
   - Example: If a field named `match` was renamed to `matchPattern`, decode with a union matching both types, and mapping the old key to the new key dynamically:
     ```typescript
     const OldPadSettingsCodec = t.type({ match: t.string })
     const NewPadSettingsCodec = t.type({ matchPattern: t.string })
     // Map incoming data to new schema during decoding
     ```

2. **Database Migration Runner (Hard Migration)**:
   - Implement a migration function `migrateData(fromVersion: number, toVersion: number): TE.TaskEither<Error, void>` which runs sequentially.
   - For example, if migrating V1 -> V2:
     - Read all stored keys (all hostnames).
     - Backup raw settings under a backup key (e.g. `backup_v1_[hostname]`) as a fallback.
     - Map over each domain's `PadSettings[]`, mutate the objects to match the V2 structure, and save them back.
     - Save `schema_version: 2` in `global_settings`.

## Release Steps for Migrations

- [ ] **Create Backup**: Implement automatic key backups before writing modified data structures.
- [ ] **Write Unit Tests**: Always write unit tests in `test/` validating that V(N-1) raw storage JSON correctly translates to VN structures without data loss.
- [ ] **Run Manual QA**: Verify update compatibility by loading a V(N-1) build in a clean browser profile, adding a few saved websites, updating to the target VN build, and confirming that custom padding values and ruler configurations are preserved.
