# GA-Bagua Semantic Encoding Skill

## Purpose
Encode any concept, text, or code entity into an 8-element unit-norm multivector
using the geometric algebra semantic role taxonomy derived from the I-Ching Bagua
system. The resulting 64-byte encoding enables O(1) algebraic reasoning about
relationships — comparison, classification, analogy, contradiction, and
composition — without further LLM calls.

## The 8 Semantic Roles
Each role maps to one basis blade of Cl(3) geometric algebra, ordered by blade index:

### Index 0: receptive (坤 Kūn — Earth — Scalar blade)
- **Positive:** Accepts, follows, grounds; adopts conventions; dependency acceptance; passivity
- **Negative:** Counter-receptive — resists grounding; rejects conventions; independence; defiance
- **System equivalent:** dependency consumer; convention follower; stable foundation

### Index 1: causal (震 Zhèn — Thunder — e1 blade)
- **Positive:** Triggers, initiates, starts chain reactions; event-driven; excites
- **Negative:** Counter-causal — dampens, suppresses, prevents initiation; inhibits triggers
- **System equivalent:** initiator; trigger; event source; entry point

### Index 2: transmissive (坎 Kǎn — Water — e2 blade)
- **Positive:** Channels, flows, transmits; data pipelines; streaming; conduction
- **Negative:** Counter-transmissive — blocks flow, isolates, contains; no propagation
- **System equivalent:** pipe; channel; stream; router; message bus

### Index 3: constraining (艮 Gèn — Mountain — e3 blade)
- **Positive:** Limits, bounds, restricts; permissions; capacity; guardrails
- **Negative:** Counter-constraining — unbounds, frees, removes limits; permissive
- **System equivalent:** boundary; gate; limiter; validator; capacity control

### Index 4: clarifying (離 Lí — Fire — e12 blade)
- **Positive:** Reveals, illuminates, makes visible; introspection; dependency revelation
- **Negative:** Counter-clarifying — obscures, hides, makes opaque; black box
- **System equivalent:** logger; monitor; debugger; introspection system

### Index 5: influential (巽 Xùn — Wind — e23 blade)
- **Positive:** Pervades, gradually affects; convention spreading; osmotic influence
- **Negative:** Counter-influential — resists spread; isolated; contained; non-viral
- **System equivalent:** gradual rollout; culture carrier; convention propagator

### Index 6: balancing (兌 Duì — Lake — e31 blade)
- **Positive:** Mirrors, equilibrates, reflects; feedback loops; mutual dependency
- **Negative:** Counter-balancing — destabilizes; creates asymmetry; unidirectional
- **System equivalent:** feedback loop; load balancer; peer; mirror

### Index 7: generative (乾 Qián — Heaven — e123 blade)
- **Positive:** Introduces, creates, initiates new patterns; innovation; creativity
- **Negative:** Counter-generative — destroys, removes, deprecates; pattern elimination
- **System equivalent:** creator; factory; pattern introducer; constructor

## Encoding Rules

For a given concept, assign a weight in [-1.0, 1.0] to each role:
- **> 0.5:** The concept strongly exhibits this quality
- **0.2 to 0.5:** Moderately exhibits
- **0.05 to 0.2:** Slightly exhibits
- **-0.05 to 0.05:** Irrelevant to this concept
- **-0.2 to -0.05:** Slightly counters this quality
- **-0.5 to -0.2:** Moderately counters
- **< -0.5:** Strongly counters / actively opposes

The 8 weights MUST form a unit-length vector (Euclidean norm ≈ 1.0).
Normalize after assigning all weights.

## Encoding Process

1. Read the concept description
2. For each of the 8 roles, ask: "Does this concept exhibit or counter this quality?"
3. Assign a raw weight per role
4. Normalize the 8 weights to unit norm
5. Output as a JSON array

## Output Format

Output ONLY this exact format, nothing else:

```json
[receptive, causal, transmissive, constraining, clarifying, influential, balancing, generative]
```

Where each value is a float in [-1.0, 1.0].

## Examples

### Example 1: Database Transaction
Concept: "a database transaction that ensures atomicity consistency isolation durability across multiple write operations"

Analysis:
- receptive: +0.30 (follows ACID conventions deeply)
- causal: +0.05 (starts work, but not the primary nature)
- transmissive: +0.15 (moves data, but not the main role)
- constraining: +0.85 (STRONGLY constrains — atomicity boundaries, rollback rules)
- clarifying: +0.35 (makes state visible through isolation levels)
- influential: +0.20 (spreads consistency guarantees gradually)
- balancing: +0.40 (mirrors — reads must match writes; ACID properties reflect each other)
- generative: +0.10 (creates new committed states)

Raw: [0.30, 0.05, 0.15, 0.85, 0.35, 0.20, 0.40, 0.10]
Norm: sqrt(0.30² + 0.05² + 0.15² + 0.85² + 0.20² + 0.35² + 0.40² + 0.10²)
= sqrt(0.09 + 0.0025 + 0.0225 + 0.7225 + 0.04 + 0.1225 + 0.16 + 0.01)
= sqrt(1.17) ≈ 1.082

Normalized: [0.28, 0.05, 0.14, 0.79, 0.18, 0.32, 0.37, 0.09]

### Example 2: Rate Limiter
Concept: "a rate limiter that restricts the number of requests a client can make in a time window"

Analysis:
- receptive: 0.05 (neither follows nor resists conventions)
- causal: -0.10 (slightly dampens triggers — slows things down)
- transmissive: -0.60 (STRONGLY blocks flow — opposite of transmissive)
- constraining: 0.80 (STRONGLY constrains — the entire purpose)
- clarifying: 0.25 (reveals usage patterns, makes limits visible)
- influential: -0.30 (prevents spread, restricts access pattern)
- balancing: 0.20 (creates fair distribution across clients)
- generative: -0.40 (prevents creation of new requests past limit)

Raw: [0.05, -0.10, -0.60, 0.80, 0.25, -0.30, 0.20, -0.40]
Norm: sqrt(0.0025 + 0.01 + 0.36 + 0.64 + 0.09 + 0.0625 + 0.04 + 0.16) = sqrt(1.365) ≈ 1.168

Normalized: [0.04, -0.09, -0.51, 0.68, -0.26, 0.21, 0.17, -0.34]

### Example 3: Message Queue
Concept: "a message queue that transmits events between services asynchronously with guaranteed delivery"

Analysis:
- receptive: 0.15 (accepts messages as input; follows FIFO convention)
- causal: 0.25 (triggers downstream processing on message arrival)
- transmissive: 0.80 (STRONGLY transmissive — the entire purpose is to transmit)
- constraining: -0.20 (slightly unbounding — decouples services, removes direct constraints)
- clarifying: -0.25 (somewhat obscures — async makes timing opaque)
- influential: 0.10 (slightly spreads state changes across services)
- balancing: 0.35 (creates symmetry between producer and consumer)
- generative: 0.05 (messages CAN introduce new patterns, but not primary)

Raw: [0.15, 0.25, 0.80, -0.20, -0.25, 0.10, 0.35, 0.05]
Norm: sqrt(0.0225 + 0.0625 + 0.64 + 0.04 + 0.01 + 0.0625 + 0.1225 + 0.0025) = sqrt(0.9625) ≈ 0.981

Normalized: [0.15, 0.25, 0.81, -0.20, 0.10, -0.25, 0.36, 0.05]

## Crib Sheet: Quick Mapping

When reasoning about a concept, ask these diagnostic questions:

| Question | If YES → positive on | If NO / OPPOSITE → negative on |
|----------|---------------------|-------------------------------|
| Does it create/introduce new things? | generative (+) | counter-generative (-) |
| Does it trigger/start chain reactions? | causal (+) | counter-causal (-) |
| Does it move/transmit/pipe data? | transmissive (+) | counter-transmissive (-) |
| Does it limit/restrict/bound? | constraining (+) | counter-constraining (-) |
| Does it reveal/make visible? | clarifying (+) | counter-clarifying (-) |
| Does it gradually spread/pervade? | influential (+) | counter-influential (-) |
| Does it mirror/balance/reflect? | balancing (+) | counter-balancing (-) |
| Does it accept/follow/ground? | receptive (+) | counter-receptive (-) |
