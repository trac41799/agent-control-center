# 06 — Console Error Logs

All errors captured during Playwright browser testing of ACC at `http://localhost:1420`.

---

## Error Pattern

All errors follow the same root cause: `TypeError: Cannot read properties of undefined (reading 'invoke')` at `@tauri-apps/api/core`.

The `invoke` function is `undefined` because `window.__TAURI__` is not available in a regular browser — it is only injected by the Tauri webview runtime.

---

## Detailed Log

### Messages page (`/messages`) — 2 errors
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    at Object.getOpenSignals (orchestrationStore.ts:69)
    at Messages.tsx:51
```

### Outcomes page (`/outcomes`) — 2 errors
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    at getOutcomeStats (intelligenceStore.ts:20)
    at Outcomes.tsx:32
```

### Replay page (`/replay`) — 2 errors
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    at getFailureAnalyses (intelligenceStore.ts:29)
    at Replay.tsx:34
```

### Playbooks page (`/playbooks`) — 2 errors
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    at getMemoryCandidates (orchestrationStore.ts:83)
    at Playbooks.tsx:42
```

### Route page (`/route`) — 1 error (on Route Task click)
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    [route_task handler]
```

### Orchestrate page (`/orchestrate`) — 1 error (on Create Plan click)
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    [create_plan handler]
```

### Handoffs page (`/handoffs`) — 1 error (on Generate Handoff click)
```
TypeError: Cannot read properties of undefined (reading 'invoke')
    at invoke (@tauri-apps/api/core.js:111)
    [generate_handoff handler]
```

---

## Pages With No Errors

- **Runner** — zero errors (Tauri calls only on explicit spawn/kill/write actions)
- **Assets** — zero console errors (but shows inline error text in DOM)
- **Connectors** — zero console errors (but shows inline error text in DOM)
- **Knowledge** — zero errors
- **Scheduler** — zero errors
- **Costs** — zero console errors (but shows inline error text in DOM)
- **Settings** — zero errors (no Tauri dependencies)

---

## Error-Free Page Distribution

| Category | Pages | Count |
|----------|-------|-------|
| No Tauri deps at all | Settings | 1 |
| Tauri deps only on explicit action | Runner, Assets, Connectors, Knowledge, Scheduler, Costs | 6 |
| Tauri deps on page mount (broken) | Messages, Outcomes, Replay, Playbooks | 4 |
| Tauri deps on button click (broken) | Route, Orchestrate, Handoffs | 3 |

**Total:** 7 pages with errors, 7 pages without (though 3 of the error-free pages show inline error text rather than console errors).
