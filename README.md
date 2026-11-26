# Rep Quest

A personal, game-style workout tracker: XP, levels, weekly quests, and badges for an
Upper / Lower / Rest / Upper / Lower / Rest / Rest split, one hard cardio session a week,
and 10k steps a day.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 (also reachable from your phone on the same Wi-Fi)
npm test         # progression + XP logic tests
```

## How progression works

- Rep range 5–9. Hit **9 reps** at a weight → next session suggests **+increment** (set per exercise in Settings).
- Below 9 → same weight, aim for one more rep than last time.
- Earning a new weight jump = **+50 XP**. Beating a previous set = PR, **+20 XP**.

## XP

| Action | XP |
| --- | --- |
| Set logged | 10 |
| Workout finished | 100 |
| Weight jump earned | 50 |
| PR | 20 |
| Cardio (easy / moderate / hard) | 50 / 80 / 150 |
| Step goal hit | 50 |
| Week cleared (4 lifts + hard cardio) | 300 |
| Perfect week (+ steps all 7 days) | 200 |
| Badge unlocked | 100 |

Data lives in the browser's localStorage; use **Settings → Export backup** regularly.
