| Priority | Improvement | Why it matters | Owner |
|---|---|---|---|
| 1 | **Make semantic retrieval visible** | The backend already returns keyword and semantic scores, but the macOS UI discards them. Show “Matched by meaning” so judges can see why AI matters. | Developer A UI; B supports contract |
| 2 | **Replace the stale demo script** | The current script still claims AI, Chrome, and retrieval are incomplete. Create one final Chrome → AI → natural-language retrieval walkthrough. | Shared / Developer A |
| 3 | **Recover stale processing records** | A backend restart during enrichment can leave a card processing indefinitely. Mark it recoverable/error on startup or safely resume it. | Developer B |
| 4 | **One-command clean startup** | Add `scripts/dev.sh` to validate configuration, start the backend, and print health/checklist URLs. This reduces demo setup risk. | Developer B |
| 5 | **Timeline grouping** | Group the existing list into Today, Yesterday, and Last Week using `created_at`. No backend or schema change is needed. | Developer A |
| 6 | **Clear privacy/provider state** | Display “Stored locally · AI via OpenAI” and explain that offline FTS works while enrichment/embeddings require OpenAI. | Shared |
| 7 | **Related memories strip** | Reuse existing semantic search to show 2–3 related cards. This delivers part of the memory-graph idea without building a graph. | Shared |
| 8 | **Submission polish** | Add screenshots, architecture diagram, license, known limitations, backup recording, and a `demo-stable` tag. | Shared |

Implementation progress:

- [x] Improvement 3: startup recovery makes interrupted processing visible and retryable.
- [x] Improvement 4: `scripts/dev.sh` provides validated one-command backend startup.
