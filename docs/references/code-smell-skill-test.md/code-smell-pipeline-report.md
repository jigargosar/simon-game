# Code Smell Audit Pipeline — Process & Results

## Theory

A single AI session analyzing code AND implementing fixes creates confirmation bias — it talks itself into findings during analysis, then can't objectively evaluate them during execution. Splitting into two isolated sessions eliminates this: an auditor surfaces candidates, a skeptic in a fresh session challenges each one independently.

## Pipeline Design

Two-stage shell pipeline using Claude CLI:

```
claude -p "/code-smell-audit <file>. Do NOT write any files — output everything to stdout only." | tee audit-N.log; cat audit-N.log | claude -p "Follow the instructions below." | tee executor-N.log
```

**Stage 1 (Auditor):** Permissive. Reads the file, surfaces 10-15 candidates as one-liners. Appends skeptic instructions to its output. Errs on the side of including too much — the skeptic filters.

**Stage 2 (Skeptic/Executor):** Receives findings + skeptic rules via stdin. Reads the source file independently. Evaluates each finding against tuned accept/reject criteria. Proposes exact code changes for survivors.

**Key properties:**
- No shared context between sessions (eliminates confirmation bias)
- Skeptic instructions travel with the findings (self-contained payload)
- `tee` captures both stages for comparison across runs
- The `-p` prompt is the control surface — skill stays stable, prompt adapts per run

## Skill: code-smell-audit

Location: `~/.claude/skills/code-smell-audit/SKILL.md`

### Auditor rules (what to look for)
- Can I understand this function without looking elsewhere?
- Is this code where it belongs?
- Does this function do exactly what its name says?
- Is every line earning its place?
- NOT bugs, NOT style — only readability and simplification

### Skeptic rules (tuned over 5 iterations)

**Accept when:**
- Code gets shorter or clearer
- A lying name gets fixed
- Extraction eliminates real duplication (not architecture)

**Reject when:**
- Behavior change, longer code
- Intentional coupling that callers rely on
- Inlining a readable name
- Moves code without reducing concepts

**Lying-name nudge (added after 3 pipeline runs):**
> A side effect being *logical* doesn't mean the name isn't lying. The test: if a new developer reads only the function name and its call sites — not the body — would they know about the side effect? If no, the name lies.

This was added because the skeptic kept excusing lying names by saying "the coupling is intentional" — answering "is this reasonable?" instead of "does the name communicate what happens?"

## Results: 3 Runs on Simon Game (src/main.js, ~330 lines)

### Findings surfaced by auditor
- Run 1: 14 findings
- Run 2: 13 findings
- Run 3: 14 findings

Mostly overlapping but not identical. Auditor is appropriately noisy.

### Executor decisions across runs

| Finding | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| countdown `order` = COLORS | Accept | Accept | Accept |
| redundant `accepting=false` before lockPads | Accept | Accept | Accept |
| lockPads accepting mutation (lying name) | Accept | Reject | Reject |
| updateDisplay mutates best (lying name) | Reject | Accept | Reject |
| allPadsOn/allPadsOff extraction | Accept | Not surfaced | Accept (inline) |
| stopGame `order` as COLORS reversed | Not surfaced | Accept | Accept |
| setStatus className rebuild | Reject | Accept | Reject |
| playBuzz merge into playTone | Reject | Reject | Accept |
| keydown map hoisting | Not surfaced | Not surfaced | Accept |
| addNote naming | Reject | Reject | Reject |
| celebrate sweep order | Reject | Reject | Reject |
| stopGame inline sound extraction | Reject | Reject | Reject |

### Consistency analysis

**Rock solid (3/3 accept):** countdown `order`, redundant `accepting=false`
**Consistently rejected (3/3 reject):** addNote naming, celebrate sweep, stopGame sound
**Noisy (varies):** lockPads lying name, updateDisplay lying name, allPads extraction, setStatus, playBuzz merge

### Conclusion

Multi-pass reveals what's real. The intersection of accepted findings across runs represents high-confidence improvements. The variance in lying-name detection motivated the skeptic nudge — to be validated on other codebases before further tuning.

## Plumbing Lessons

1. **`tee` filename collision:** The skill tried to write its own `audit.log`, colliding with `tee audit.log`. Fix: tell skill not to write files via `-p` prompt.
2. **stdin + `-p` work together:** Piped content is the input, `-p` is the instruction. Both arrive to the session.
3. **`;` vs `&&`:** PowerShell 5 doesn't support `&&`. Use `;` (runs regardless) for now. `&&` (run on success) needs PowerShell 7+.
4. **Progress visibility:** The `;` two-command structure gives free progress — audit.log is readable while executor runs. Single-pipe (`|`) only shows executor output.
5. **Executor reads real source:** Even when fed findings about a test file, the executor went to `src/main.js` using project context. This is correct behavior for real runs.

## Parked Items

- Explore `claude --help` for `--verbose`, `--stream`, `--allowedTools`, `--model` flags
- Meta-skill with bash/claude execute permission to orchestrate pipeline internally
- Log rotation / naming convention for automated runs
- `code-audit` (bug finding) skill — not yet tested in pipeline
- Run pipeline on tree-note project to validate against overfitting

## File References

- Skill: `~/.claude/skills/code-smell-audit/SKILL.md`
- Test project: `C:\Users\jigar\projects\simon-game\`
- Logs: `audit-{1,2,3}.log`, `executor-{1,2,3}.log` in simon-game directory
