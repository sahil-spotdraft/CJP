# Moonshot Feature Hub — Product Overview & Demo Guide

Demo story follows the **real product journey from start to end**:

> **Customer org asks in Slack → Notification in the hub → Triage → Feature Request → Consolidation → Analytics → Roadmap decision**

Retention is optional and only at the very end if time remains.

---

## What is Moonshot?

**Moonshot Feature Hub** takes a feature ask from a customer org’s Slack channel and carries it all the way to a revenue-weighted product decision.

### One sentence

> From a customer org’s Slack ask to a ranked “build this next” decision — with notifications, triage, consolidation, and ARR analytics in between.

### Elevator pitch (60 seconds)

> A customer posts a feature request in their Slack channel. Moonshot detects it, notifies the team in the hub, and lets CS triage it — match to an existing request or create a new one.  
> As more orgs ask for the same thing, consolidations roll up ARR. Analytics scores the opportunity with **Prize Score = #accounts × unique ARR**, so Product puts the right work on the roadmap.  
> One continuous path: **org ask → notification → triage → backlog → consolidation → analytics → decision.**

---

## End-to-end journey (the spine of the demo)

```
Customer Org (Slack channel)
        ↓
AI detects feature request
        ↓
Notification bell + suggestion panel
        ↓
Triage (Match / Create / Dismiss)
        ↓
Feature / Product Request in the hub
        ↓
More orgs ask the same thing → Consolidation + ARR rollup
        ↓
Analytics (Prize Score, gaps, revenue at risk)
        ↓
Roadmap / status (what we commit to build)
        ↓
(optional) Retention — CS risk add-on
```

---

## Step-by-step

### 1. Feature request from a customer org
Org mapped in Orgs (Slack channel ↔ account + ARR). Customer posts an ask (e.g. Ceracare: Counterparty ID on List Contracts API).

### 2. AI detection
Classifier creates a signal/suggestion; bot can reply in-thread with a triage link.

### 3. Notification in the hub
Bell unread badge → suggestion panel → similar requests with match %.

### 4. Triage
Match / Create / Dismiss — aggregate demand, avoid duplicates.

### 5. Feature / Product Request
CLM-style sheet: account, ARR, owner, priority, status, notes, activity.

### 6. Consolidation
Same theme across orgs → rolled-up ARR.

### 7. Analytics
Prize Score = #accounts × unique ARR; gap board; critical queue; org/CSM/PM lenses.

### 8. Roadmap
Status → in roadmap — end of core journey.

### 9. Retention (optional, low priority)
Dark accounts / expiry / nudges — only if time remains.

---

## Demo checklist

- [ ] Org mapped (channel + ARR)
- [ ] Feature ask (Slack or `npm run demo:suggestion -- ceracare-counterparty-id`)
- [ ] Notification bell → suggestion panel
- [ ] Triage Match or Create
- [ ] Feature Requests home + detail
- [ ] Consolidation + ARR rollup
- [ ] Analytics Prize Score / gaps
- [ ] Roadmap or status as the finish
- [ ] Skip Retention unless asked
