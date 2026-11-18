# P1: Design Foundation — Audit Shared Components Against Tidy Rules

**Status**: `todo`
**Branch**: `task/P1`
**Depends on**: P0
**Estimated effort**: ~1h

---

## Goal
Audit the 12 shared components in `components/common/` and the theme tokens against the v2 tidy rules. Fix violations. Add any missing tokens or components that the v2 screens will need. After this packet, every future v2 screen packet can `import { ... } from "../components/common"` and follow the design system without inventing one-off styles.

## Why
The v2 screens (Rencana, Tugas, Kalender rebuilt) all use the shared components. If the design system has gaps (e.g. no "dashed outline block" card variant, no "banner" component for the "Buat jadwal" prompt), the builder will invent one-off styles in each screen, violating the tidy rules and creating inconsistency.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/components/common/Card.tsx` | Audit: must support a `variant` prop for "solid" (classes) vs "dashed" (study blocks). |
| `mobile/src/components/common/ScreenHeader.tsx` | Audit: must support streak chip + 1 icon action (settings). Max 2 icon actions. |
| `mobile/src/components/common/SectionHeader.tsx` | Audit: verify it matches tidy rules (section title + optional action). |
| `mobile/src/components/common/ListRow.tsx` | Audit: must support subject dot + title + subtitle (deadline) + trailing text (block time). |
| `mobile/src/components/common/PrimaryButton.tsx` | Audit: verify 3D tactile bevel, disabled state, loading state. |
| `mobile/src/components/common/SecondaryButton.tsx` | Audit: verify. |
| `mobile/src/components/common/TextButton.tsx` | Audit: verify. |
| `mobile/src/components/common/Chip.tsx` | Audit: verify. |
| `mobile/src/components/common/StatusPill.tsx` | Audit: verify. |
| `mobile/src/components/common/BottomSheet.tsx` | Audit: handle + centered title + X + one bottom button. |
| `mobile/src/components/common/EmptyState.tsx` | Audit: verify. |
| `mobile/src/components/common/Snackbar.tsx` | Audit: verify. |
| `mobile/src/components/common/index.ts` | Update exports if new components are added. |
| `mobile/src/components/common/Banner.tsx` | **NEW** — "Buat jadwal" banner for Rencana/Tugas screens (icon + text + button, single row). |
| `mobile/src/theme.ts` | Add any missing tokens for study blocks (dashed border style, block accent color). |
| `mobile/src/lib/i18n.ts` | Add v2-specific string keys (Rencana, Buat jadwal, Terjadwal, Belum dijadwalkan, Tidak muat, etc.) |

## Steps

### Step 1: Tidy Rules Audit

Read every file in `mobile/src/components/common/`. For each component, check:

1. **Colors**: All from `colors.*` — no hardcoded hex.
2. **Spacing**: Only `tidySpacing.small` (8), `tidySpacing.medium` (16), `tidySpacing.large` (24), `tidySpacing.screen` (16). No ad-hoc values.
3. **Text sizes**: Only `typography.sizes.caption` (12), `typography.sizes.body` (13), `typography.sizes.section` (15), `typography.sizes.title` (20). No ad-hoc font sizes.
4. **Touch targets**: All pressable areas ≥ `touchTarget.min` (48dp).
5. **3D bevel**: Cards and primary buttons have 2px border + 4dp bottom bevel.
6. **Props interface**: Typed, no `any`.

Record all violations in a table in your report.

### Step 2: Fix Violations

Fix any violations found in Step 1. Common fixes:
- Replace hardcoded `16` padding with `tidySpacing.screen`.
- Replace hardcoded `#1CB0F6` with `colors.primary`.
- Replace `fontSize: 14` with the nearest tidy size.
- Add missing `disabled` prop to buttons if absent.

### Step 3: Add `variant` to Card

`Card.tsx` needs a `variant` prop to support the new v2 visual distinction:
- `variant="solid"` (default): current solid card with 3D bevel. Used for classes, current block.
- `variant="dashed"`: dashed 2px border, no fill, no bottom bevel. Used for scheduled study blocks on the calendar timeline.
- `variant="banner"`: full-width, no border radius, colored background, single line. Used for the "Buat jadwal" prompt.

If adding `variant="banner"` to Card makes it too complex, create a separate `Banner.tsx` instead.

### Step 4: Add ListRow `trailing` and `subtitle` support

Check if `ListRow.tsx` already supports:
- `leading`: icon or subject dot (4dp colored circle)
- `title`: primary text
- `subtitle`: secondary text (e.g. "Tenggat: Senin, 2 Nov")
- `trailing`: right-aligned text or component (e.g. "14:00–14:45")

If any of these are missing, add them. The Tugas screen (P7) needs all 4.

### Step 5: Create Banner component

Create `mobile/src/components/common/Banner.tsx`:
- Props: `icon?: string` (Ionicons name), `text: string`, `buttonText: string`, `onPress: () => void`, `variant?: "info" | "warning" | "action"`.
- Layout: horizontal row, icon + text + right-aligned button.
- Used for the "Ada 3 tugas belum dijadwalkan — Buat jadwal" prompt.
- Follows tidy rules: `colors.*`, `tidySpacing.*`, `typography.sizes.*`.

Export from `index.ts`.

### Step 6: Add i18n strings for v2

Add the following keys to `mobile/src/lib/i18n.ts` under the `id` locale:

```
rencana: "Rencana"
buat_jadwal: "Buat jadwal"
tugas_baru: "Tugas baru"
dari_foto: "Dari foto"
dari_teks: "Dari teks"
terjadwal: "Terjadwal"
belum_dijadwalkan: "Belum dijadwalkan"
tidak_muat: "Tidak muat"
selesai: "Selesai"
mulai_fokus: "Mulai fokus"
rencana_hari_ini: "Rencana hari ini"
estimasi_waktu: "Estimasi waktu"
menit: "menit"
jam: "jam"
blok_berikutnya: "Blok berikutnya"
jadwal_sekolah: "Jadwal sekolah"
waktu_belajar: "Waktu belajar"
pengaturan: "Pengaturan"
opsi_lainnya: "Opsi lainnya"
belum_ada_tugas_dijadwalkan: "Belum ada tugas yang dijadwalkan"
buat_rencana_belajar: "Buat rencana belajar"
```

Do NOT remove existing keys. Only add new ones.

### Step 7: Add theme tokens for study blocks

In `mobile/src/theme.ts`, check if the `ThemePalette` interface has tokens for:
- A "dashed" border color for study blocks on the timeline (can reuse `colors.borderLight` or `colors.primary` at 40% opacity).
- A "block" surface color that is slightly different from `colors.surface` to distinguish study blocks from class cards.

If these are missing, add `blockBorder: string` and `blockSurface: string` to `ThemePalette`, and set values in all 7 themes. Use subtle tints of the theme's primary color.

### Step 8: Run tests

```bash
cd mobile
npx tsc --noEmit
node test_day_schedule_suite.mjs
node test_characterization_v2_baseline.mjs
```

## Acceptance Criteria

- [ ] All 12 existing components in `components/common/` pass the tidy rules audit (no hardcoded hex, no ad-hoc spacing/sizes, no `any` props, all touch targets ≥48dp).
- [ ] `Card.tsx` supports `variant="solid"` (default) and `variant="dashed"`.
- [ ] `ListRow.tsx` supports `leading`, `title`, `subtitle`, and `trailing` props.
- [ ] `Banner.tsx` exists in `components/common/` and is exported from `index.ts`.
- [ ] At least 20 new i18n string keys added for v2 screens.
- [ ] `blockBorder` and `blockSurface` tokens exist in `ThemePalette` and all 7 themes.
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] All existing test suites still pass.
- [ ] No visual regression in existing screens (the audit changes are cosmetic corrections only).

## Tests

No new test file. This is a design system audit — verify via compilation and visual inspection.

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| TypeScript compile | `cd mobile && npx tsc --noEmit` | Exit code 0 |
| Day schedule suite | `cd mobile && node test_day_schedule_suite.mjs` | 8/8 pass |
| Characterization suite | `cd mobile && node test_characterization_v2_baseline.mjs` | All pass |
| Hardcoded hex grep | `grep -rn "#[0-9a-fA-F]\{3,8\}" mobile/src/components/common/ --include="*.tsx" \| grep -v "colors\." \| grep -v "import"` | Zero matches (or only in comments/data, not styles) |

```bash
cd mobile
npx tsc --noEmit
node test_day_schedule_suite.mjs
node test_characterization_v2_baseline.mjs
```

## Do NOT Touch

- Any screen files (`screens/*.tsx`) — this packet only touches `components/common/`, `theme.ts`, and `i18n.ts`.
- `store.tsx` — no data model changes in this packet.
- `daySchedule.ts`, `deadlineEngine.ts`, `examEngine.ts`, `studyStreakEngine.ts` — logic modules are read-only.
- `docs/Plan.md` — the reviewer updates it.

## Edge Cases

- **Backward compatibility**: Existing screens import these components. If you add a new required prop, give it a default value so existing call sites don't break.
- **Card variant="dashed"**: The dashed border style in React Native uses `borderStyle: "dashed"`. This works on iOS but may render differently on Android (dotted instead of dashed on some versions). Note this in the report but don't try to fix it — it's a known RN limitation.
- **Banner vs Card**: If the Banner is just a Card with a different layout, consider making it a Card variant instead. Use your judgment — prefer the simpler solution. Document the choice in the report.
- **i18n key conflicts**: Some of the keys (like `selesai`) may already exist. Search `i18n.ts` before adding to avoid duplicates.

## Phone Checklist

- [ ] HomeScreen renders without crash (existing layout, no visual regression).
- [ ] CalendarScreen renders without crash.
- [ ] DashboardScreen renders without crash.
- [ ] SettingsScreen renders without crash.
- [ ] All screens look correct at 360dp width / 130% font scale.

## Report Format
After completing the task, create `docs/tasks/P1.report.md` with:
1. Tidy rules audit table: component name | violations found | fix applied
2. New/modified components: list with prop interfaces
3. i18n keys added: full list
4. Theme tokens added: list with values per theme
5. Files changed (with line counts)
6. Acceptance criteria — pass/fail for each
7. Test results — paste full output
8. Anything not completed and why

## Start Command
```
Read docs/Executor-Rules.md, then read this packet top to bottom before writing any code.
```
