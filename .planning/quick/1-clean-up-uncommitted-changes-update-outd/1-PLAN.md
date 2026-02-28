---
phase: quick-cleanup
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .gitignore
  - CLAUDE.md
  - .planning/STATE.md
  - frontend/src/app/bullets/page.tsx
  - frontend/src/app/cartridges/page.tsx
  - frontend/src/components/drawings/AssemblyDrawing.tsx
  - frontend/src/components/drawings/CartridgeCrossSection.tsx
  - frontend/src/components/drawings/ChamberDrawing.tsx
  - frontend/src/components/drawings/DimensionLabel.tsx
  - frontend/src/components/drawings/HatchPatterns.tsx
  - frontend/src/components/drawings/BulletProfile.tsx
  - frontend/src/lib/drawings/dimension-layout.ts
  - frontend/src/lib/drawings/themes.ts
  - frontend/src/lib/geometry/bullet-geometry.ts
autonomous: true
requirements: [cleanup]

must_haves:
  truths:
    - "All drawing-related work is committed with clean git status"
    - "Screenshot PNGs and .playwright-mcp are gitignored and not tracked"
    - "CLAUDE.md documents Phase 12 drawings system (structure, components, libs)"
    - "STATE.md reflects post-phase-12 cleanup commit"
    - "Frontend builds without errors after commit"
  artifacts:
    - path: ".gitignore"
      provides: "Entries for *.png screenshots and .playwright-mcp/"
      contains: ".playwright-mcp"
    - path: "CLAUDE.md"
      provides: "Phase 12 documentation in project structure and estado"
      contains: "drawings"
    - path: ".planning/STATE.md"
      provides: "Updated last activity and session continuity"
  key_links:
    - from: ".gitignore"
      to: "root directory"
      via: "glob patterns exclude screenshots and playwright dir"
      pattern: "drawings-\\*\\.png"
---

<objective>
Clean up all uncommitted post-Phase-12 drawing improvements, update project docs, and verify the frontend builds.

Purpose: The user has been iterating on drawing components outside of GSD. There are 10 modified files and 1 new file (BulletProfile.tsx) with significant improvements: bezier-to-polyline bullet geometry simplification, viewBox-based responsive SVGs, ogive curve rendering in assembly, and bullet preview in the edit form. These need to be committed, screenshots gitignored, and docs updated to reflect the drawings system.

Output: Clean git state, updated CLAUDE.md and STATE.md, verified build.
</objective>

<execution_context>
@C:/Users/vall-/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/vall-/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.gitignore
</context>

<tasks>

<task type="auto">
  <name>Task 1: Gitignore cleanup and commit all drawing improvements</name>
  <files>.gitignore</files>
  <action>
1. Add the following entries to `.gitignore` (append at end, under a new `# Screenshots and temp` section):
   ```
   # Screenshots and temp
   *.png
   .playwright-mcp/
   ```
   Note: Using `*.png` in root is safe because all project images are in subdirectories not tracked by git. The 14 screenshot PNGs (drawings-*.png, final-cross-section.png) are all in the repo root from debugging sessions.

2. Stage all 11 modified/new frontend files for commit:
   - frontend/src/app/bullets/page.tsx (bullet preview in edit form)
   - frontend/src/app/cartridges/page.tsx (cartridge preview in edit form)
   - frontend/src/components/drawings/AssemblyDrawing.tsx (viewBox responsive, ogive bezier curve for bullet)
   - frontend/src/components/drawings/CartridgeCrossSection.tsx (padding/style adjustments)
   - frontend/src/components/drawings/ChamberDrawing.tsx (padding/style adjustments)
   - frontend/src/components/drawings/DimensionLabel.tsx (style refinements)
   - frontend/src/components/drawings/HatchPatterns.tsx (style refinements)
   - frontend/src/components/drawings/BulletProfile.tsx (NEW - standalone bullet profile drawing)
   - frontend/src/lib/drawings/dimension-layout.ts (minor adjustments)
   - frontend/src/lib/drawings/themes.ts (minor adjustments)
   - frontend/src/lib/geometry/bullet-geometry.ts (replaced bezier curves with polylines, -140 lines)

3. Also stage .gitignore and frontend/tsconfig.tsbuildinfo.

4. Commit with message:
   ```
   fix(drawings): improve bullet rendering and add BulletProfile component

   - Replace complex bezier ogive curves with polyline approach in bullet-geometry.ts (-140 lines)
   - Add quadratic bezier ogive curve to AssemblyDrawing bullet indicator
   - Switch SVGs to viewBox + preserveAspectRatio (remove fixed width/height props)
   - Create BulletProfile.tsx standalone bullet technical drawing component
   - Add bullet preview to bullets edit form, cartridge preview to cartridges edit form
   - Adjust padding and style refinements across all drawing components
   - Add .gitignore entries for screenshot PNGs and .playwright-mcp/
   ```

5. Verify git status is clean after commit (no tracked modified files remaining).
  </action>
  <verify>
    <automated>cd C:/Users/vall-/Desktop/projectes/simulador_balistica && git status --porcelain | grep -v "^??" | wc -l</automated>
    Expected: 0 (no tracked modified files; untracked screenshot PNGs now gitignored)
  </verify>
  <done>All drawing improvements committed, .gitignore updated, git status clean for tracked files</done>
</task>

<task type="auto">
  <name>Task 2: Update CLAUDE.md and STATE.md with Phase 12 drawings documentation</name>
  <files>CLAUDE.md, .planning/STATE.md</files>
  <action>
1. **Update CLAUDE.md** - Add the drawings system to project documentation:

   a. In the `## Estructura del Proyecto` tree, add under `frontend/src/`:
      ```
      ├── components/
      │   ├── drawings/          # SVG technical drawings (Phase 12)
      │   │   ├── AssemblyDrawing.tsx      # Barrel+cartridge+bullet assembly
      │   │   ├── BulletProfile.tsx        # Standalone bullet profile drawing
      │   │   ├── CartridgeCrossSection.tsx # Cartridge cross-section with hatching
      │   │   ├── ChamberDrawing.tsx       # Chamber dimensions drawing
      │   │   ├── DimensionLabel.tsx       # Reusable dimension annotation
      │   │   ├── HatchPatterns.tsx        # SVG hatch pattern definitions
      │   │   └── TitleBlock.tsx           # Drawing title block
      ```
      Also add under `lib/`:
      ```
      ├── lib/
      │   ├── drawings/          # Drawing computation (pure, no React)
      │   │   ├── dimension-layout.ts  # Greedy interval scheduling for dim placement
      │   │   ├── themes.ts           # Blueprint and modern theme definitions
      │   │   ├── title-block.ts      # Title block data computation
      │   │   └── types.ts            # DimensionAnnotation, DrawingTheme types
      │   └── geometry/          # Bullet/cartridge geometry engines
      │       ├── bullet-geometry.ts   # SVG path + ProfilePoint[] generation
      │       └── types.ts            # BulletDimensions, ProfilePoint types
      ```

   b. In `## Estado por Fases`, between FASE 6 and Problemas Conocidos, add:
      ```
      ### Post-FASE: 2D SVG Technical Drawings - COMPLETADA
      - [x] Drawing components: Assembly, Cross-Section, Chamber, BulletProfile
      - [x] Pure computation libraries: dimension-layout, themes, title-block
      - [x] Geometry engine: bullet-geometry.ts (SVG path + ProfilePoint[])
      - [x] Drawings page at /drawings with tab navigation
      - [x] PDF/PNG export via jsPDF + svg2pdf.js
      - [x] Deep link from simulation results to drawings
      - [x] Bullet preview in bullets/cartridges edit forms
      - [x] Responsive SVG with viewBox + preserveAspectRatio
      ```

   c. In `## Estructura del Proyecto`, add the drawings page under `app/`:
      ```
      │   ├── drawings/page.tsx  # 2D SVG technical drawings (assembly, cross-section, chamber)
      ```

   d. In `## Dependencias Clave` Frontend section, add: `jsPDF 2.x, svg2pdf.js`

   e. In `## Convenciones`, add:
      ```
      - Drawing computation libraries are pure (zero React imports), consumed by SVG components
      - SVG drawings use viewBox + preserveAspectRatio="xMidYMid meet" (no fixed width/height)
      - userSpaceOnUse for all SVG hatching patterns
      - forwardRef on drawing components for SVG export serialization
      ```

   f. Mark the "Quick Wins" items that were completed in Phase 12 era. Based on STATE.md decisions, these are done. Keep the Roadmap section accurate.

2. **Update .planning/STATE.md**:

   a. Update `last_updated` to current date.
   b. Update `Current Position` section:
      ```
      Last activity: 2026-02-28 — Post-phase-12 drawing improvements committed (polyline bullet rendering, BulletProfile component, responsive SVGs)
      ```
   c. Update `Session Continuity`:
      ```
      Last session: 2026-02-28
      Stopped at: Committed post-phase-12 drawing improvements and doc updates
      Resume: Continue with Phase 13 or next milestone
      ```

3. Commit both files:
   ```
   docs: update CLAUDE.md and STATE.md with Phase 12 drawings system
   ```
  </action>
  <verify>
    <automated>cd C:/Users/vall-/Desktop/projectes/simulador_balistica && grep -c "drawings" CLAUDE.md</automated>
    Expected: At least 10 occurrences of "drawings" in CLAUDE.md (structure entries, estado, conventions)
  </verify>
  <done>CLAUDE.md contains full Phase 12 drawings documentation (structure tree, estado, conventions, dependencies). STATE.md reflects current session state.</done>
</task>

<task type="auto">
  <name>Task 3: Verify frontend builds successfully</name>
  <files></files>
  <action>
1. Run the Next.js production build to verify all drawing component changes compile without errors:
   ```bash
   cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build
   ```
   This validates:
   - New BulletProfile.tsx imports resolve correctly
   - bullet-geometry.ts polyline refactor compiles (removed bezier functions)
   - AssemblyDrawing.tsx props change (removed width/height) has no consumers passing those props
   - All TypeScript types align after the changes

2. If the build fails, diagnose and fix the issue, then re-run.

3. If the build succeeds, no further action needed. The build output itself is the verification.
  </action>
  <verify>
    <automated>cd C:/Users/vall-/Desktop/projectes/simulador_balistica/frontend && npx next build 2>&1 | tail -5</automated>
    Expected: Build output ending with "Compiled successfully" or route table output (no errors)
  </verify>
  <done>Frontend production build passes with zero errors, confirming all drawing component changes are valid TypeScript and all imports resolve</done>
</task>

</tasks>

<verification>
1. `git status` shows clean working tree (no tracked modifications)
2. `git log --oneline -3` shows the two new commits (drawing improvements + docs update)
3. `grep "drawings" CLAUDE.md` returns multiple hits confirming documentation
4. `npx next build` completes without errors
</verification>

<success_criteria>
- All 11 modified/new drawing files committed in a single descriptive commit
- .gitignore updated with screenshot PNG and .playwright-mcp patterns
- CLAUDE.md documents the full drawings system (components, libs, geometry, conventions)
- STATE.md reflects current session state
- Frontend builds successfully with all changes
- Git working tree is clean
</success_criteria>

<output>
After completion, create `.planning/quick/1-clean-up-uncommitted-changes-update-outd/1-SUMMARY.md`
</output>
