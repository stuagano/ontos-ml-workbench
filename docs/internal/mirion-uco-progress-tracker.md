# Mirion UCO Progress Tracker
## Weekly Status Report

**Account:** Mirion Technologies
**Week Of:** January 27, 2025
**Last Updated:** January 26, 2025

---

## Summary Dashboard

| UCO | Use Case | Stage | Health | Consumption | Trend |
|-----|----------|-------|--------|-------------|-------|
| UCO-1 | MEDIAN Foundation | U2 | 🟡 | $0 | ➡️ |
| UCO-2 | Sievo/Procurement ⭐ | U2 | 🟡 | $0 | ➡️ |
| UCO-3 | Monte Carlo 🔥 | U1 | 🟡 | $0 | ➡️ |
| UCO-4 | VITAL Workbench | U1 | 🟢 | $0 | ⬆️ |
| UCO-5 | Edge AI / VitalHub | U1 | 🟡 | $0 | ➡️ |
| UCO-6 | GenAI / Mosaic AI | U1 | 🟡 | $0 | ➡️ |
| UCO-7 | Customer 360 | U0 | ⚪ | $0 | ➡️ |
| UCO-8 | Finance Golden Record | U0 | ⚪ | $0 | ➡️ |
| UCO-9 | Data Clean Rooms | U0 | ⚪ | $0 | ➡️ |
| UCO-10 | Medical / Oncospace | U0 | ⚪ | $0 | ➡️ |

**Legend:**
- 🟢 On Track | 🟡 At Risk | 🔴 Blocked | ⚪ Not Started
- ⬆️ Improving | ➡️ Stable | ⬇️ Declining

---

## UCO-1: MEDIAN Foundation

| Attribute | Value |
|-----------|-------|
| **Stage** | U2 - PoC/Pilot |
| **Health** | 🟡 At Risk |
| **Owner (Customer)** | Ben Sivoravong |
| **Owner (DBX)** | Neha Prabhu |
| **Target Stage** | U3 by Q2 2025 |

### Progress This Week
- [ ] Workspace provisioning request submitted
- [ ] Unity Catalog design in progress
- [ ] Schema-Creation utility spec drafted

### Blockers
| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| Workspace not yet provisioned | High | Neha | Feb 7 |

### Next Actions
| Action | Owner | Due |
|--------|-------|-----|
| Follow up on workspace provisioning | Neha | Jan 28 |
| Complete UC schema design | Ben/Neha | Feb 3 |
| Deploy Schema-Creation utility | Ben | Feb 10 |

### Consumption
| Period | Forecast | Actual | Variance |
|--------|----------|--------|----------|
| Jan 2025 | $0 | $0 | - |
| Q1 2025 | $10K | TBD | - |
| Year 1 | $50K | TBD | - |

---

## UCO-2: Sievo/Procurement ⭐ CRITICAL PATH

| Attribute | Value |
|-----------|-------|
| **Stage** | U2 - PoC/Pilot |
| **Health** | 🟡 At Risk |
| **Owner (Customer)** | Sarah Pacer |
| **Owner (DBX)** | Neha Prabhu |
| **Deadline** | **March 2025** |

### Progress This Week
- [ ] Sarah Pacer call scheduled (Jan 27)
- [ ] DQ requirements gathering in progress
- [ ] Waiting on Fabric data access

### Blockers
| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| Fabric data access not granted | High | Victor Price | Week of Jan 27 |
| SMEs not yet identified | Medium | Sarah Pacer | Jan 27 call |

### Next Actions
| Action | Owner | Due |
|--------|-------|-----|
| Sarah Pacer requirements call | Stuart | Jan 27 |
| Get Fabric access from Victor | Neha | Jan 31 |
| Identify SMEs for DQ rules | Sarah | Jan 27 |
| Create DQ rule inventory | Neha + SMEs | Feb 14 |

### Milestones
| Milestone | Target | Status |
|-----------|--------|--------|
| Data flowing from Fabric | Feb 2025 | ⬜ Not Started |
| DQ rules operational | Feb 2025 | ⬜ Not Started |
| SME review workflow live | Mar 2025 | ⬜ Not Started |
| Dashboards delivered | Mar 2025 | ⬜ Not Started |
| **Sarah sign-off** | **Mar 2025** | ⬜ Not Started |

### Consumption
| Period | Forecast | Actual | Variance |
|--------|----------|--------|----------|
| Q1 2025 | $15K | TBD | - |
| Year 1 | $75K | TBD | - |

---

## UCO-3: Monte Carlo Simulations 🔥

| Attribute | Value |
|-----------|-------|
| **Stage** | U1 - Discovery |
| **Health** | 🟡 At Risk |
| **Owner (Customer)** | Kyle Dalal |
| **Owner (DBX)** | Stuart Gano |
| **Target Stage** | U2 by Q2 2025 |

### Progress This Week
- [ ] Discovery questions document prepared
- [ ] Awaiting technical deep-dive with Kyle
- [ ] GEANT4 vs MCNP strategy drafted

### Blockers
| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| MCNP licensing unclear | High | Kyle + Legal | TBD |
| Kyle deep-dive not scheduled | Medium | Stuart | TBD |
| Export control assessment needed | Medium | Craig (CISO) | TBD |

### Next Actions
| Action | Owner | Due |
|--------|-------|-----|
| Schedule technical deep-dive with Kyle | Stuart | This week |
| Review licensing terms with Mirion Legal | Kyle | TBD |
| Get sample MCNP I/O files (sanitized) | Kyle | TBD |
| Run first GEANT4 test on Databricks | Stuart/Kyle | TBD |

### Technical Strategy
| Tool | Use For | Location |
|------|---------|----------|
| GEANT4 | R&D, ML training data, param sweeps | Databricks |
| MCNP | Production calibrations, regulatory | On-Prem/GovCloud |
| Unity Catalog | All simulation I/O data | Databricks |

### Consumption (Projected)
| Period | Forecast | Notes |
|--------|----------|-------|
| Year 1 | $150K | Initial PoC + pilot calibrations |
| Year 3 | $500K | 50+ customers, scaled MC |
| Year 5 | $2.0M | 150+ customers, full MC service |

**Key Insight:** This UCO alone = 40% of Year 5 consumption

---

## UCO-4: VITAL Workbench

| Attribute | Value |
|-----------|-------|
| **Stage** | U1 - Discovery |
| **Health** | 🟢 On Track |
| **Owner (Customer)** | Kyle Dalal |
| **Owner (DBX)** | Stuart Gano |
| **Target Stage** | U3 by Q4 2025 |

### Progress This Week
- [x] MVP architecture defined
- [x] Backend/frontend scaffolding complete
- [ ] 7-stage pipeline design in progress

### Blockers
| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| Depends on MEDIAN foundation | Medium | Neha | Feb 2025 |

### Next Actions
| Action | Owner | Due |
|--------|-------|-----|
| Complete CURATE stage UI | Stuart | Feb 15 |
| Integrate with Unity Catalog | Stuart | Feb 28 |
| Deploy to Databricks Apps (dev) | Stuart | Mar 15 |
| User testing with Kyle | Stuart/Kyle | Q2 |

### Feature Roadmap
| Stage | MVP (Q2) | Scale (Q4) |
|-------|----------|------------|
| DATA | Browse UC datasets | Automated extraction |
| TEMPLATE | Create/version templates | Marketplace |
| CURATE | AI pre-label + SME review | Batch labeling |
| TRAIN | Manual job trigger | Scheduled retraining |
| DEPLOY | Cloud only | Edge + Airgap |
| MONITOR | Basic metrics | Full observability |
| IMPROVE | Manual feedback | Automated loops |

---

## UCO-5: Edge AI / VitalHub

| Attribute | Value |
|-----------|-------|
| **Stage** | U1 - Discovery |
| **Health** | 🟡 At Risk |
| **Owner (Customer)** | Kyle Dalal |
| **Owner (DBX)** | Stuart Gano |
| **Target Stage** | U3 by Q4 2025 |

### Progress This Week
- [ ] ANIMAL team identified (Kyle's team)
- [ ] ACE framework architecture in design
- [ ] VitalHub device specs needed

### Blockers
| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| ACE framework not finalized | High | Stuart | TBD |
| Device specs not provided | Medium | Kyle | TBD |

### Next Actions
| Action | Owner | Due |
|--------|-------|-----|
| Get VitalHub device specifications | Kyle | TBD |
| Complete ACE framework architecture | Stuart | Feb 2025 |
| Define edge deployment pattern | Stuart/Kyle | Q2 |

---

## UCO-6: GenAI / Mosaic AI Migration

| Attribute | Value |
|-----------|-------|
| **Stage** | U1 - Discovery |
| **Health** | 🟡 At Risk |
| **Owner (Customer)** | Justin Clark |
| **Owner (DBX)** | Stuart Gano |
| **Target Stage** | U3 by Q3 2025 |

### Progress This Week
- [ ] Justin Clark identified as owner
- [ ] Team of ~5 building chatbots on Azure
- [ ] Migration to Mosaic AI planned

### Blockers
| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| No direct engagement yet | Medium | Stuart | TBD |
| Justin's team capacity unknown | Low | Justin | TBD |

### Next Actions
| Action | Owner | Due |
|--------|-------|-----|
| Schedule intro call with Justin Clark | Stuart | Feb 2025 |
| Understand current Azure architecture | Stuart | TBD |
| Create migration plan | Stuart/Justin | Q2 |

---

## UCO-7 through UCO-10: Future Pipeline

### UCO-7: Customer 360
| Attribute | Value |
|-----------|-------|
| **Stage** | U0 - Identified |
| **Owner (Customer)** | Matthew Maddox (VP Digital Commerce) |
| **Next Step** | Engage after Sievo proof point |
| **Notes** | Needs Customer 360, Product 360, propensity models |

### UCO-8: Finance Golden Record
| Attribute | Value |
|-----------|-------|
| **Stage** | U0 - Identified |
| **Owner (Customer)** | Adam Brown (Sr. Dir Finance) |
| **Next Step** | Engage after MEDIAN foundation |
| **Notes** | Reconciles 12+ systems, needs "Golden Record" |

### UCO-9: Data Clean Rooms
| Attribute | Value |
|-----------|-------|
| **Stage** | U0 - Identified |
| **Owner (Customer)** | Shahmeer Mirza |
| **Next Step** | Year 3-4 roadmap item |
| **Notes** | Delta Sharing for B2B, new SaaS revenue |

### UCO-10: Medical / Oncospace AI
| Attribute | Value |
|-----------|-------|
| **Stage** | U0 - Identified |
| **Owner (Customer)** | Luis Rivera (EVP Medical) |
| **Next Step** | Year 2+ roadmap item |
| **Notes** | Medical imaging AI, separate business unit |

---

## Consumption Summary

### Year 1 Forecast vs Actual

| UCO | Use Case | Forecast | Actual | Variance |
|-----|----------|----------|--------|----------|
| UCO-1 | MEDIAN Foundation | $50K | $0 | - |
| UCO-2 | Sievo | $75K | $0 | - |
| UCO-3 | Monte Carlo | $150K | $0 | - |
| UCO-4 | VITAL Workbench | $25K | $0 | - |
| UCO-5 | Edge AI | $50K | $0 | - |
| UCO-6 | GenAI | $50K | $0 | - |
| | **Total** | **$400K** | **$0** | - |

### Monthly Consumption Trend

```
$40K ─────────────────────────────────────────────────────────
     │
$30K ─────────────────────────────────────────────────────────
     │
$20K ─────────────────────────────────────────────────────────
     │
$10K ─────────────────────────────────────────────────────────
     │
  $0 ─●───────────────────────────────────────────────────────
     Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct

     ● Actual    ─── Forecast
```

---

## Weekly Update Log

### Week of January 27, 2025

**Summary:** Pre-implementation phase. Sievo requirements gathering in progress. Monte Carlo discovery pending.

**Key Activities:**
- Sarah Pacer call scheduled (Jan 27)
- Workspace provisioning in progress
- VITAL Workbench MVP development continuing

**Blockers Escalated:**
- None this week

**Decisions Made:**
- None this week

---

### Week of January 20, 2025

**Summary:** Account planning and documentation. UCO identification complete.

**Key Activities:**
- UCO ramp plan created
- Stakeholder mapping updated
- Account plan deck drafted

**Blockers Escalated:**
- None

**Decisions Made:**
- GEANT4/MCNP hybrid strategy recommended

---

## Next Week Preview

### Week of February 3, 2025

**Planned Activities:**
- [ ] Fabric data access confirmed
- [ ] Workspace provisioning complete
- [ ] DQ requirements documented
- [ ] Kyle deep-dive scheduled

**Key Meetings:**
- TBD

---

*Document: UCO Progress Tracker*
*Update Frequency: Weekly*
*Owner: Stuart Gano*
