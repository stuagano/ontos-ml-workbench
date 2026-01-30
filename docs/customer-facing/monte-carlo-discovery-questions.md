# Monte Carlo Discovery Questions
## Qualifying the Physics Simulation Use Case

**Purpose:** Determine technical feasibility and deployment model for Monte Carlo simulations on Databricks.

**Key Contact:** Kyle (ML Lead)

---

## Current State Assessment

### MCNP Environment

| Question | Why It Matters |
|----------|----------------|
| What version of MCNP are you running today? | Determines feature compatibility with alternatives |
| What hardware runs MCNP? (HPC cluster specs, CPU count, memory) | Sizing for cloud/Databricks equivalent |
| How many simulations do you run per day/week/month? | Consumption estimate |
| What's the typical runtime per simulation? | Determines if batch vs. interactive pattern |
| How many MCNP licenses do you currently have? | Cost baseline; GEANT4 eliminates this |

### Licensing & Export Controls

| Question | Why It Matters |
|----------|----------------|
| Is your MCNP license RSICC or DOE/NNSA direct? | Affects cloud deployment restrictions |
| Do you have export control requirements (ITAR, EAR)? | May require GovCloud (Azure Gov / AWS GovCloud) |
| Are there classified or CUI data in your simulations? | Determines security posture needed |
| Can simulation *inputs* be stored in commercial cloud? | Unity Catalog feasibility |
| Can simulation *outputs* be stored in commercial cloud? | Unity Catalog feasibility |

**Note:** MCNP is export-controlled software developed by Los Alamos National Laboratory. Running MCNP in cloud typically requires FedRAMP High / GovCloud environments.

---

## GEANT4 Exploration

GEANT4 is an open-source Monte Carlo particle transport toolkit developed at CERN. No licensing restrictions.

### Technical Feasibility

| Question | Why It Matters |
|----------|----------------|
| Have you evaluated GEANT4 vs MCNP for your use cases? | Qualification decision |
| Which physics models do you rely on? (neutronics, photon, electron) | GEANT4 coverage varies by domain |
| Do you have existing MCNP input decks you'd need to convert? | Migration effort estimate |
| Is accuracy parity with MCNP required, or is "good enough" acceptable? | GEANT4 may have different uncertainty profiles |
| Who would validate GEANT4 results against MCNP baselines? | Resource allocation |

### Databricks Execution Model

| Question | Why It Matters |
|----------|----------------|
| Are you open to running GEANT4 on Databricks compute (Spark clusters)? | Primary use case |
| Would batch processing (overnight runs) work, or need interactive? | Cluster sizing and cost model |
| What parallelization exists in your current workflows? | Maps to Spark distribution strategy |
| Do simulations need GPU acceleration? | Cluster type selection |
| What's the typical input file size? Output file size? | Storage and I/O planning |

---

## Data Integration (Unity Catalog)

Even if compute stays on HPC, data can live in Unity Catalog.

### Input Data

| Question | Why It Matters |
|----------|----------------|
| What format are simulation inputs? (text files, CAD, custom) | Ingestion pattern |
| Where do inputs originate? (instrument data, engineering specs) | Pipeline design |
| How large are input datasets? | Storage sizing |
| Do inputs contain PII or regulated data? | Governance requirements |

### Output Data

| Question | Why It Matters |
|----------|----------------|
| What format are simulation outputs? | Parsing/loading strategy |
| What post-processing do you do on results? | Potential Databricks notebook workflows |
| Do you aggregate results across simulations? | Delta Lake use case |
| Who consumes the results? (engineers, regulators, customers) | Access control design |

### Integration Architecture

| Question | Why It Matters |
|----------|----------------|
| If MCNP stays on-prem, can we pull I/O data to cloud? | Hybrid architecture feasibility |
| Is there a shared filesystem (NFS, S3, Azure Blob) accessible from HPC? | Data movement pattern |
| What's the latency tolerance for data sync? (real-time, hourly, daily) | Pipeline cadence |

---

## Decision Framework

Based on answers, we'll recommend one of these patterns:

### Option A: GEANT4 on Databricks (Full Cloud)
- **When:** No export control issues, GEANT4 accuracy acceptable, input/output can be in commercial cloud
- **Benefits:** No licensing costs, elastic compute, integrated ML pipeline
- **Databricks components:** Jobs, Spark clusters, Unity Catalog, MLflow

### Option B: MCNP on GovCloud + Data in Unity Catalog
- **When:** MCNP required for regulatory/accuracy reasons, export controlled
- **Benefits:** Keeps validated physics engine, enables ML on outputs
- **Databricks components:** Unity Catalog (GovCloud), Delta Sharing to commercial

### Option C: MCNP On-Prem + Data Sync to Unity Catalog
- **When:** Cannot move compute to cloud, but want analytics/ML on results
- **Benefits:** No change to simulation workflow, enables downstream AI
- **Databricks components:** Autoloader (batch sync), Unity Catalog, ML pipelines

### Option D: Hybrid - GEANT4 for Exploration, MCNP for Production
- **When:** Want cloud agility for R&D, regulatory requires MCNP for customer deliverables
- **Benefits:** Best of both worlds, uses GEANT4 to reduce MCNP license demand
- **Databricks components:** Full stack for GEANT4, data integration for MCNP

---

## Qualifying Questions Summary

**Qualify IN if:**
- [ ] Kyle confirms GEANT4 is viable for at least some use cases
- [ ] Input/output data can be stored in commercial cloud (or GovCloud available)
- [ ] Clear value from ML on simulation results (predictive drift, anomaly detection)
- [ ] Willingness to validate GEANT4 accuracy against MCNP baseline

**Qualify OUT if:**
- [ ] All simulations require MCNP for regulatory certification
- [ ] Data cannot leave on-prem under any circumstances
- [ ] No appetite for GEANT4 exploration or validation effort
- [ ] HPC hardware is already sunk cost with no cloud benefit

---

## Next Steps

1. **Schedule technical deep-dive with Kyle** - Walk through these questions
2. **Request sample MCNP input/output files** - Understand data formats (sanitized)
3. **Identify 1-2 pilot simulations** - For GEANT4 accuracy comparison
4. **Assess GovCloud requirements** - If MCNP path needed

---

## Reference Links

- [MCNP Overview (Wikipedia)](https://en.wikipedia.org/wiki/Monte_Carlo_N-Particle_Transport_Code) - Los Alamos export-controlled code
- [GEANT4 Homepage](https://geant4.web.cern.ch/) - CERN open source toolkit
- [RSICC](https://rsicc.ornl.gov/) - Radiation Safety Information Computational Center (MCNP licensing)

---

*Last Updated: January 26, 2025*
