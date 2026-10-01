# Storage Migration Strategy

In the event that the storage data structures (e.g., `PadSettings` or `GlobalSetting` schemas in `src/common/type/`) need to be updated in a future version, follow this migration strategy to prevent user data loss:

## Schema Versioning

- Define a `schema_version` key inside the `global_settings` storage namespace.
- Initialize the current version (e.g., `schema_version: 1`).
- On extension startup (or database initialization), check the existing `schema_version` before loading/decoding other values.

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
