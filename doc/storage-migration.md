# Storage Migration Strategy

Settings are stored in `chrome.storage.local` and decoded with the `io-ts` codecs in `src/common/type/`. When a future version changes those structures (e.g. `PadSetting` or `GlobalSetting`), follow this strategy so users don't lose their settings.

## Schema Versioning

- `GlobalSetting` already carries `schema_version`, currently `1` (`src/common/type/global-setting.ts`). It's stored under the `global_settings` key.
- Nothing reads it yet, because there has been no migration so far.
- With the first migration, check `schema_version` on startup, before decoding the other values, and bump the default in `global-setting.ts`.

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
