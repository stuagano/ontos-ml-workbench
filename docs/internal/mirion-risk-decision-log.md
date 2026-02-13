# Mirion Risk & Decision Log
## Tracking Key Decisions, Risks, and Escalations

> **Status: TEMPLATE** - Scaffolded with placeholder risks. Update with current risk status before use.

**Account:** Mirion Technologies
**Last Updated:** January 26, 2026

---

## Active Risks

### Risk Summary Dashboard

| ID | Risk | Likelihood | Impact | Score | Status | Owner |
|----|------|------------|--------|-------|--------|-------|
| R1 | MC licensing blocks cloud | Medium | High | 🔴 High | Open | Stuart |
| R2 | Sievo deadline missed | Low | High | 🟡 Medium | Open | Neha |
| R3 | Customer adoption slow | Medium | Medium | 🟡 Medium | Open | Konner |
| R4 | Champion departure | Low | High | 🟡 Medium | Monitoring | Konner |
| R5 | Fabric access delayed | Medium | High | 🟡 Medium | Open | Neha |
| R6 | CoE capacity gap | Medium | Medium | 🟡 Medium | Monitoring | Konner |
| R7 | Security review delays | Low | Medium | 🟢 Low | Open | Stuart |
| R8 | V4c handoff unclear | Medium | Low | 🟢 Low | Open | Konner |

---

## Risk Details

### R1: Monte Carlo Licensing Blocks Cloud Deployment

| Attribute | Details |
|-----------|---------|
| **ID** | R1 |
| **Description** | MCNP is export-controlled (Los Alamos/DOE). Licensing terms may prevent cloud deployment. |
| **Likelihood** | Medium |
| **Impact** | High - MC is 40% of Year 5 consumption |
| **Score** | 🔴 High |
| **Owner** | Stuart Gano |
| **Status** | Open |

**Triggers:**
- Kyle confirms MCNP cannot run in commercial cloud
- Legal review identifies export control blockers
- DOE denies cloud deployment authorization

**Mitigation Plan:**
| Option | Description | Consumption Impact |
|--------|-------------|-------------------|
| **Option A: Hybrid** | GEANT4 on Databricks for R&D, MCNP on-prem for production | Partial (data + analytics) |
| **Option B: GEANT4 Only** | Validate GEANT4 accuracy, use for all workloads | Full (requires validation) |
| **Option C: GovCloud** | Deploy MCNP in FedRAMP/GovCloud environment | Full (higher cost) |

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Schedule Kyle deep-dive | Stuart | This week | ⬜ Open |
| Review MCNP license terms | Kyle + Legal | TBD | ⬜ Open |
| Test GEANT4 on Databricks | Stuart/Kyle | TBD | ⬜ Open |
| Assess GovCloud requirements | Stuart/Craig | TBD | ⬜ Open |

**Last Updated:** January 26, 2026

---

### R2: Sievo Deadline Missed (March 2025)

| Attribute | Details |
|-----------|---------|
| **ID** | R2 |
| **Description** | Sievo proof point has hard deadline of March 2025. Missing it undermines MEDIAN validation. |
| **Likelihood** | Low |
| **Impact** | High - Critical proof point for entire program |
| **Score** | 🟡 Medium |
| **Owner** | Neha Prabhu |
| **Status** | Open |

**Triggers:**
- Fabric data access not granted by Feb 1
- SMEs not available for DQ rule definition
- Workspace provisioning delayed beyond Feb 15
- Unexpected data quality issues in source data

**Mitigation Plan:**
- Weekly status checks with Sarah Pacer
- Escalate access issues to Shahmeer
- Have backup synthetic data for demo if needed
- Parallelize DQ rule definition with data access

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Sarah Pacer kickoff call | Stuart | Jan 27 | ⬜ Scheduled |
| Get Fabric access | Neha | Jan 31 | ⬜ Open |
| Workspace provisioning | Neha | Feb 7 | ⬜ Open |
| DQ rules complete | Neha + SMEs | Feb 14 | ⬜ Open |

**Last Updated:** January 26, 2026

---

### R3: Customer Adoption Slower Than Forecast

| Attribute | Details |
|-----------|---------|
| **ID** | R3 |
| **Description** | Mirion's nuclear customers are conservative. Adoption may lag consumption targets. |
| **Likelihood** | Medium |
| **Impact** | Medium - Affects consumption ramp |
| **Score** | 🟡 Medium |
| **Owner** | Konner |
| **Status** | Open |

**Triggers:**
- Pilot customers not committed by Q2 2025
- Regulatory concerns slow approval process
- Customers prefer status quo

**Mitigation Plan:**
- Start with committed, enthusiastic pilots
- Use Sievo success to build internal momentum
- Develop compelling ROI story for CFO audiences
- Leverage Tom Logan's executive sponsorship

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Identify 5 committed pilot customers | Mirion Sales | Q1 | ⬜ Open |
| Develop customer ROI calculator | Konner/Stuart | Q2 | ⬜ Open |
| Create reference customer program | Konner | Q3 | ⬜ Open |

**Last Updated:** January 26, 2026

---

### R4: Champion Departure (Shahmeer)

| Attribute | Details |
|-----------|---------|
| **ID** | R4 |
| **Description** | Shahmeer is the primary champion. His departure would cause organizational disruption. |
| **Likelihood** | Low |
| **Impact** | High - Potential program reset |
| **Score** | 🟡 Medium |
| **Owner** | Konner |
| **Status** | Monitoring |

**Triggers:**
- Shahmeer announces departure
- Organizational restructuring
- Budget ownership changes

**Mitigation Plan:**
- Build multi-threaded relationships (Tom Logan, James Cocks, Ben, Kyle)
- Ensure technical team (Ben, Kyle) are invested in Databricks success
- Document wins and value delivered
- Maintain executive relationship with CEO

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Executive meeting with Tom Logan | Konner | Q1 | ⬜ Open |
| Build relationship with James Cocks (CTO) | Stuart | Q1 | ⬜ Open |
| Regular engagement with Ben & Kyle | Hector | Ongoing | 🟡 In Progress |

**Last Updated:** January 26, 2026

---

### R5: Fabric Data Access Delayed

| Attribute | Details |
|-----------|---------|
| **ID** | R5 |
| **Description** | Sievo project requires access to procurement data in Microsoft Fabric. Access not yet granted. |
| **Likelihood** | Medium |
| **Impact** | High - Blocks Sievo timeline |
| **Score** | 🟡 Medium |
| **Owner** | Neha Prabhu |
| **Status** | Open |

**Triggers:**
- Victor Price doesn't respond
- Security review required
- John Stimpson blocks access

**Mitigation Plan:**
- Escalate to Shahmeer if delayed beyond Jan 31
- Work with Imran Mohamed as alternative contact
- Have synthetic data ready for initial development

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Contact Victor Price | Neha | Jan 27 | ⬜ Open |
| Escalate to Shahmeer if needed | Konner | Feb 1 | ⬜ Contingent |
| Prepare synthetic data backup | Neha | Feb 1 | ⬜ Open |

**Last Updated:** January 26, 2026

---

### R6: CoE Capacity Gap

| Attribute | Details |
|-----------|---------|
| **ID** | R6 |
| **Description** | Mirion's CoE team is still being hired. Capacity may constrain implementation velocity. |
| **Likelihood** | Medium |
| **Impact** | Medium - Affects delivery timeline |
| **Score** | 🟡 Medium |
| **Owner** | Konner |
| **Status** | Monitoring |

**Triggers:**
- Hiring slower than planned
- Key roles unfilled
- V4c engagement ends without handoff

**Mitigation Plan:**
- V4c Elevate program provides interim capacity
- Databricks PS can augment if needed
- Phased implementation to match available capacity

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Get CoE hiring timeline from Shahmeer | Konner | This week | ⬜ Open |
| Clarify V4c scope and handoff | Konner | This week | ⬜ Open |
| Identify PS augmentation options | Konner | If needed | ⬜ Contingent |

**Last Updated:** January 26, 2026

---

### R7: Security Review Delays Platform

| Attribute | Details |
|-----------|---------|
| **ID** | R7 |
| **Description** | Craig (CISO) requires security deep-dive. May identify blockers or require GovCloud. |
| **Likelihood** | Low |
| **Impact** | Medium - Could delay or complicate deployment |
| **Score** | 🟢 Low |
| **Owner** | Stuart Gano |
| **Status** | Open |

**Triggers:**
- ITAR data requires special handling
- PII concerns not addressed
- Network architecture rejected

**Mitigation Plan:**
- Early engagement with Craig
- Prepare security architecture documentation
- Have GovCloud option ready if needed

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Schedule Craig deep-dive | Stuart | Feb 2025 | ⬜ Open |
| Prepare security documentation | Stuart | Before meeting | ⬜ Open |
| Research GovCloud requirements | Stuart | Feb 2025 | ⬜ Open |

**Last Updated:** January 26, 2026

---

### R8: V4c Handoff Unclear

| Attribute | Details |
|-----------|---------|
| **ID** | R8 |
| **Description** | V4c is doing a 3-month "Elevate" engagement. Unclear what they're building and how handoff works. |
| **Likelihood** | Medium |
| **Impact** | Low - Process issue, not technical blocker |
| **Score** | 🟢 Low |
| **Owner** | Konner |
| **Status** | Open |

**Triggers:**
- V4c builds something incompatible with our architecture
- No documentation or handoff plan
- Customer confused about who owns what

**Mitigation Plan:**
- Clarify V4c scope with Shahmeer
- Coordinate with Hector on technical handoff
- Ensure V4c follows our recommended architecture

**Actions:**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Clarify V4c scope | Konner | This week | ⬜ Open |
| Coordinate with V4c technical team | Hector | After scope clear | ⬜ Open |
| Document handoff plan | Hector | Feb 2025 | ⬜ Open |

**Last Updated:** January 26, 2026

---

## Decision Log

### Decision Template

```markdown
### D[X]: [Decision Title]

| Attribute | Details |
|-----------|---------|
| **Date** | |
| **Decision** | |
| **Context** | |
| **Options Considered** | |
| **Rationale** | |
| **Owner** | |
| **Stakeholders** | |
```

---

### D1: GEANT4/MCNP Hybrid Strategy

| Attribute | Details |
|-----------|---------|
| **Date** | January 2026 |
| **Decision** | Recommend hybrid approach: GEANT4 on Databricks for R&D, MCNP on-prem for production |
| **Context** | MCNP is export-controlled and may not be deployable in commercial cloud |
| **Options Considered** | 1) MCNP only (on-prem), 2) GEANT4 only (cloud), 3) Hybrid |
| **Rationale** | Hybrid captures most consumption (GEANT4 R&D) while maintaining regulatory compliance (MCNP production) |
| **Owner** | Stuart Gano |
| **Stakeholders** | Kyle Dalal, Shahmeer Mirza |
| **Status** | Recommended - pending Kyle validation |

---

### D2: Sievo as Proof Point

| Attribute | Details |
|-----------|---------|
| **Date** | January 2026 |
| **Decision** | Use Sievo/Procurement project as the proof point for MEDIAN foundation |
| **Context** | Need to validate platform with real business value before VITAL expansion |
| **Options Considered** | 1) Finance Golden Record, 2) Sievo/Procurement, 3) Customer 360 |
| **Rationale** | Sievo has committed owner (Sarah Pacer), clear deadline (March), and validates both MEDIAN and first VITAL component (CURATE) |
| **Owner** | Shahmeer Mirza |
| **Stakeholders** | Sarah Pacer, Neha Prabhu |
| **Status** | Approved |

---

### D3: Document Structure (Customer-Facing vs Internal)

| Attribute | Details |
|-----------|---------|
| **Date** | January 2026 |
| **Decision** | Maintain separate customer-facing and internal documentation |
| **Context** | Need to share some content with customer while keeping competitive intel internal |
| **Options Considered** | 1) Single document with redaction, 2) Separate documents |
| **Rationale** | Separate documents cleaner, less risk of accidental disclosure |
| **Owner** | Stuart Gano |
| **Stakeholders** | Databricks account team |
| **Status** | Implemented |

---

## Escalation Log

### Escalation Template

```markdown
### E[X]: [Escalation Title]

| Attribute | Details |
|-----------|---------|
| **Date Raised** | |
| **Raised By** | |
| **Escalated To** | |
| **Issue** | |
| **Impact** | |
| **Resolution** | |
| **Date Resolved** | |
```

---

### Active Escalations

*No active escalations*

---

### Resolved Escalations

*No resolved escalations yet*

---

## Blocker Tracking

### Active Blockers

| ID | Blocker | UCO Impact | Owner | Escalate To | ETA |
|----|---------|------------|-------|-------------|-----|
| B1 | Fabric data access | UCO-2 | Neha | Shahmeer | Jan 31 |
| B2 | MCNP licensing clarity | UCO-3 | Stuart | Kyle → Legal | TBD |
| B3 | Kyle deep-dive not scheduled | UCO-3,4,5 | Stuart | - | This week |
| B4 | Workspace not provisioned | UCO-1,2 | Neha | - | Feb 7 |

### Resolved Blockers

*No resolved blockers yet*

---

## Weekly Risk Review

### Week of January 27, 2026

**New Risks:** None

**Risk Status Changes:** None

**Escalations:** None

**Decisions Made:**
- D1: GEANT4/MCNP Hybrid (recommended)
- D2: Sievo as Proof Point (approved)
- D3: Document Structure (implemented)

**Next Review:** February 3, 2025

---

*Document: Risk & Decision Log*
*Update Frequency: Weekly*
*Owner: Stuart Gano*
