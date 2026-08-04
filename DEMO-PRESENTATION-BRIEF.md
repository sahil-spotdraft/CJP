# Moonshot Feature Hub — Demo Presentation Brief

> **Purpose of this document:** Paste into Claude (or any LLM) to generate a polished PPT/slide deck for a live product demo.  
> **Audience:** Internal stakeholders, product, CS leadership, hackathon / moonshot demo judges.  
> **Tone:** Confident, story-driven, revenue-first. Prefer concrete account names and ARR over abstract claims.

---

## 1. One-liner (use on title / closing slide)

> **Analytics told us BIC, Synaptics, and ESTO weren’t getting the features they needed. Retention told us they’d gone completely dark — $128K in ARR, silent for 30+ days, and nobody knew. Now we know before it’s too late.**

**Shorter alternate:**  
> Moonshot turns scattered Slack feature asks into revenue-weighted product decisions — and catches silent churn before renewal is lost.

---

## 2. Product name & elevator pitch

| Field | Content |
|-------|---------|
| **Product name** | Moonshot Feature Hub |
| **Also called** | Moonshot |
| **Category** | Product intelligence + Customer Success retention radar |
| **Elevator pitch** | Collect customer feature requests from Slack with AI, triage and roll them up by ARR across accounts, then connect that demand signal to a renewal & silent-churn radar so Product and CS act before revenue walks out the door. |

---

## 3. The problem (why this exists)

Customer Success and Product today operate on **disconnected signals**:

1. **Feature asks live in Slack** — buried in customer channels, impossible to aggregate across accounts.
2. **Demand isn’t revenue-weighted** — a request from one $5K account looks the same as one from three $80K accounts.
3. **Silent churn is invisible** — accounts go dark (no logins, no contracts, no activity) for 30+ days and nobody notices until renewal is nearly lost.
4. **Product and CS don’t share a loop** — Product doesn’t see who’s churning because of missing features; CS doesn’t see which unmet asks are driving risk.

### The near-miss that inspired the product ($128K)

Three accounts had **zero activity for 30+ days** with **zero CSM visibility** until it was nearly too late:

| Account | ARR |
|---------|-----|
| BIC | $80K |
| Synaptics | $36K |
| ESTO | $12K |
| **Total silent risk** | **~$128K** |

This is the core demo story: *the class of risk that used to go unnoticed.*

---

## 4. The solution — what Moonshot does

Moonshot is a web hub that:

1. **Ingests** feature requests from customer Slack channels via an AI-powered Slack bot
2. **Triages** each signal — match to an existing request, create a new one, or dismiss
3. **Aggregates demand** across workspaces into consolidations with derived ARR
4. **Scores opportunity** on an Analytics page (Prize Score = # of accounts × unique ARR)
5. **Surfaces renewal & churn risk** on a Retention page (contracts expiring 30/60/90 days, dark accounts, activity drops)
6. **Closes the loop** — the same accounts requesting missing features show up as going dark, so Product and CS intervene together

---

## 5. Who uses it

| Role | What they do in Moonshot |
|------|--------------------------|
| **Customer Success Managers (CSMs)** | Triage Slack signals; manage product requests per account; filter Analytics/Retention by CS owner; send Slack alerts and one-click outreach nudges |
| **Product Managers** | Use Analytics (gap board, prize leaderboard, critical attention queue) to decide what to build next |
| **CS leadership / RevOps** | Monitor ARR coverage, revenue at risk, dark accounts, renewal pipeline |
| **Ops / Admin** | Map Slack channels → customer orgs; configure classifier thresholds |

---

## 6. Core product surfaces (what to show in the demo)

### A. Slack bot intake
- Customer posts a feature ask in a watched Slack channel
- AI classifies it as a feature request
- Bot replies **in-thread** with a link to triage
- CSM opens triage → Match / Create / Dismiss

### B. Feature Requests home (CLM-style sheet)
- One row per consolidation; workspaces listed
- Account, ARR, ask, CS owner, priority, status
- Manual create + consolidation rollups

### C. Analytics page — “What should we build?”
- **Prize Score** = #accounts × unique ARR
- Gap board (multi-account asks not on roadmap)
- Revenue at risk (Critical asks still open)
- Account heat, epic clusters, roadmap coverage
- Lenses: Organization / CSM / PM

### D. Retention page — “Who might leave?”
- Renewal pipeline: contracts expiring in 30 / 60 / 90 days
- Dark accounts: no activity for 14 / 30 / 45 / 60 days (configurable)
- At-risk ARR summary (story block references the $128K near-miss baseline)
- One-click Slack alert + outreach nudge templates
- Workspace detail: activity drops, open incidents/asks, renewal score, churn label

### E. The bridge (the demo’s “aha”)
Analytics shows customers requesting features we haven’t built → Retention shows those same accounts going dark.

---

## 7. Best demo narrative (recommended slide story)

Use this as the spine of the deck and the live walkthrough.

### Act 1 — The near-miss ($128K Dark Accounts)
**Slide:** Dark Accounts → The $128K Near-Miss  
**Show on Retention:** BIC ($80K), Synaptics ($36K), ESTO ($12K) flagged as **Dark** (no activity 30+ days).  
**Talking point:** Nobody noticed until it was nearly too late. Moonshot makes silent risk impossible to miss.

### Act 2 — Live renewal risk (contracts expiring)
**Slide:** Contracts Expiring 30/60/90  
**Best live demo account — Viralo:**
- Renewal: **Aug 31, 2026** (under 30 days)
- Only **3 of 11 users** active in last 30 days
- Show in the **🔴 Expiring in 30 days** bucket

**Other real accounts for backup:**
| Account | Renewal | Notes |
|---------|---------|-------|
| HireVue | Nov 29, 2026 | Complex relationship; contract end documented |
| InterGlobe | Dec 31, 2026 | ARR $13,596; 42% users inactive; 151 contracts pending >30 days |

### Act 3 — Workspace detail (InterGlobe)
**Slide / screen:** Workspace Retention Detail  
**Show for InterGlobe:**
- 42% inactive users in last 30 days
- OnlyOffice issues unresolved for 12+ months
- P0 access control incident (trust-critical)
- CSM: Pranjali Jaiswal
- Label: **🔴 High churn risk**

**Why this works:** activity drop ✅ + open issues ✅ + renewal date ✅ + clear risk label ✅

### Act 4 — Churn from missing features (Analytics ↔ Retention)
**Slide:** Feature demand became churn risk  

| Account | Signal | Risk |
|---------|--------|------|
| Spendflo | “Considering leaving for in-house tool” | 🔴 High |
| Ignite Digital | “Halted implementation, VerifAI was sole use case” | 🔴 High |
| BIC | “Renewal difficult, commitment walked back” | 🟡 Medium |
| NPR | “Churn risk stated explicitly over 3 blockers” | 🔴 High |

**Talking point:** Analytics shows these customers requested features we haven’t built → Retention shows they’re now going dark.

### Act 5 — Textbook dark account + nudge (Provana)
**Slide / screen:** Alert + nudge history  
**Quote:** *“Churn risk: Provana account ($13,892) — customer ignoring all communication”*  
**Show as:** No activity 45+ days, no response to nudges. Demo Slack alert + one-click outreach.

### Act 6 — Close the loop (Analytics Prize Score)
**Slide:** Feature Demand → ARR Prize Score  
From the Hackathon Idea Summary framing:  
> “#1 Contract Renewal Risk Radar — Revenue + Retention: 3 at-risk accounts ($128K total)”

**Demo move:** Show the product request on **Analytics** with a high Prize Score → switch to **Retention** and show the same accounts are dark. That is the one-line story made visual.

---

## 8. All possible use cases

### Use case 1 — Silent churn detection (Dark Accounts)
**Who:** CSM / CS leadership  
**Trigger:** Account has no product activity for N days (default 30)  
**Action:** Flagged on Retention; Slack alert; outreach nudge  
**Best example:** BIC + Synaptics + ESTO ($128K); Provana ($13.9K ignoring all communication)

### Use case 2 — Renewal pipeline management
**Who:** CSM / RevOps  
**Trigger:** Contract end within 30 / 60 / 90 days  
**Action:** Prioritize outreach; open workspace detail; check activity + unmet asks  
**Best example:** Viralo (renewal Aug 31, 2026, low user activity)

### Use case 3 — Workspace health / churn investigation
**Who:** Assigned CSM  
**Trigger:** High churn risk label or declining metrics  
**Action:** Review activity drops, open incidents, feature asks, renewal score  
**Best example:** InterGlobe (42% inactive, long-running issues, P0 incident)

### Use case 4 — Feature demand → build priority (Prize Score)
**Who:** Product Manager  
**Trigger:** Multiple accounts requesting the same capability  
**Action:** Rank by Prize Score (#accounts × ARR); put high-prize gaps on roadmap  
**Best example:** Contract Renewal Risk Radar / retention-related asks tied to the $128K cohort

### Use case 5 — Revenue-at-risk from unmet critical asks
**Who:** Product + CS jointly  
**Trigger:** Critical priority requests still in New / Shared / Discussed  
**Action:** Escalate to Product decision; show same accounts on Retention  
**Best example:** Spendflo, Ignite Digital, BIC, NPR churn-risk thread

### Use case 6 — Slack-native feature intake & triage
**Who:** CSM / Support  
**Trigger:** Customer posts a feature ask in Slack  
**Action:** Bot detects → CSM matches or creates canonical request → demand aggregates  
**Best example:** Live Slack paste → notification / triage link → match to existing consolidation

### Use case 7 — Cross-account demand consolidation
**Who:** Product / CS  
**Trigger:** Same ask appears from multiple workspaces  
**Action:** Roll into one Consolidation with derived total ARR  
**Outcome:** Stops treating each ask as a one-off; builds the business case

### Use case 8 — CSM workload & ownership clarity
**Who:** CS leadership  
**Trigger:** Need to see which owner owns which risk / asks  
**Action:** Filter Analytics and Retention by CS owner; use CS Owners directory  
**Best example:** InterGlobe owned by Pranjali Jaiswal on workspace detail

### Use case 9 — Proactive outreach (alerts & nudges)
**Who:** CSM  
**Trigger:** Dark account or soon-expiring contract  
**Action:** One-click Slack alert to retention channel; email/Slack nudge templates; track history  
**Best example:** Provana — ignoring communication; demo nudge history panel

### Use case 10 — Closing Product ↔ CS feedback loop
**Who:** Org-wide  
**Trigger:** Features not built → customers go quiet → renewal at risk  
**Action:** Single narrative across Analytics and Retention  
**Best example:** The presentation one-liner (BIC / Synaptics / ESTO)

---

## 9. Suggested slide outline (for Claude PPT generation)

Generate approximately **10–14 slides**. Prefer large numbers, account names, and short bullets. Avoid dense paragraphs on slides.

1. **Title** — Moonshot Feature Hub · Demo  
   Subtitle: From Slack asks to silent-churn radar  
2. **The $128K problem** — BIC / Synaptics / ESTO dark for 30+ days, nobody knew  
3. **What Moonshot is** — one-liner + 3 pillars: Intake · Analytics · Retention  
4. **How it works** — simple flow diagram: Slack → AI detect → Triage → Aggregate → Analytics ↔ Retention  
5. **Surface 1: Slack bot + triage** — screenshot / flow  
6. **Surface 2: Analytics** — Prize Score formula + gap board  
7. **Surface 3: Retention** — expiry buckets + dark accounts  
8. **Best live example: Viralo** — expiring in <30 days, low activity  
9. **Deep dive: InterGlobe workspace** — activity drop + incidents + high churn risk  
10. **Missing features → churn** — Spendflo / Ignite / BIC / NPR table  
11. **Provana** — textbook dark account + nudge/alert  
12. **The loop** — Analytics Prize → Retention Dark ($128K story visual)  
13. **Use cases summary** — 4–5 icons: Silent churn, Renewal radar, Prize scoring, Slack intake, CS↔Product loop  
14. **Close** — repeat the one-liner + “Now we know before it’s too late.”

---

## 10. Demo script (live walkthrough order)

1. **Open Retention** → point at Dark accounts / $128K near-miss story → name BIC, Synaptics, ESTO  
2. **Show Expiring in 30 days** → click **Viralo**  
3. **Open workspace detail** for **InterGlobe** → call out inactivity %, issues, P0, CSM, High churn risk  
4. **Send Slack alert / show nudge** on **Provana** (or similar dark account)  
5. **Switch to Analytics** → find high Prize Score / revenue-at-risk related to retention asks  
6. **Tell the bridge story:** same accounts requesting features → same accounts going dark  
7. **(Optional)** Paste a Slack message → show bot detection / triage / notification bell  
8. **Close with the one-liner**

---

## 11. Key metrics & formulas to put on slides

| Metric | Formula / meaning |
|--------|-------------------|
| **Prize Score** | `# of requesting accounts × unique ARR` |
| **Silent near-miss baseline** | **$128K** (BIC + Synaptics + ESTO) |
| **Dark account** | No activity for N days (default 30) |
| **Expiry buckets** | Contract end in 30 / 60 / 90 days |
| **Renewal score** | Composite (dark status, days to expiry, declining activity, critical open asks) — lower = higher risk |
| **Revenue at risk** | Critical priority asks still open (not decided / not shipped) |

---

## 12. Tech stack (optional appendix slide)

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind  
- **Backend:** Next.js API routes  
- **Database:** PostgreSQL + Prisma  
- **Auth:** NextAuth (credentials)  
- **Integrations:** Slack Events API + Web API bot  
- **AI:** OpenAI-compatible classifier + embeddings (heuristic fallback)  

Not the hero of the demo — mention only if asked “how is it built?”

---

## 13. Competitive / before-after framing

| Before Moonshot | After Moonshot |
|-----------------|----------------|
| Feature asks lost in Slack threads | AI detection + triage hub |
| One-off requests, no ARR weighting | Prize Score & consolidations |
| Dark accounts discovered at renewal | Proactive dark / expiry radar |
| Product and CS work in silos | Shared Analytics ↔ Retention loop |
| Near-miss $128K unnoticed | Same risk flagged in minutes |

---

## 14. Speaker notes / FAQ

**Q: Is this just another feature request tracker?**  
A: No — the differentiator is tying demand (Analytics) to renewal risk (Retention) with real ARR and activity signals.

**Q: Why Slack?**  
A: That’s where customers already talk. Moonshot meets them there instead of asking them to file tickets in a separate portal.

**Q: What’s the best single account for a live demo?**  
A: **Viralo** for expiry + low activity; **InterGlobe** for workspace detail richness; **BIC/Synaptics/ESTO** for the emotional $128K story; **Provana** for dark + ignored outreach.

**Q: What’s the one thing we want the audience to remember?**  
A: We can see silent churn and unmet feature demand *together* — before $128K (or more) walks away quietly.

---

## 15. Exact one-liner for the presentation slide (copy-paste)

```
Analytics told us BIC, Synaptics, and ESTO weren't getting the features they needed.
Retention told us they'd gone completely dark — $128K in ARR, silent for 30+ days,
and nobody knew. Now we know before it's too late.
```

---

## Instructions for Claude when generating the PPT

- Create a professional product-demo deck (not a technical deep-dive).
- Lead with the **$128K near-miss** and end with the **one-liner**.
- Use the **real account names and ARR figures** from this brief — they make the story credible.
- Prefer visuals: funnel/flow, before-after, prize formula, dark-account list, Viralo expiry callout.
- Keep bullets short; put narrative in speaker notes.
- Highlight **Viralo** as the best live Retention demo and **InterGlobe** as the best workspace-detail demo.
- Explicitly call out the **Analytics ↔ Retention connection** as the product’s unique insight.
- Title the deck something like: **Moonshot Feature Hub — Demo: Catch Silent Churn Before It Costs You**.
