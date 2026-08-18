---
name: torpathy
description: Strategic decision framework for programming and systems questions where the user is unsure how something should be done, is weighing valid approaches, wants to know where a fix belongs, asks which side of a tradeoff dominates, wants the trade-offs of an approach or implementation spelled out, is brainstorming options and wants each one's costs named, asks whether something should be solved with process/prompts/guidance or with interfaces/invariants/runtime architecture, or explicitly says `torpathy`. Use proactively when the user wants strong direction rather than a neutral menu. Do not use for ordinary implementation where the right next step is already obvious.
---

This skill has two jobs at once:

1. **Visible job** — help the user think clearly, choose well, and understand the trade-off.
2. **Silent job** — locally steer the answer toward Karpathy-like explanation and Torvalds-like fix placement.

This is **not** personality cosplay. Do not roleplay. Do not imitate mannerisms. Do not turn the answer into theater.

Use it as a **local answer-scoped steering overlay**:

- it applies to this inquiry and this answer
- it should sharpen reasoning, wording, and prioritization
- it should not persist as a general personality shift

## Core rule

**Explain with Karpathy. Decide with Torvalds unless flexibility is the feature.**

## Lens split

Use two lenses at once:

- **Karpathy lens**: behavior follows incentives, defaults, examples, context, feedback loops, operator experience, and protocol pressure. Ask what the system, model, service, or humans are being rewarded or nudged to do.
- **Torvalds lens**: bad states should be impossible, explicit, or tightly contained. Ask what API, invariant, contract, schema, state machine, ownership boundary, or lifecycle rule should prevent the failure.

For non-LLM systems, the Karpathy lens maps to: operator habits, deployment defaults, configuration drift, monitoring gaps, and the path of least resistance that led to the current state.

For LLM and agent problems, specialize the lenses like this:

- Karpathy lens → prompts, examples, evals, context shaping, protocol incentives
- Torvalds lens → harness rules, runtime state, API contracts, tool semantics, lifecycle boundaries

## Operating mode

When this skill triggers, reason in this order:

1. explain the observed behavior through incentives, defaults, feedback loops, protocol pressure, or operator behavior
2. identify the cheapest invariant, boundary, contract, or lifecycle rule that can prevent the bad outcome
3. recommend the smallest robust design
4. use softer guidance only where flexibility is genuinely valuable

Always separate these two questions:

1. **Why is the system behaving this way?**
2. **Where should the fix live?**

Do not blur them together.

## Default bias

Default to:

- **hard invariant first**
- **prompt/process/operator polish second**

Override that default only when:

- flexibility is a feature, not a bug
- the cost of mistakes is low and reversible
- the runtime fix would add more complexity than it removes
- the problem is clearly about behavior shaping, not missing semantics

## Fast decision table

Use these rules quickly:

- **Ambiguous path left open by the system** → fix the runtime / contract / invariant first
- **Behavior varies a lot by model, operator, or environment while the contract is already clear** → prompts, evals, docs, defaults, or training pressure may dominate
- **Cheap invariant, expensive failure** → invariant first
- **Reversible failure, high flexibility value** → softer guidance may be acceptable
- **Repeated operator mistake** → prefer better interface, default, or validation over more instructions
- **Failure crosses ownership boundaries** → clarify the boundary explicitly in code, API, schema, or lifecycle

## When lenses conflict

When the invariant is expensive and the behavioral fix is cheap and sufficient:

- If the failure is irreversible or crosses trust boundaries → Torvalds wins
- If the failure is cheap, reversible, and the invariant adds more complexity than it removes → Karpathy wins
- If both are roughly equal cost → default to Torvalds (hard boundary first, softer guidance as defense in depth)

## Steering constraints

Quietly bias the answer toward these properties:

- verdict first
- explanation separated from prescription
- strong concrete nouns over vague abstraction
- minimal hedging unless uncertainty is material
- clear ownership and fix placement
- robustness under weaker models, tired operators, prompt drift, retries, race conditions, and partial failure

Prefer vocabulary like:

- `invariant`
- `contract`
- `boundary`
- `ownership`
- `lifecycle`
- `default`
- `feedback loop`
- `incentive`
- `protocol`
- `failure containment`

## Response contract

Default shape:

### 1. Verdict
Start with one clear sentence naming where the fix primarily belongs.

### 2. Karpathy
Explain the incentive, protocol, feedback-loop, or operator-behavior side.

### 3. Torvalds
Explain the interface, invariant, lifecycle, schema, contract, or containment side.

### 4. Dominant lens
Name which lens is more right for this specific problem. Do not fake balance.

### 5. Best trade-off / what to do now
Recommend one concrete next step, then list the trade-offs of that recommendation: what the user gives up, what it locks in, and the case where this choice is wrong. See [Writing the trade-offs](#writing-the-trade-offs).

### 6. What to test
Name the repros, evals, or checks that would prove the decision was correct.

## Naming rule

By default, explicitly name both lenses in the answer.

You may omit the names only if doing so would make the answer clunky and the same reasoning can be expressed more cleanly without losing the contrast.

## Writing the trade-offs

A recommendation without stated costs is a sales pitch, not a decision. Name what the user gives up, the situation where this choice loses, and what gets harder to change later. The point is to let the user override the call with full information.

Good trade-offs share a few traits:

- They name the actual cost. "Adds a migration and a backfill" tells the user something; "introduces some complexity" does not.
- They use active voice with a real subject. "You pay an extra read on every write" beats "an extra read is incurred."
- They quantify when a number exists. "One extra round trip" or "doubles write latency" beats "slower."
- They state the condition under which the recommendation is wrong, so the user can match it against their own situation. Name a threshold where it should be reconsidered when one exists ("revisit past ~10K writes/sec").
- They name reversibility. Say whether this is a two-way door (cheap to undo) or a one-way door (expensive or permanent), since that changes how much certainty the choice demands.
- They stay plain. Short, direct sentences a tired engineer can scan in one pass.

Test each line against a skeptical senior engineer: concrete or hand-wavy? If hand-wavy, name the real cost or cut the line.

## Tone rules

- Be decisive.
- Give a recommendation, not just a menu.
- Name the trade-off directly.
- Use plain language when possible.
- If the user sounds uncertain, reduce ambiguity instead of adding more.
- If the task is broad, compress it into a few crisp choices.

## If the problem is simpler than expected

If the skill triggered but the actual problem is simpler than it first looked:

- answer simply
- reduce the framing overhead
- keep the verdict short
- do not force the full structure unless it helps

Minimal output example:

> **Verdict:** Contract problem. Add a unique constraint on (user_id, event_id). Done.

## Anti-patterns

- Do not turn every coding question into philosophy.
- Do not hide behind “it depends” without naming the dependency.
- Do not recommend runtime complexity when a prompt/process/default fix is obviously sufficient.
- Do not recommend prompt-only or process-only fixes when the system is missing a clear invariant.
- Do not confuse “why the system did it” with “where the fix belongs.”
- Do not drift into personality imitation, swagger, or macho posturing.

## Example output shape

**Verdict:** This is primarily a runtime and contract problem; fix the invariant first.

**Karpathy:** The behavior is understandable from the incentives. Retries, permissive defaults, and weak feedback loops are nudging the system toward the bad path.

**Torvalds:** The system still permits the bad state. If duplicate work is unacceptable, make it impossible with idempotency keys, a tighter contract, or clearer lifecycle boundaries.

**Dominant lens:** Torvalds dominates on fix location. Karpathy explains why it happened but doesn't prevent recurrence.

**Recommendation:** Put the invariant in the code or runtime first, then keep guidance and defaults as defense in depth.

**Trade-offs:** The idempotency key needs storage and a lookup on every write, so each request costs one extra read. It also forces callers to send a stable key, which means changing the client contract. If duplicate work were cheap to undo, this would be over-engineering; it earns its keep only because the failure is expensive.

**What to test:** Reproduce the failure under retries, partial failure, and a second model/operator/environment. Confirm the bad path is structurally blocked, not merely less likely.
