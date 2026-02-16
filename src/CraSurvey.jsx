import { useState, useMemo, useEffect, useRef } from "react";
import emailjs from '@emailjs/browser';
import { saveAssessment, loadAssessment, isFirebaseConfigured } from './firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/* ═══════════════════════════════════════════════════════
   DESIGN SYSTEM
   "Precision Engineering" — clean, interactive, confident
   ═══════════════════════════════════════════════════════ */
const C = {
  bg: "#f5f6f8", surface: "#ffffff", raised: "#fafbfc", hover: "#f0f2f6",
  border: "#e3e6ec", soft: "#eceef3", focus: "#8ba0c4",
  ink: "#161d2e", sub: "#4a5568", dim: "#7d8a9e", mute: "#adb5c4", ghost: "#c8ced8",
  primary: "#3d5af1", primaryHover: "#2d46d9", primarySoft: "#eef1fe", primaryGhost: "#dce2fd",
  ok: "#1a9960", okSoft: "#e8f7ef", okBd: "#b8e0cb",
  warn: "#c07d18", warnSoft: "#fef7eb", warnBd: "#e8d5a8",
  err: "#d03e3e", errSoft: "#fdf0ef", errBd: "#e8bfbd",
  orange: "#c95d20",
};
const ff = `'Outfit',system-ui,sans-serif`;
const fm = `'Fira Code','JetBrains Mono',monospace`;

/* Inject animations + fonts */
const cssOnce = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes drawRing{from{stroke-dashoffset:var(--circ)}to{stroke-dashoffset:var(--off)}}
@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}
@keyframes widthGrow{from{width:0%}to{width:var(--w)}}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased;scroll-behavior:smooth;font-size:16px}
body{background:${C.bg};color:${C.ink};font-family:${ff}}
::selection{background:${C.primaryGhost};color:${C.ink}}
@media (max-width: 768px) {
  html{font-size:15px}
}
@media (max-width: 480px) {
  html{font-size:14px}
}
`;

const SEC = {
  A: { label: "Risk & Design", accent: "#6c5ce7", soft: "#f3f1fe" },
  B: { label: "Product Security", accent: "#3d5af1", soft: "#eef1fe" },
  C: { label: "Operational", accent: "#0891b2", soft: "#ecfbff" },
  D: { label: "Vulnerability Mgmt", accent: "#ca8a04", soft: "#fefce8" },
  E: { label: "Documentation", accent: "#64748b", soft: "#f1f5f9" },
};

const SECTORS = [
  { id: "generic", label: "General / Cross-Sector", desc: "Universal compliance — applicable to any digital product with essential functionality", icon: "⬡", color: "#64748b" },
  { id: "healthcare", label: "Healthcare / MedTech", desc: "Medical devices, diagnostics, clinical systems, health IT", icon: "⚕", color: "#dc2626" },
  { id: "iot", label: "IoT / Consumer Electronics", desc: "Smart home, wearables, connected devices, consumer hardware", icon: "◈", color: "#2563eb" },
  { id: "industrial", label: "Industrial / ICS", desc: "SCADA, PLCs, industrial automation, critical infrastructure", icon: "⚙", color: "#ca8a04" },
  { id: "automotive", label: "Automotive / Mobility", desc: "Connected vehicles, V2X, infotainment, ADAS, charging infrastructure", icon: "◐", color: "#16a34a" },
  { id: "financial", label: "Financial / FinTech", desc: "Payment systems, banking software, crypto wallets, trading platforms", icon: "◆", color: "#9333ea" },
];

const PTYPES = [
  { id: "samd", label: "Pure Software", desc: "Standalone software application", icon: "◇" },
  { id: "embedded", label: "Embedded / Firmware", desc: "Hardware with embedded software", icon: "▣" },
  { id: "cloud", label: "Cloud / SaaS", desc: "Cloud-hosted platform or service", icon: "◎" },
  { id: "hybrid", label: "Multi-Component", desc: "Connected ecosystem with multiple components", icon: "⬡" },
];

const LEVELS = [
  { v: 0, l: "N/A", c: C.mute, bg: C.raised },
  { v: 1, l: "None", c: C.err, bg: C.errSoft },
  { v: 2, l: "Initial", c: C.orange, bg: "#fef4ec" },
  { v: 3, l: "Developing", c: C.warn, bg: C.warnSoft },
  { v: 4, l: "Established", c: C.ok, bg: C.okSoft },
  { v: 5, l: "Optimized", c: C.primary, bg: C.primarySoft },
];

/* ═══════════════════════════════════════════════════════
   QUESTION BANK — 22 questions, ~130 sub-criteria
   Dynamically adapted based on sector + product type
   ═══════════════════════════════════════════════════════ */
function buildQuestions(sector, pt) {
  const is = t => pt === t || pt === "hybrid";
  const isSector = s => sector === s;

  // Sector-specific context generator
  const getContext = (generic, sectorMap) => {
    if (isSector("generic")) return generic;
    return sectorMap[sector] || generic;
  };

  return [
    { id:"a1",section:"A",sectionTitle:"Risk & Design Governance",title:"Cybersecurity Risk Assessment",body:"How mature is your process for assessing cybersecurity risks across the product lifecycle?",ref:"Annex I §(1) · Art. 13(2)",
      ctx: getContext(
        is("embedded")?"Physical and software threats must be systematically identified and assessed.":is("cloud")?"Cloud environments require assessment of service isolation, provider dependencies, and data residency.":"Risk assessment must cover your product's full attack surface and operational context.",
        {
          healthcare: is("embedded")?"Medical firmware must assess physical vectors (side-channel, fault injection), physiological impact, and safety-security tradeoffs.":is("cloud")?"Assess multi-tenancy isolation, ePHI protection, clinical workflow disruption, and provider compromise scenarios.":"Clinical decision support requires assessing algorithmic risks, training data integrity, and deployment environment variability.",
          iot: is("embedded")?"Consumer devices must assess physical access scenarios, factory reset attacks, and local network compromise.":"Smart devices require assessment of privacy invasion, physical safety (locks, cameras), and botnet recruitment risks.",
          industrial: is("embedded")?"ICS/SCADA must assess operational technology threats, safety system bypass, and process integrity attacks.":"Critical infrastructure requires assessment of catastrophic failure scenarios, cascading impacts, and nation-state threats.",
          automotive: is("embedded")?"Vehicle systems must assess CAN bus attacks, physical tampering, safety-critical function compromise.":"Connected vehicles require assessment of V2X threats, remote control scenarios, and crash-inducing attacks.",
          financial: is("embedded")?"Payment hardware must assess physical tampering, side-channel attacks on cryptographic operations.":"Financial systems require assessment of transaction integrity, fund theft scenarios, and regulatory compliance gaps."
        }
      ),
      subs:[{id:"a1_s1",text:"A documented cybersecurity risk assessment methodology exists and is followed"},{id:"a1_s2",text:"Risk assessment performed before initial release and updated at each lifecycle phase"},{id:"a1_s3",text:"Identified risks are scored, prioritized, and linked to mitigations"},{id:"a1_s4",text:"Residual risks documented with justification for acceptance"},
        ...(is("embedded")?[{id:"a1_s5",text:"Physical and hardware-level vectors (glitching, side-channel, bus probing) included"}]:is("cloud")?[{id:"a1_s5",text:"Cloud-specific risks (tenant isolation, provider compromise, region failover) assessed"}]:[{id:"a1_s5",text:"Deployment environment variability factored into risk analysis"}])]},
    { id:"a2",section:"A",title:"Threat Modeling & Attack Surface",body:"Do you perform systematic threat modeling tied to your architecture, with results feeding into security requirements?",ref:"Annex I §(2)(j-k) · Art. 13(2)",
      ctx: getContext(
        is("embedded")?"Model threats against debug interfaces, firmware extraction, and bootloader attacks.":is("cloud")?"Include API abuse, container escape, and management plane compromise.":"Map trust boundaries and model attack paths through all interfaces.",
        {
          healthcare: is("embedded")?"Medical devices: model JTAG/SWD attacks, drug library tampering, alarm suppression, infusion rate manipulation.":is("cloud")?"Healthcare cloud: model ePHI exfiltration, clinical workflow disruption, EHR integration attacks, FHIR API abuse.":"Model clinical impact scenarios: diagnosis manipulation, false alerts, therapy interruption.",
          iot: is("embedded")?"Consumer IoT: model local network attacks, device takeover, privacy invasion (cameras/mics), physical safety (locks/thermostats).":"Smart home: model hub compromise, cloud disconnect scenarios, voice assistant abuse, automation manipulation.",
          industrial: is("embedded")?"ICS/SCADA: model Modbus/DNP3 attacks, PLC logic injection, HMI manipulation, safety system bypass.":"Industrial: model process disruption, setpoint manipulation, sensor spoofing, cascading failures to physical plant.",
          automotive: is("embedded")?"Vehicle systems: model CAN bus injection, ECU spoofing, infotainment-to-CAN bridging, OBD port attacks.":"Connected vehicle: model V2X message spoofing, remote control scenarios, fleet management compromise, charging station attacks.",
          financial: is("embedded")?"Payment terminals: model side-channel attacks on PIN entry, card skimming, firmware tampering.":"FinTech: model transaction manipulation, account takeover, fund exfiltration, regulatory reporting tampering."
        }
      ),
      subs:[{id:"a2_s1",text:"A recognized methodology (STRIDE, PASTA, LINDDUN, attack trees) is applied"},{id:"a2_s2",text:"Threat models tied to architecture diagrams with trust boundaries and data flows"},{id:"a2_s3",text:"All external interfaces (network, physical, API, debug) enumerated"},{id:"a2_s4",text:"Findings result in traceable security requirements or design changes"},{id:"a2_s5",text:"Threat models updated when architecture changes or new intelligence emerges"},
        ...(is("embedded")?[{id:"a2_s6",text:"Physical interfaces (JTAG, SWD, UART, USB) assessed for unauthorized access"}]:is("cloud")?[{id:"a2_s6",text:"Cloud management APIs and CI/CD interfaces included in attack surface"}]:is("hybrid")?[{id:"a2_s6",text:"Inter-component channels modeled as separate trust boundaries"}]:[{id:"a2_s6",text:"Third-party integrations included in attack surface model"}])]},
    { id:"a3",section:"A",title:"Third-Party Due Diligence",body:"When integrating third-party components, do you assess their cybersecurity posture and maintain due diligence evidence?",ref:"Annex I Part II §(1) · Art. 13(5)",
      ctx: getContext(
        is("embedded")?"Supply chains include RTOSes, BSPs, HALs, and binary components with varying transparency.":is("cloud")?"Cloud dependencies span container images, OSS libraries, managed services, and IaC modules.":"Evaluate component maintenance health, license compliance, and vulnerability response track records.",
        {
          healthcare: "Medical devices: FDA 524B requires SBOM + vulnerability management. CRA adds EU enforcement. Assess supplier MDR compliance.",
          iot: "Consumer IoT: High OSS dependency, often with weak supplier vetting. Assess IoT-specific components (Zigbee stacks, voice SDKs).",
          industrial: "ICS: Legacy components with minimal updates, proprietary protocols. Assess OT vendor security posture, not just IT.",
          automotive: "Automotive: Tier supplier chains, ECU software stacks, AUTOSAR components. Assess functional safety + cybersecurity integration.",
          financial: "FinTech: Payment SDKs, crypto libraries, KYC/AML services. Assess PCI-DSS compliance, SOC 2 attestations."
        }
      ),
      subs:[{id:"a3_s1",text:"Security assessment criteria exist for evaluating components before integration"},{id:"a3_s2",text:"Suppliers provide SBOMs or equivalent component transparency"},{id:"a3_s3",text:"Third-party versions tracked and monitored for new vulnerabilities"},{id:"a3_s4",text:"Due diligence evidence maintained for audit"},{id:"a3_s5",text:"Contracts include vulnerability notification and patching commitments"},{id:"a3_s6",text:"FOSS components assessed for maintenance health before adoption"},{id:"a3_s7",text:"FOSS license compliance tracked with no patching conflicts"},
        ...(is("embedded")?[{id:"a3_s8",text:"Binary blobs assessed despite lack of source access"}]:[{id:"a3_s8",text:"Transitive/indirect dependencies assessed, not just direct imports"}])]},
    { id:"a4",section:"A",title:"Secure Build Pipeline",body:"Is your build and production process secured against supply chain attacks?",ref:"Annex VII §2(c) · Art. 13(4)",
      ctx:is("embedded")?"Firmware build chains are high-value targets. Compromised toolchain can inject backdoors.":is("cloud")?"CI/CD pipelines, container registries, IaC repos are all attack surfaces.":is("samd")?"ML training pipelines need integrity verification of data, models, and deployments.":"Each component's build chain is an independent vector.",
      subs:[{id:"a4_s1",text:"Build pipelines protected — access controls, audit logs, integrity verification"},{id:"a4_s2",text:"Repos enforce branch protection, signed commits, code review"},{id:"a4_s3",text:"Build artifacts signed and verified before deployment"},{id:"a4_s4",text:"Build environments hardened, ephemeral, reproducible"},{id:"a4_s5",text:"Dependencies pinned to specific versions from verified sources"},{id:"a4_s6",text:"Production processes documented per Annex VII §2(c)"},
        ...(is("embedded")?[{id:"a4_s7",text:"Firmware toolchains verified against known-good versions"}]:is("cloud")?[{id:"a4_s7",text:"Container images from trusted registries, scanned, rebuilt for updates"}]:[])]},

    { id:"b1",section:"B",sectionTitle:"Product Security Properties",title:"Vulnerability-Free Release",body:"Can you demonstrate your product ships without known exploitable vulnerabilities?",ref:"Annex I §(2)(a) · Art. 13(1)",
      ctx: getContext(
        "The CRA's most binary requirement: known exploitable vulnerabilities at release = non-compliant. Attestation required.",
        {
          healthcare: is("embedded")?"FDA 524B + CRA both require vuln-free release. Binary-level firmware analysis beyond source SCA essential.":"Healthcare cloud must gate ePHI-touching deployments. Document HIPAA + CRA dual compliance.",
          iot: "Consumer IoT frequently ships with known CVEs. CRA changes the game: no more 'update later' approach. Pre-release gates mandatory.",
          industrial: "ICS often runs legacy components with unfixable CVEs. CRA requires risk acceptance documentation, not just ignoring them.",
          automotive: "Vehicle software: functional safety + cybersecurity. ISO 21434 + CRA alignment. Long validation cycles demand early vuln prevention.",
          financial: "Payment systems: PCI-DSS already requires vuln scanning. CRA adds exploitability assessment and formal attestation requirements."
        }
      ),
      subs:[{id:"b1_s1",text:"Automated scanning (SCA, SAST, container) runs on every build"},{id:"b1_s2",text:"Release gate blocks deployment on critical exploitable vulnerabilities"},{id:"b1_s3",text:"Exploitability assessed (EPSS, KEV), not just CVSS"},{id:"b1_s4",text:"Scan results preserved with timestamps and commit references"},{id:"b1_s5",text:"Formal attestation: no known exploitable vulns at release"},{id:"b1_s6",text:"False positives documented rather than silently suppressed"}]},
    { id:"b2",section:"B",title:"Secure-by-Default Configuration",body:"Is your product shipped hardened — no default credentials, minimal services, encryption on?",ref:"Annex I §(2)(b) · Art. 13(1)",
      ctx:is("embedded")?"Devices routinely ship with factory credentials and open debug ports. Each is a violation.":is("cloud")?"Default IAM policies, storage permissions, logging must be secure from first deploy.":"CRA requires both a secure default AND ability to reset to it.",
      subs:[{id:"b2_s1",text:"No default, shared, or hardcoded credentials in shipping config"},{id:"b2_s2",text:"Unnecessary services, ports, protocols disabled by default"},{id:"b2_s3",text:"Encryption at rest and in transit enabled by default"},{id:"b2_s4",text:"Documented hardened baseline defines the secure state"},{id:"b2_s5",text:"Factory reset returns to documented baseline"},{id:"b2_s6",text:"Deployment hardening guide provided to customers"},
        ...(is("embedded")?[{id:"b2_s7",text:"Debug interfaces disabled or locked in production firmware"}]:is("cloud")?[{id:"b2_s7",text:"Cloud defaults enforce least-privilege IAM, private networking, audit logs"}]:[])]},
    { id:"b3",section:"B",title:"Authentication & Access Control",body:"Does your product enforce proportionate auth, RBAC, and unauthorized access detection?",ref:"Annex I §(2)(d) · Art. 13(1)",
      ctx:is("embedded")?"Clinical devices need break-glass procedures — audited, time-limited.":is("cloud")?"Multi-tenancy demands tenant isolation, OAuth/OIDC rigor, cross-tenant prevention.":"CRA requires both prevention (auth) and detection (reporting unauthorized access).",
      subs:[{id:"b3_s1",text:"Authentication proportionate to risk (MFA for admin, risk-based for clinical)"},{id:"b3_s2",text:"Role-based access control segregates permissions"},{id:"b3_s3",text:"Sessions enforce timeouts and re-auth for sensitive ops"},{id:"b3_s4",text:"Failed auth and unauthorized access logged with alerting"},{id:"b3_s5",text:"Password policies: complexity, rotation, breach-list checking"},
        ...(is("embedded")?[{id:"b3_s6",text:"Break-glass access is time-limited, auditable, non-persistent"},{id:"b3_s7",text:"Physical interface access requires auth, not just presence"}]:is("cloud")?[{id:"b3_s6",text:"Tenant isolation verified — no cross-tenant leakage"},{id:"b3_s7",text:"API keys/service accounts: scoped permissions, rotation, monitoring"}]:[{id:"b3_s6",text:"Credential storage uses modern hashing (bcrypt, Argon2)"}])]},
    { id:"b4",section:"B",title:"Cryptographic Protection",body:"Does your product protect confidentiality and integrity with current-generation cryptography?",ref:"Annex I §(2)(e-f) · Art. 13(1)",
      ctx:is("embedded")?"Constrained devices may lack hardware crypto. TPM/secure element essential.":is("cloud")?"TLS 1.2+ on all channels including internal. HSM/KMS for keys.":"State of the art per CRA: deprecated algorithms are explicit violations.",
      subs:[{id:"b4_s1",text:"Data at rest encrypted (AES-256, ChaCha20)"},{id:"b4_s2",text:"All transit uses TLS 1.2+ including internal service-to-service"},{id:"b4_s3",text:"No deprecated algorithms (MD5, SHA-1, DES, RC4, RSA <2048)"},{id:"b4_s4",text:"Key lifecycle documented: generation, storage, rotation, revocation, destruction"},{id:"b4_s5",text:"Integrity mechanisms detect unauthorized modification"},{id:"b4_s6",text:"Cryptographic inventory (CBOM) identifies all algorithms and key lengths"},{id:"b4_s7",text:"Integrity violations reported to users per §(2)(f)"},
        ...(is("embedded")?[{id:"b4_s8",text:"Keys in hardware-backed storage (TPM, secure element)"}]:[])]},
    { id:"b5",section:"B",title:"Availability & Resilience",body:"Does your product maintain essential functions during incidents and avoid impacting connected networks?",ref:"Annex I §(2)(h-i-k) · Art. 13(1)",
      ctx:is("embedded")?"Bedside monitor under DoS must display vitals. Graceful degradation is safety-critical.":is("cloud")?"Multi-region failover, autoscaling, DDoS mitigation, defined RTOs/RPOs.":"CRA requires self-resilience §(2)(h) and not harming others §(2)(i).",
      subs:[{id:"b5_s1",text:"Essential functions continue during incidents or connectivity loss"},{id:"b5_s2",text:"Graceful degradation defined and tested — fails safe, not open"},{id:"b5_s3",text:"DoS/DDoS mitigation in architecture"},{id:"b5_s4",text:"Recovery restores to secure state"},{id:"b5_s5",text:"Product doesn't negatively impact other network devices"},{id:"b5_s6",text:"Exploitation mitigation (ASLR, stack canaries, sandboxing)"},
        ...(is("hybrid")?[{id:"b5_s7",text:"Cascading failures across components mapped and mitigated"}]:[])]},

    { id:"c1",section:"C",sectionTitle:"Operational & Lifecycle Security",title:"Security Update Mechanism",body:"Can you deliver security patches independently with integrity verification and auto-update?",ref:"Annex I §(2)(c) · Art. 13(8)",
      ctx:is("embedded")?"OTA needs dual-bank flash, A/B partitioning, signature verification, power-fail resilience.":is("cloud")?"Cloud enables rapid patching — zero-downtime, canary releases, automated rollback.":"CRA §(2)(c) requires: auto updates default, opt-out, notification, postponement, separate from features.",
      subs:[{id:"c1_s1",text:"Security updates delivered independently from feature updates"},{id:"c1_s2",text:"Updates cryptographically signed and verified"},{id:"c1_s3",text:"Automatic updates enabled by default with opt-out"},{id:"c1_s4",text:"Users notified of updates and can temporarily postpone"},{id:"c1_s5",text:"Rollback to previous version"},{id:"c1_s6",text:"Infrastructure handles partial updates, interruptions, power loss"},
        ...(is("embedded")?[{id:"c1_s7",text:"Anti-rollback prevents downgrade to vulnerable firmware"},{id:"c1_s8",text:"Update process validated under IEC 62304"}]:is("cloud")?[{id:"c1_s7",text:"Zero-downtime deployment"}]:[])]},
    { id:"c2",section:"C",title:"Support Period",body:"Have you defined, published, and resourced a cybersecurity support period?",ref:"Art. 13(8-9)",
      ctx:is("embedded")?"Medical hardware: 10-15 year field life. 5-year CRA minimum may not satisfy procurement.":is("cloud")?"Define what end of support means — feature freeze only, or patch cessation?":"Support period must be communicated at purchase and reflect expected use.",
      subs:[{id:"c2_s1",text:"Support period (minimum 5 years) reflects realistic usage"},{id:"c2_s2",text:"Communicated at or before purchase"},{id:"c2_s3",text:"Resources committed for entire period"},{id:"c2_s4",text:"End-of-support plan: notification, migration, decommissioning"},{id:"c2_s5",text:"Changes communicated proactively"}]},
    { id:"c3",section:"C",title:"Security Monitoring & Logging",body:"Does your product record security events with tamper protection and opt-out capability?",ref:"Annex I §(2)(l) · Art. 13(1)",
      ctx:is("embedded")?"Balance logging against storage/compute constraints. Syslog forwarding with tamper buffer.":is("cloud")?"Centralized immutable logging. Multi-tenant must prevent cross-tenant log access.":"CRA requires recording activity, monitoring, AND opt-out.",
      subs:[{id:"c3_s1",text:"Auth attempts, data access, config changes, anomalies logged"},{id:"c3_s2",text:"Logs include timestamp, actor, action, resource, outcome"},{id:"c3_s3",text:"Log integrity protected (write-once, chaining, external forward)"},{id:"c3_s4",text:"Retention meets regulatory requirements"},{id:"c3_s5",text:"Users can opt out of non-essential telemetry"},{id:"c3_s6",text:"External monitoring integration (SIEM, hospital SOC)"},
        ...(is("embedded")?[{id:"c3_s7",text:"Logging doesn't degrade real-time safety functions"}]:is("cloud")?[{id:"c3_s7",text:"Per-tenant audit log isolation"}]:[])]},
    { id:"c4",section:"C",title:"Data Minimization & Removal",body:"Does your product collect only necessary data and enable verified secure removal?",ref:"Annex I §(2)(g,m) · Art. 13(1)",
      ctx:is("embedded")?"Flash wear-leveling makes erasure complex. Cryptographic erasure more reliable.":is("cloud")?"Deletion must cascade through stores, replicas, backups, CDN, logs.":"CRA covers data minimization AND user ability to securely remove all data.",
      subs:[{id:"c4_s1",text:"Data collection reviewed for necessity"},{id:"c4_s2",text:"Users can permanently remove all personal data"},{id:"c4_s3",text:"Removal verified and auditable — actual destruction"},{id:"c4_s4",text:"Data transfer uses secure mechanisms"},{id:"c4_s5",text:"Data inventory: what, where, how long, why"},{id:"c4_s6",text:"Decommissioning procedure documented"},
        ...(is("embedded")?[{id:"c4_s7",text:"Cryptographic erasure accounts for wear-leveling and backup partitions"}]:is("cloud")?[{id:"c4_s7",text:"Deletion cascades to replicas, backups, CDN, analytics, logs"}]:[])]},
    { id:"c5",section:"C",title:"Post-Market Monitoring",body:"Do you systematically monitor deployed products for emerging risks and field incidents?",ref:"Art. 13(3), Art. 13(7)",
      ctx:is("embedded")?"Combine telemetry, field reports, hospital IT data, threat intel feeds.":is("cloud")?"Balance monitoring depth with data minimization.":is("samd")?"Monitor for adversarial inputs, model drift, integration failures.":"Correlated monitoring — a vuln in one component may only be exploitable through another.",
      subs:[{id:"c5_s1",text:"Documented post-market monitoring plan actively executed"},{id:"c5_s2",text:"Threat intel feeds (CVE/NVD, CISA KEV) monitored"},{id:"c5_s3",text:"Field incidents reviewed for cybersecurity relevance"},{id:"c5_s4",text:"Deployed product behavior monitored for anomalies"},{id:"c5_s5",text:"Results feed back into risk assessment"},{id:"c5_s6",text:"Monitoring covers entire support period"}]},
    { id:"c6",section:"C",title:"Corrective Action & Recall",body:"Do you have procedures for corrective action including withdrawal or recall of non-conformant products?",ref:"Art. 13(10), Art. 13(21-23)",
      ctx:is("embedded")?"Hardware recall is expensive but CRA requires it when risk exists. Pre-plan escalation.":is("cloud")?"Cloud can often remediate server-side, but must still notify authorities.":"Applies whether non-conformity discovered internally or by market surveillance.",
      subs:[{id:"c6_s1",text:"Corrective action procedure for non-conformant products"},{id:"c6_s2",text:"Escalation paths: patch → update → withdrawal → recall"},{id:"c6_s3",text:"Authority notification procedures documented"},{id:"c6_s4",text:"User notification for corrective actions"},{id:"c6_s5",text:"Documentation available to authorities on request"},{id:"c6_s6",text:"Cessation planning for manufacturer discontinuation"}]},

    { id:"d1",section:"D",sectionTitle:"Vulnerability Management & Disclosure",title:"SBOM Generation",body:"Do you generate and maintain a machine-readable SBOM covering at minimum top-level dependencies?",ref:"Annex I Part II §(1) · Art. 13(5)",
      ctx:is("embedded")?"Must include RTOS, BSP, vendor libs. C/C++ detection remains a gap.":is("cloud")?"Per-artifact SBOMs plus system-level aggregate.":"CycloneDX and SPDX are accepted machine-readable formats.",
      subs:[{id:"d1_s1",text:"SBOMs in CycloneDX or SPDX format"},{id:"d1_s2",text:"All top-level deps captured: name, version, supplier"},{id:"d1_s3",text:"Transitive deps included where tooling supports"},{id:"d1_s4",text:"Generation automated in build pipeline"},{id:"d1_s5",text:"Maintained through product lifecycle"},{id:"d1_s6",text:"Available to authorities on request"},
        ...(is("embedded")?[{id:"d1_s7",text:"Binary components identified even without full dep trees"}]:is("hybrid")?[{id:"d1_s7",text:"System-level SBOM aggregates component SBOMs"}]:[])]},
    { id:"d2",section:"D",title:"Vulnerability Handling",body:"Do you continuously identify, analyze, prioritize, and remediate vulnerabilities through the support period?",ref:"Annex I Part II §(2-3) · Art. 13(6)",
      ctx:is("embedded")?"Longer remediation cycles — balance IEC 62304 with CRA timeliness.":is("cloud")?"Rapid patching but increased exposure velocity. Automated dep pipelines essential.":"Required for entire support period, not just initial release.",
      subs:[{id:"d2_s1",text:"New vulns identified through continuous automated monitoring"},{id:"d2_s2",text:"Each vuln analyzed for applicability, exploitability, impact"},{id:"d2_s3",text:"Remediation SLAs defined by severity"},{id:"d2_s4",text:"Security updates delivered without delay"},{id:"d2_s5",text:"Regular testing through support period"},{id:"d2_s6",text:"Vuln info shared with supply chain where relevant"},{id:"d2_s7",text:"Remediation decisions documented and traceable"}]},
    { id:"d3",section:"D",title:"Disclosure & ENISA Reporting",body:"Have you published a CVD policy and prepared 24-hour ENISA notification capability?",ref:"Annex I Part II §(5-8) · Art. 14",
      ctx: getContext(
        "First enforced CRA obligation (Sep 2026). 24h early warning → 72h notification → 14d final report. Pre-draft templates now.",
        {
          healthcare: "Medical devices: align CRA ENISA + CISA ICS-CERT + FDA reporting. Three parallel workflows. Pre-configure thresholds: clinical impact triggers all three.",
          iot: "Consumer IoT: High vulnerability volume. Pre-configure triage to avoid false ENISA alarms. Botnet recruitment = reportable incident.",
          industrial: "ICS/SCADA: Critical infrastructure directive overlaps. ENISA + national CERT + sector regulator. Pre-map escalation paths by asset criticality.",
          automotive: "Automotive: CRA + UNECE R155 both require coordinated disclosure. Align ENISA reporting with type-approval authority notification.",
          financial: "FinTech: CRA + DORA (Digital Operational Resilience Act) dual reporting. ENISA for product, national authority for operational incidents."
        }
      ),
      subs:[{id:"d3_s1",text:"CVD policy published and accessible"},{id:"d3_s2",text:"Vulnerability reporting contact publicly documented"},{id:"d3_s3",text:"Early warning to ENISA within 24 hours"},{id:"d3_s4",text:"Technical notification within 72 hours"},{id:"d3_s5",text:"Final report within 14 days"},{id:"d3_s6",text:"Users notified with protective guidance"},{id:"d3_s7",text:"Secure advisory and patch distribution"},{id:"d3_s8",text:"Pre-drafted templates and designated reporters"},{id:"d3_s9",text:"Severe incidents reportable through same workflow"},{id:"d3_s10",text:"Escalation distinguishes vuln discovery from active incident"}]},
    { id:"d4",section:"D",title:"Public Advisory",body:"Do you publicly disclose fixed vulnerabilities with affected products, severity, and remediation guidance?",ref:"Annex I Part II §(4) · Art. 13(6)",
      ctx:is("embedded")?"Align with ENISA and ICS-CERT advisory formats.":is("cloud")?"Include API versions, regions, server-side vs. customer action.":"CRA requires public disclosure of fixed vulns, separate from ENISA reporting.",
      subs:[{id:"d4_s1",text:"Fixed vulns publicly disclosed with description and impact"},{id:"d4_s2",text:"Affected and remediated versions identified"},{id:"d4_s3",text:"Severity via recognized system (CVSS, EPSS)"},{id:"d4_s4",text:"Clear remediation guidance for users"},{id:"d4_s5",text:"Published in consistent, discoverable location"},{id:"d4_s6",text:"Timing balances protection with patch availability"}]},

    { id:"e1",section:"E",sectionTitle:"Documentation & Conformity",title:"Technical Documentation",body:"Does your technical file include architecture, risk assessment, test reports, standards, and SBOM?",ref:"Annex VII · Art. 31",
      ctx:is("embedded")?"Must describe hardware security (secure boot, tamper protection, root of trust).":is("cloud")?"Shared responsibility matrix, infra topology, data flows, provider evidence.":"510(k)/PMA covers ~60% of CRA technical file — add EU-specific elements.",
      subs:[{id:"e1_s1",text:"Product description with intended purpose"},{id:"e1_s2",text:"System architecture with component interactions"},{id:"e1_s3",text:"Risk assessment with threat analysis and treatment"},{id:"e1_s4",text:"Applied standards or certification schemes"},{id:"e1_s5",text:"Test reports verifying conformity"},{id:"e1_s6",text:"SBOM included or available on request"},{id:"e1_s7",text:"Documentation maintained through support period"}]},
    { id:"e2",section:"E",title:"User Information (Annex II)",body:"Do end users receive information about secure setup, updates, reporting, data collection, and support?",ref:"Annex II · Art. 13(15-20)",
      ctx:is("embedded")?"Cover network segmentation, firewall rules, remote maintenance, decommissioning.":is("cloud")?"Shared responsibility, data export/deletion, integration security, SLA.":"Annex II: identity, contact, security properties, updates, support, decommissioning.",
      subs:[{id:"e2_s1",text:"Manufacturer identity and contact provided"},{id:"e2_s2",text:"Single cybersecurity contact accessible"},{id:"e2_s3",text:"Security properties in accessible language"},{id:"e2_s4",text:"Secure setup and operation instructions"},{id:"e2_s5",text:"Update process documented"},{id:"e2_s6",text:"Support period communicated"},{id:"e2_s7",text:"Decommissioning and data removal documented"},{id:"e2_s8",text:"Vulnerability reporting location accessible"},{id:"e2_s9",text:"Product identification for traceability (§3)"},{id:"e2_s10",text:"Known cybersecurity risks communicated (§5)"},{id:"e2_s11",text:"SBOM access info where available (§9)"},{id:"e2_s12",text:"Integration info for downstream compliance (§8f)"}]},
    { id:"e3",section:"E",title:"Conformity Assessment",body:"Have you classified your product, identified the conformity route, and begun preparing the EU DoC?",ref:"Annexes III-V, VIII · Art. 6, 28, 32",
      ctx: getContext(
        "EU Declaration of Conformity required. Class I uses self-assessment (Art. 28), Class II requires Notified Body (Art. 30). Retain documentation 10 years.",
        {
          healthcare: is("samd")?"SaMD under MDR may be exempt from CRA — only where MDR achieves equivalent cybersecurity protection (Art. 2(2)). Verify applicability.":is("embedded")?"Art. 2(2) may exempt MDR devices with equivalent cybersecurity. Verify firmware vs software boundaries.":"Components under MDR vs CRA must be mapped independently for hybrid medical systems.",
          iot: "Consumer IoT often falls under Class I. Check Annex III for critical categories (smart meters, etc.).",
          industrial: "ICS/SCADA may be Class II critical (Annex III). Plan for Notified Body assessment if applicable.",
          automotive: "Automotive systems may already be covered by UNECE R155. CRA adds market surveillance layer.",
          financial: "Payment systems and authentication may be Class II. Budget for third-party conformity assessment.",
        }
      ),
      subs:[{id:"e3_s1",text:"Product classified: default, important, or critical"},{id:"e3_s2",text:"Conformity route identified (internal or notified body)"},{id:"e3_s3",text:"Sector-specific exemptions assessed"},{id:"e3_s4",text:"EU DoC per Annex V begun or planned"},{id:"e3_s5",text:"CE marking process understood"},{id:"e3_s6",text:"Documentation retained 10 years per Annex VIII"},{id:"e3_s7",text:"CEN/CENELEC/ETSI harmonised standards tracked"},
        ...(is("hybrid")?[{id:"e3_s8",text:"Each component's regulatory path independently mapped"}]:[])]},
  ];
}

/* ═══════════════════════════════════════════════════════
   SCORING
   ═══════════════════════════════════════════════════════ */
function sC(p){return p>=75?C.ok:p>=50?C.warn:p>=25?C.orange:C.err}
function sBg(p){return p>=75?C.okSoft:p>=50?C.warnSoft:p>=25?"#fef4ec":C.errSoft}
function sBd(p){return p>=75?C.okBd:p>=50?C.warnBd:p>=25?"#eacdaa":C.errBd}
function sLabel(p){return p>=75?"Strong":p>=50?"Developing":p>=25?"Initial":"Critical"}

/* ═══════════════════════════════════════════════════════
   UI PRIMITIVES
   ═══════════════════════════════════════════════════════ */
function Pill({children,color=C.dim,filled}){
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,fontFamily:fm,lineHeight:"18px",
    color:filled?C.surface:color,background:filled?color:`${color}0c`,border:`1px solid ${filled?"transparent":`${color}20`}`,transition:"all .2s"}}>{children}</span>;
}

function Bar({pct,h=4,animated}){
  return <div style={{height:h,borderRadius:h,background:C.soft,overflow:"hidden"}}>
    <div style={{height:"100%",borderRadius:h,background:sC(pct),width:`${Math.max(pct,1)}%`,
      transition:"width .6s cubic-bezier(.4,0,.2,1)",
      ...(animated?{animation:"widthGrow .8s ease forwards",["--w"]:`${pct}%`}:{})}}/>
  </div>;
}

function Ring({pct,size=130}){
  const r=(size-12)/2,cir=2*Math.PI*r,off=cir-(pct/100)*cir,col=sC(pct);
  return <div style={{position:"relative",width:size,height:size}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.soft} strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="5"
        strokeDasharray={cir} strokeDashoffset={off} strokeLinecap="round"
        style={{"--circ":cir,"--off":off,animation:"drawRing .9s ease forwards"}}/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:size*.24,fontWeight:700,color:col,fontFamily:fm}}>{pct}</span>
      <span style={{fontSize:12,color:C.dim,fontWeight:500,marginTop:-2}}>overall %</span>
    </div>
  </div>;
}

/* Card with hover lift */
function Card({children,style:extra,...props}){
  const [hov,setHov]=useState(false);
  return <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
    background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 24px",
    transition:"all .2s ease",
    boxShadow:hov?"0 4px 20px rgba(0,0,0,.06)":"0 1px 3px rgba(0,0,0,.03)",
    transform:hov?"translateY(-1px)":"none",...extra}} {...props}>{children}</div>;
}

function Label({children}){ return <div style={{fontSize:13,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>{children}</div>; }

/* Animated enter wrapper */
function Appear({children,delay=0,style:extra}){
  return <div style={{animation:`fadeUp .4s ease ${delay}s both`,...extra}}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════ */
export default function App(){
  const [step,setStep]=useState("landing");
  const [sector,setSector]=useState(null);
  const [pt,setPt]=useState(null);
  const [qi,setQi]=useState(0);
  const [mainAns,setMainAns]=useState({});
  const [subAns,setSubAns]=useState({});
  const [notes,setNotes]=useState({});
  const [showSubs,setShowSubs]=useState({});
  const [lead,setLead]=useState({name:"",email:"",company:"",role:"",device:""});
  const [dir,setDir]=useState(1); // 1=forward,-1=back
  const [key,setKey]=useState(0); // force re-render for transition
  const [submitStatus,setSubmitStatus]=useState({loading:false,success:false,error:null});
  const [assessmentId,setAssessmentId]=useState(null); // Saved assessment ID for sharing
  const [loadingShared,setLoadingShared]=useState(false); // Loading shared report
  const [sendToClient,setSendToClient]=useState(true); // Send results to client email
  const resultsRef = useRef(null); // Ref for PDF generation
  const [productInScope,setProductInScope]=useState(null); // Art. 3 - Product scope
  const [productClass,setProductClass]=useState(null); // Art. 7 - Classification (I or II)
  const [criticalFunctions,setCriticalFunctions]=useState([]); // Annex III critical functions

  const qs=useMemo(()=>sector&&pt?buildQuestions(sector,pt):[],[sector,pt]);
  const nav=(fn,d=1)=>{setDir(d);setKey(k=>k+1);fn()};

  /* Load shared assessment from URL parameter */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('report');

    if (reportId && !loadingShared && !assessmentId) {
      setLoadingShared(true);
      loadAssessment(reportId)
        .then(data => {
          // Restore all state from saved assessment
          setSector(data.config.sector);
          setPt(data.config.productType);
          setProductInScope(data.config.productInScope !== undefined ? data.config.productInScope : null);
          setProductClass(data.config.productClass || null);
          setCriticalFunctions(data.config.criticalFunctions || []);
          setMainAns(data.answers.mainAns);
          setSubAns(data.answers.subAns);
          setNotes(data.answers.notes || {});
          setLead(data.lead);
          setAssessmentId(reportId);
          setStep('results');
          setLoadingShared(false);
        })
        .catch(error => {
          console.error('Failed to load shared assessment:', error);
          setLoadingShared(false);
          alert('Unable to load shared report. The link may be invalid or expired.');
        });
    }
  }, []);


  /* Email submission handler */
  const handleLeadSubmit = async () => {
    setSubmitStatus({loading:true,success:false,error:null});

    try {
      // EmailJS configuration from environment variables
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_21y3wlh';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_cra_lead';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

      if (!publicKey) {
        throw new Error('EmailJS public key not configured');
      }

      // Calculate scores for email
      const scored = qs.filter(q=>mainAns[q.id]&&mainAns[q.id]>0);
      const qS = {};
      scored.forEach(q=>{
        const m=mainAns[q.id],rs=q.subs.filter(x=>subAns[x.id]&&subAns[x.id]>0),na=q.subs.filter(x=>subAns[x.id]===0).length,app=q.subs.length-na;
        if(rs.length>=3){const a=rs.reduce((s,x)=>s+subAns[x.id],0)/rs.length;qS[q.id]=Math.round(((m*.25+a*.75)/5)*100)}
        else if(rs.length>0){const a=rs.reduce((s,x)=>s+subAns[x.id],0)/rs.length;qS[q.id]=Math.round(((m*.4+a*.6)/5)*100)}
        else{qS[q.id]=Math.round((m/5)*100)}
      });
      const overall=scored.length?Math.round(scored.reduce((a,q)=>a+qS[q.id],0)/scored.length):0;

      // Save assessment to Firebase (if configured)
      let reportLink = window.location.origin + window.location.pathname;
      let savedId = assessmentId;

      if (isFirebaseConfigured() && !assessmentId) {
        try {
          const assessmentData = {
            lead: {
              name: lead.name,
              email: lead.email,
              company: lead.company,
              role: lead.role,
              device: lead.device,
            },
            config: {
              sector,
              productType: pt,
              productInScope,
              productClass,
              criticalFunctions,
            },
            answers: {
              mainAns,
              subAns,
              notes,
            },
            scores: {
              overall,
              questions: qS,
              questionsAnswered: scored.length,
              totalQuestions: qs.length,
            },
            metadata: {
              sectorLabel: SECTORS.find(s=>s.id===sector)?.label,
              productTypeLabel: PTYPES.find(p=>p.id===pt)?.label,
              submittedAt: new Date().toISOString(),
            },
          };

          savedId = await saveAssessment(assessmentData);
          setAssessmentId(savedId);
          reportLink = `${window.location.origin}${window.location.pathname}?report=${savedId}`;
        } catch (firebaseError) {
          console.warn('Firebase save failed, using current URL:', firebaseError);
          // Continue with email send even if Firebase fails
        }
      } else if (savedId) {
        // Use existing saved ID
        reportLink = `${window.location.origin}${window.location.pathname}?report=${savedId}`;
      }

      // Send lead notification email to admin
      const leadEmailData = {
        to_email: 'venkata@complira.co',
        from_name: lead.name,
        from_email: lead.email,
        company: lead.company,
        role: lead.role || 'Not provided',
        device: lead.device || 'Not provided',
        sector: SECTORS.find(s=>s.id===sector)?.label || 'Not specified',
        product_type: PTYPES.find(p=>p.id===pt)?.label || 'Not specified',
        overall_score: overall,
        questions_answered: `${scored.length}/${qs.length}`,
        assessment_date: new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}),
        report_link: reportLink
      };

      // Send client results email (if enabled)
      const clientTemplateId = import.meta.env.VITE_EMAILJS_CLIENT_TEMPLATE_ID || 'template_client_results';

      // Always send admin notification first
      await emailjs.send(serviceId, templateId, leadEmailData, publicKey);

      // Send client email if enabled and template is configured
      if (sendToClient && clientTemplateId) {
        try {
          const clientEmailData = {
            to_email: lead.email,
            to_name: lead.name,
            company: lead.company,
            sector: SECTORS.find(s=>s.id===sector)?.label || 'Not specified',
            product_type: PTYPES.find(p=>p.id===pt)?.label || 'Not specified',
            overall_score: overall,
            questions_answered: `${scored.length}/${qs.length}`,
            assessment_date: new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}),
            report_link: reportLink
          };

          await emailjs.send(serviceId, clientTemplateId, clientEmailData, publicKey);
          console.log('Client email sent successfully');
        } catch (clientError) {
          console.warn('Client email failed, but admin email sent:', clientError);
          // Don't fail the whole submission if client email fails
        }
      }

      setSubmitStatus({loading:false,success:true,error:null});
      setTimeout(()=>setStep("results"),1500);
    } catch (error) {
      console.error('Email send error:', error);
      console.error('Error details:', error.text || error.message);
      setSubmitStatus({loading:false,success:false,error:error.text || error.message || 'Failed to send. Please try again.'});
    }
  };

  /* PDF Download handler */
  const downloadPDF = async (e) => {
    if (!resultsRef.current) {
      alert('Report not ready. Please wait a moment and try again.');
      return;
    }

    const button = e.target;
    const originalText = button.textContent;

    try {
      // Show generating message
      button.textContent = 'Generating PDF...';
      button.disabled = true;

      // Wait for fonts and animations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the results HTML as canvas
      const canvas = await html2canvas(resultsRef.current, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#f5f6f8',
        windowWidth: resultsRef.current.scrollWidth,
        windowHeight: resultsRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure all animations are visible in clone
          const clonedElement = clonedDoc.querySelector('[data-results]');
          if (clonedElement) {
            clonedElement.querySelectorAll('[style*="animation"]').forEach(el => {
              el.style.animation = 'none';
              el.style.opacity = '1';
              el.style.transform = 'none';
            });
          }
        }
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas is empty - content may not be rendered');
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to fit A4
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      // Generate filename
      const filename = `CRA_Assessment_${lead.company || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      // Restore button
      button.textContent = originalText;
      button.disabled = false;

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(`Failed to generate PDF: ${error.message}. Check console for details.`);
      button.textContent = originalText;
      button.disabled = false;
    }
  };

  /* Rating scale */
  function Scale({value,onChange}){
    const [bounce,setBounce]=useState(null);
    return <div style={{display:"flex",gap:6}}>
      {LEVELS.map(lv=>{
        const on=value===lv.v;
        return <button key={lv.v} onClick={()=>{setBounce(lv.v);onChange(lv.v);setTimeout(()=>setBounce(null),300)}} style={{
          fontFamily:ff,flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,
          padding:"clamp(10px, 2vw, 12px) 4px",borderRadius:8,border:`1.5px solid ${on?lv.c:C.soft}`,cursor:"pointer",
          background:on?lv.bg:C.surface,color:on?lv.c:C.mute,
          transition:"all .15s ease",
          transform:bounce===lv.v?"scale(1.06)":"scale(1)",
          minHeight:"44px",
        }}>
          <span style={{width:10,height:10,borderRadius:5,background:on?lv.c:C.soft,transition:"all .15s",
            boxShadow:on?`0 0 0 3px ${lv.c}20`:"none"}}/>
          <span style={{fontSize:12,fontWeight:600}}>{lv.l}</span>
        </button>;
      })}
    </div>;
  }

  /* ════ LANDING ════ */
  if(step==="landing") return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:ff}}>
      <style>{cssOnce}</style>
      <div style={{maxWidth:820,margin:"0 auto",padding:"clamp(24px, 5vw, 48px) clamp(16px, 4vw, 28px)"}}>
        <Appear><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"clamp(24px, 5vw, 40px)"}}>
          <span style={{fontSize:"clamp(22px, 4vw, 24px)",fontWeight:800,color:C.primary,fontFamily:ff}}>Complira</span>
        </div></Appear>

        <Appear delay={.05}>
          <Pill color={C.dim}>EU Regulation 2024/2847</Pill>
          <h1 style={{fontSize:"clamp(28px, 6vw, 38px)",fontWeight:800,color:C.ink,lineHeight:1.15,margin:"14px 0 12px",letterSpacing:"-.03em"}}>
            Cyber Resilience Act<br/>Readiness Assessment
          </h1>
          <p style={{fontSize:"clamp(15px, 3vw, 17px)",color:C.sub,maxWidth:520,lineHeight:1.7,marginBottom:32}}>
            Assess your digital product's compliance with the EU CRA across all sectors. Sector-specific guidance for healthcare, IoT, industrial, automotive, and financial technology. Each question maps to specific CRA articles and Annex I clauses.
          </p>
        </Appear>

        <Appear delay={.1}>
          <Label>Select your sector</Label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:8,marginBottom:24}}>
            {SECTORS.map(s=>{const on=sector===s.id;
              return <button key={s.id} onClick={()=>setSector(s.id)} style={{
                fontFamily:ff,textAlign:"left",cursor:"pointer",padding:"16px 18px",borderRadius:10,
                border:`1.5px solid ${on?s.color:C.border}`,background:on?`${s.color}08`:C.surface,
                transition:"all .15s ease",boxShadow:on?`0 0 0 3px ${s.color}15`:"none",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:18,color:on?s.color:C.ghost}}>{s.icon}</span>
                  <span style={{fontSize:15,fontWeight:600,color:on?s.color:C.ink,lineHeight:1.2}}>{s.label}</span>
                </div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.4,paddingLeft:26}}>{s.desc}</div>
              </button>})}
          </div>
        </Appear>

        {sector && <Appear delay={.15} key={sector}>
          <Label>Select your product architecture</Label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:8,marginBottom:32}}>
            {PTYPES.map(p=>{const on=pt===p.id;const sectorObj=SECTORS.find(x=>x.id===sector);
              return <button key={p.id} onClick={()=>setPt(p.id)} style={{
                fontFamily:ff,textAlign:"left",cursor:"pointer",padding:"18px 20px",borderRadius:10,
                border:`1.5px solid ${on?sectorObj.color:C.border}`,background:on?`${sectorObj.color}08`:C.surface,
                transition:"all .15s ease",boxShadow:on?`0 0 0 3px ${sectorObj.color}15`:"none",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:18,color:on?sectorObj.color:C.ghost}}>{p.icon}</span>
                  <span style={{fontSize:16,fontWeight:600,color:on?sectorObj.color:C.ink}}>{p.label}</span>
                </div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.5,paddingLeft:26}}>{p.desc}</div>
              </button>})}
          </div>
        </Appear>}

        <Appear delay={.15}>
          <Card style={{marginBottom:28,background:C.raised}}>
            <Label>Enforcement deadlines</Label>
            <div style={{display:"flex",gap:20}}>
              {[{d:"Sep 11, 2026",t:"Vulnerability reporting begins",r:"Art. 14"},{d:"Dec 11, 2027",t:"Full compliance required",r:"Art. 71"},{d:"Up to €15M",t:"or 2.5% global turnover",r:"Art. 64"}]
                .map((x,i)=><div key={i} style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.ink}}>{x.d}</div>
                  <div style={{fontSize:11.5,color:C.sub,margin:"3px 0 5px"}}>{x.t}</div>
                  <Pill color={C.dim}>{x.r}</Pill>
                </div>)}
            </div>
          </Card>
        </Appear>

        <Appear delay={.2}><div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>nav(()=>setStep("screening"))} disabled={!sector||!pt} style={{
            fontFamily:ff,fontSize:14,fontWeight:600,border:"none",borderRadius:8,cursor:(sector&&pt)?"pointer":"default",
            background:(sector&&pt)?(SECTORS.find(s=>s.id===sector)?.color||C.primary):C.ghost,color:"#fff",padding:"12px 28px",
            transition:"all .2s",transform:(sector&&pt)?"scale(1)":"scale(.98)",
            boxShadow:(sector&&pt)?`0 2px 12px ${(SECTORS.find(s=>s.id===sector)?.color||C.primary)}40`:"none",
          }}>Begin assessment</button>
          <span style={{fontSize:12,color:C.mute}}>22 questions · ~130 criteria · ~20 min</span>
        </div></Appear>
      </div>
    </div>
  );

  /* ════ SCREENING ════ */
  if(step==="screening") {
    const sectorObj = SECTORS.find(s=>s.id===sector);
    // Auto-set Class I if in scope but no critical functions selected
    const effectiveClass = productInScope === true ? (criticalFunctions.length > 0 ? "II" : "I") : null;
    if(productInScope === true && productClass === null && effectiveClass) {
      setProductClass(effectiveClass);
    }
    const canProceed = productInScope !== null;

    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:ff}}>
        <style>{cssOnce}</style>
        <div style={{maxWidth:820,margin:"0 auto",padding:"clamp(24px, 5vw, 48px) clamp(16px, 4vw, 28px)"}}>
          <Appear>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"clamp(24px, 5vw, 40px)"}}>
              <span style={{fontSize:"clamp(22px, 4vw, 24px)",fontWeight:800,color:C.primary,fontFamily:ff}}>Complira</span>
            </div>
          </Appear>

          <Appear delay={.05}>
            <Pill color={C.dim}>Articles 1-9 · Regulatory Framework</Pill>
            <h1 style={{fontSize:"clamp(24px, 5vw, 32px)",fontWeight:800,color:C.ink,lineHeight:1.2,margin:"14px 0 12px",letterSpacing:"-.02em"}}>
              Product Scope & Classification
            </h1>
            <p style={{fontSize:"clamp(14px, 3vw, 16px)",color:C.sub,maxWidth:600,lineHeight:1.7,marginBottom:32}}>
              These preliminary questions determine if the EU Cyber Resilience Act applies to your product and what compliance obligations you'll face.
            </p>
          </Appear>

          {/* Article 3 - Product Scope */}
          <Appear delay={.1}>
            <Card style={{marginBottom:24}}>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <Pill color={C.primary}>Art. 3</Pill>
                <Pill color={C.dim}>Product Scope</Pill>
              </div>
              <h2 style={{fontSize:18,fontWeight:700,color:C.ink,margin:"0 0 8px",letterSpacing:"-.015em"}}>
                Does the CRA apply to your product?
              </h2>
              <p style={{fontSize:13,color:C.sub,lineHeight:1.7,marginBottom:16}}>
                The Cyber Resilience Act applies to products with digital elements (hardware or software) that will be placed on the EU market. This includes both standalone software and hardware products with embedded software.
              </p>

              <Label>Select one</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {v:true,label:"Yes — Product has digital elements",desc:"Software, hardware with embedded software, or networked devices intended for EU market"},
                  {v:false,label:"No — Out of scope",desc:"Non-digital products, internal tools, or products exempt under Art. 2(2)"}
                ].map(opt=>{
                  const selected = productInScope === opt.v;
                  return (
                    <button key={String(opt.v)} onClick={()=>setProductInScope(opt.v)} style={{
                      fontFamily:ff,textAlign:"left",cursor:"pointer",padding:"16px 18px",borderRadius:10,
                      border:`1.5px solid ${selected?sectorObj.color:C.border}`,
                      background:selected?`${sectorObj.color}08`:C.surface,
                      transition:"all .15s ease",
                      boxShadow:selected?`0 0 0 3px ${sectorObj.color}15`:"none",
                    }}>
                      <div style={{fontSize:14,fontWeight:600,color:selected?sectorObj.color:C.ink,marginBottom:6}}>
                        {opt.label}
                      </div>
                      <div style={{fontSize:11.5,color:C.sub,lineHeight:1.5}}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </Appear>

          {/* Article 7 - Classification (only if in scope) */}
          {productInScope === true && (
            <Appear delay={.15}>
              <Card style={{marginBottom:32}}>
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <Pill color={C.primary}>Art. 7 & Annex III</Pill>
                  <Pill color={C.dim}>Classification</Pill>
                </div>
                <h2 style={{fontSize:"clamp(18px, 4vw, 20px)",fontWeight:700,color:C.ink,margin:"0 0 10px",letterSpacing:"-.015em"}}>
                  Does your product provide any of these critical security functions?
                </h2>
                <p style={{fontSize:"clamp(13px, 3vw, 15px)",color:C.sub,lineHeight:1.7,marginBottom:18}}>
                  Products with these functions are Class II (Critical) under Annex III and require third-party Notified Body assessment. All other products are Class I (Important).
                </p>

                <Label>Select all that apply (leave unchecked if none apply)</Label>
                <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
                  {[
                    {id:"iam",label:"Identity & Access Management",desc:"User authentication, authorization, identity federation, SSO, directory services"},
                    {id:"browser",label:"Web Browser",desc:"Software for accessing and rendering web content (standalone or embedded browser engine)"},
                    {id:"password",label:"Password Manager",desc:"Software for storing, generating, or managing user credentials"},
                    {id:"vpn",label:"VPN (Virtual Private Network)",desc:"Secure tunneling, remote access, or encrypted networking solution"},
                    {id:"firewall",label:"Firewall / Network Security",desc:"Packet filtering, intrusion prevention, network access control"},
                    {id:"crypto",label:"Cryptographic Hardware",desc:"Smart cards, TPMs, HSMs, secure elements, or microprocessors with security features"},
                    {id:"ics",label:"ICS/SCADA",desc:"Industrial control systems, SCADA, or critical infrastructure automation"},
                    {id:"smartmeter",label:"Smart Meter",desc:"Utility metering with remote reading or control capabilities"}
                  ].map(func=>{
                    const selected = criticalFunctions.includes(func.id);
                    return (
                      <button key={func.id} onClick={()=>{
                        if(selected){
                          const newFuncs = criticalFunctions.filter(f=>f!==func.id);
                          setCriticalFunctions(newFuncs);
                          setProductClass(newFuncs.length>0?"II":"I");
                        }else{
                          const newFuncs = [...criticalFunctions,func.id];
                          setCriticalFunctions(newFuncs);
                          setProductClass("II");
                        }
                      }} style={{
                        fontFamily:ff,textAlign:"left",cursor:"pointer",padding:"clamp(14px, 3vw, 18px) clamp(14px, 3vw, 18px)",borderRadius:10,
                        border:`1.5px solid ${selected?C.warn:C.border}`,
                        background:selected?C.warnSoft:C.surface,
                        transition:"all .15s ease",
                        boxShadow:selected?`0 0 0 3px ${C.warn}15`:"none",
                        display:"flex",gap:14,alignItems:"flex-start",
                        minHeight:"60px"
                      }}>
                        <div style={{marginTop:2,width:22,height:22,borderRadius:5,border:`2px solid ${selected?C.warn:C.border}`,
                          background:selected?C.warn:C.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {selected&&<span style={{color:"#fff",fontSize:14,fontWeight:700}}>✓</span>}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"clamp(14px, 3vw, 15px)",fontWeight:600,color:selected?C.warn:C.ink,marginBottom:5}}>
                            {func.label}
                          </div>
                          <div style={{fontSize:"clamp(12px, 2.5vw, 13px)",color:C.sub,lineHeight:1.6}}>
                            {func.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Auto-determined classification result */}
                <div style={{marginTop:20,padding:"clamp(14px, 3vw, 18px) clamp(14px, 3vw, 18px)",background:criticalFunctions.length>0?C.warnSoft:C.primarySoft,borderRadius:8,borderLeft:`3px solid ${criticalFunctions.length>0?C.warn:C.primary}`}}>
                  <div style={{fontSize:"clamp(13px, 3vw, 14px)",fontWeight:600,color:criticalFunctions.length>0?C.warn:C.primary,marginBottom:8}}>
                    {criticalFunctions.length>0?"⚠️ Class II — Critical Product (Annex III)":"✓ Class I — Important Product"}
                  </div>
                  <div style={{fontSize:"clamp(12px, 2.5vw, 13px)",color:C.sub,lineHeight:1.7}}>
                    {criticalFunctions.length>0
                      ?"Your product requires third-party Notified Body conformity assessment (Art. 30) before CE marking. Budget 6-12 months for this process. Additional technical documentation and security testing requirements apply."
                      :"Your product uses standard conformity assessment via manufacturer's self-declaration (Art. 28). No third-party audit required, but you must maintain comprehensive technical documentation (Annex VII)."}
                  </div>
                </div>
              </Card>
            </Appear>
          )}

          {/* Navigation */}
          <Appear delay={.2}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button onClick={()=>nav(()=>setStep("landing"),-1)} style={{
                fontFamily:ff,fontSize:13,fontWeight:600,border:`1.5px solid ${C.border}`,borderRadius:8,
                cursor:"pointer",background:C.surface,color:C.sub,padding:"10px 20px",transition:"all .2s"
              }}>
                ← Back
              </button>

              {productInScope === false ? (
                <div style={{padding:"12px 18px",background:C.errSoft,borderRadius:8,borderLeft:`3px solid ${C.err}`,flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.err,marginBottom:2}}>CRA Not Applicable</div>
                  <div style={{fontSize:11.5,color:C.sub,lineHeight:1.5}}>
                    Your product appears to be outside CRA scope. Consider reviewing Art. 2(2) exemptions or consulting legal counsel if uncertain.
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={()=>nav(()=>{setQi(0);setStep("survey")})} disabled={!canProceed} style={{
                    fontFamily:ff,fontSize:14,fontWeight:600,border:"none",borderRadius:8,
                    cursor:canProceed?"pointer":"default",
                    background:canProceed?sectorObj.color:C.ghost,color:"#fff",padding:"12px 28px",
                    transition:"all .2s",transform:canProceed?"scale(1)":"scale(.98)",
                    boxShadow:canProceed?`0 2px 12px ${sectorObj.color}40`:"none",
                  }}>
                    Continue to assessment →
                  </button>
                  <span style={{fontSize:12,color:C.mute}}>22 questions · ~130 criteria</span>
                </>
              )}
            </div>
          </Appear>
        </div>
      </div>
    );
  }

  /* ════ SURVEY ════ */
  if(step==="survey"){
    const q=qs[qi],sec=SEC[q.section],ma=mainAns[q.id],open=showSubs[q.id]!==false;
    const subsDone=q.subs.filter(x=>subAns[x.id]!==undefined).length;
    const pct=((Object.keys(mainAns).length)/qs.length)*100;

    return <div style={{minHeight:"100vh",background:C.bg,fontFamily:ff}}>
      <style>{cssOnce}</style>
      <div style={{maxWidth:820,margin:"0 auto",padding:"clamp(24px, 4vw, 40px) clamp(16px, 4vw, 28px)"}}>
        {/* Header bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
            <Pill color={sec.accent} filled>{q.section}</Pill>
            <span style={{fontSize:14,fontWeight:500,color:sec.accent}}>{sec.label}</span>
            {productClass&&<Pill color={productClass==="II"?C.warn:C.primary}>Class {productClass}</Pill>}
          </div>
          <span style={{fontSize:14,color:C.dim,fontFamily:fm,fontWeight:500}}>{qi+1} of {qs.length}</span>
        </div>

        {/* Progress bar */}
        <div style={{height:3,borderRadius:3,background:C.soft,marginBottom:28,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${C.primary},${sec.accent})`,
            width:`${((qi+1)/qs.length)*100}%`,transition:"width .4s cubic-bezier(.4,0,.2,1)"}}/>
        </div>

        {/* Question card */}
        <div key={key} style={{animation:`${dir>0?"fadeUp":"fadeUp"} .35s ease both`}}>
          <Card>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              <Pill color={sec.accent}>{q.ref}</Pill>
              {q.sectionTitle && <Pill color={C.dim}>{q.sectionTitle}</Pill>}
            </div>
            <h2 style={{fontSize:"clamp(20px, 4vw, 22px)",fontWeight:700,color:C.ink,margin:"0 0 8px",letterSpacing:"-.015em"}}>{q.title}</h2>
            <p style={{fontSize:"clamp(15px, 3vw, 16px)",color:C.sub,lineHeight:1.7,marginBottom:16}}>{q.body}</p>

            {/* Context */}
            <div style={{background:sec.soft,borderRadius:8,padding:"14px 16px",marginBottom:20,borderLeft:`3px solid ${sec.accent}`}}>
              <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                <Pill color={SECTORS.find(s=>s.id===sector)?.color||sec.accent}>{SECTORS.find(s=>s.id===sector)?.label}</Pill>
                <Pill color={sec.accent}>{PTYPES.find(p=>p.id===pt)?.label}</Pill>
              </div>
              <div style={{fontSize:14,color:C.sub,lineHeight:1.7}}>{q.ctx}</div>
            </div>

            {/* Class II specific guidance */}
            {productClass==="II" && (q.id==="a1"||q.id==="a2"||q.id==="e1"||q.id==="e3") && (
              <div style={{marginBottom:20,padding:"14px 16px",background:C.warnSoft,borderRadius:8,borderLeft:`3px solid ${C.warn}`}}>
                <div style={{fontSize:13,fontWeight:600,color:C.warn,marginBottom:6}}>⚠️ Class II — Critical Product (Annex III)</div>
                <div style={{fontSize:13,color:C.sub,lineHeight:1.7}}>
                  {q.id==="a1"&&"Notified Body will rigorously audit risk assessment methodology, completeness, and traceability. Document all residual risks and mitigation measures."}
                  {q.id==="a2"&&"Threat modeling must cover both IT and product-specific attack vectors. Notified Body expects STRIDE/PASTA or equivalent formal methodology with documented assumptions."}
                  {q.id==="e1"&&"Technical documentation (Annex VII) will be comprehensively audited by Notified Body. Gaps or inconsistencies will delay conformity assessment. Target 90%+ maturity."}
                  {q.id==="e3"&&"Class II requires third-party Notified Body conformity assessment (Art. 30) before CE marking. Self-assessment is NOT permitted. Budget 6-12 months for this process."}
                </div>
              </div>
            )}

            {/* Main rating */}
            <Label>Overall maturity</Label>
            <Scale value={ma} onChange={v=>setMainAns(p=>({...p,[q.id]:v}))}/>

            {/* Drill-down */}
            {ma!==undefined && ma>0 && (
              <div style={{marginTop:20,borderTop:`1px solid ${C.soft}`,paddingTop:16,animation:"fadeIn .3s ease"}}>
                <button onClick={()=>setShowSubs(p=>({...p,[q.id]:!open}))} style={{
                  fontFamily:ff,background:C.raised,border:`1.5px solid ${C.border}`,padding:"12px 16px",borderRadius:8,display:"flex",alignItems:"center",gap:10,width:"100%",cursor:"pointer",marginBottom:open?14:0,
                  transition:"all .15s ease",
                  boxShadow:"0 1px 3px rgba(0,0,0,.04)"
                }}
                onMouseEnter={(e)=>e.currentTarget.style.background=C.hover}
                onMouseLeave={(e)=>e.currentTarget.style.background=C.raised}>
                  <span style={{fontSize:14,fontWeight:600,color:C.ink}}>Drill-down criteria</span>
                  <Pill color={subsDone===q.subs.length?C.ok:C.warn}>{subsDone}/{q.subs.length}</Pill>
                  <div style={{flex:1,maxWidth:80}}><Bar pct={(subsDone/q.subs.length)*100}/></div>
                  <span style={{fontSize:15,color:C.primary,fontWeight:700,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                </button>
                {open && <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {q.subs.map((sub,idx)=>{
                    const sv=subAns[sub.id];const lev=LEVELS.find(l=>l.v===sv);
                    return <div key={sub.id} style={{background:C.raised,borderRadius:8,padding:"14px 16px",
                      border:`1.5px solid ${sv!==undefined?`${lev?.c}25`:C.soft}`,
                      transition:"border-color .2s",animation:`fadeUp .25s ease ${idx*.03}s both`}}>
                      <div style={{fontSize:14,color:C.ink,lineHeight:1.7,marginBottom:10}}>
                        <span style={{color:sec.accent,fontWeight:700,fontFamily:fm,marginRight:6,fontSize:11}}>{q.id.toUpperCase()}.{idx+1}</span>
                        {sub.text}
                      </div>
                      <Scale value={sv} onChange={v=>setSubAns(p=>({...p,[sub.id]:v}))}/>
                    </div>;
                  })}
                </div>}
              </div>
            )}

            {/* Notes */}
            <textarea placeholder="Notes, evidence references, caveats…"
              value={notes[q.id]||""} onChange={e=>setNotes(p=>({...p,[q.id]:e.target.value}))}
              style={{width:"100%",minHeight:40,marginTop:16,background:C.raised,border:`1.5px solid ${C.soft}`,borderRadius:8,padding:"10px 14px",color:C.ink,fontSize:12,fontFamily:ff,resize:"vertical",outline:"none",boxSizing:"border-box",transition:"border-color .15s"}}
              onFocus={e=>{e.target.style.borderColor=C.focus}} onBlur={e=>{e.target.style.borderColor=C.soft}}/>
          </Card>

          {/* Nav */}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:14,gap:6}}>
            <button style={{fontFamily:ff,fontSize:13,fontWeight:600,background:C.surface,color:C.sub,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 20px",cursor:"pointer",opacity:qi===0?.4:1,transition:"all .15s"}}
              disabled={qi===0} onClick={()=>nav(()=>setQi(p=>p-1),-1)}>Back</button>
            <div style={{display:"flex",gap:5}}>
              {ma===undefined && qi<qs.length-1 && <button style={{fontFamily:ff,fontSize:13,fontWeight:500,background:C.surface,color:C.mute,border:`1px solid ${C.soft}`,borderRadius:8,padding:"10px 16px",cursor:"pointer",transition:"all .15s"}}
                onClick={()=>nav(()=>setQi(p=>p+1))}>Skip</button>}
              <button style={{fontFamily:ff,fontSize:13,fontWeight:600,background:C.primary,color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:ma!==undefined?"pointer":"default",opacity:ma!==undefined?1:.4,transition:"all .15s",boxShadow:ma!==undefined?"0 2px 8px rgba(61,90,241,.2)":"none"}}
                disabled={ma===undefined}
                onClick={()=>nav(()=>qi===qs.length-1?setStep("capture"):setQi(p=>p+1))}>
                {qi===qs.length-1?"View results":"Next"}</button>
            </div>
          </div>

          {/* Dot nav */}
          <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:16,flexWrap:"wrap"}}>
            {qs.map((x,i)=>{const d=mainAns[x.id]!==undefined,cur=i===qi;
              return <button key={i} onClick={()=>nav(()=>setQi(i),i>qi?1:-1)} title={x.title} style={{
                fontFamily:fm,width:22,height:22,borderRadius:5,fontSize:9,fontWeight:600,padding:0,border:"none",cursor:"pointer",
                background:cur?C.primarySoft:d?C.okSoft:C.surface,
                color:cur?C.primary:d?C.ok:C.mute,
                boxShadow:cur?`0 0 0 2px ${C.primary}30`:"none",
                transition:"all .15s",
              }}>{i+1}</button>})}
          </div>
        </div>
      </div>
    </div>;
  }

  /* ════ LEAD CAPTURE ════ */
  if(step==="capture") return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:ff}}>
      <style>{cssOnce}</style>
      <div style={{maxWidth:440,margin:"0 auto",padding:"48px 28px"}}>
        <Appear>
          <h2 style={{fontSize:22,fontWeight:700,color:C.ink,margin:"0 0 6px"}}>Assessment complete</h2>
          <p style={{fontSize:14,color:C.sub,marginBottom:20}}>Enter your details for the full gap analysis with article-level recommendations.</p>
        </Appear>
        <Appear delay={.08}><Card>
          {[{k:"name",l:"Full name",p:"Jane Smith",req:true},{k:"email",l:"Work email",p:"jane@example.com",req:true,t:"email"},{k:"company",l:"Company",p:"Acme Tech Inc.",req:true},{k:"role",l:"Role",p:"VP Engineering, CISO"},{k:"device",l:"Product name",p:"e.g. Smart Thermostat, Payment Gateway"}]
            .map(f=><div key={f.k} style={{marginBottom:13}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:C.sub,marginBottom:4}}>
                {f.l}{f.req&&<span style={{color:C.err}}> *</span>}
              </label>
              <input type={f.t||"text"} value={lead[f.k]} onChange={e=>setLead(p=>({...p,[f.k]:e.target.value}))}
                placeholder={f.p} style={{width:"100%",padding:"10px 14px",background:C.raised,border:`1.5px solid ${C.soft}`,borderRadius:8,color:C.ink,fontSize:13,fontFamily:ff,outline:"none",boxSizing:"border-box",transition:"border-color .15s"}}
                onFocus={e=>{e.target.style.borderColor=C.primary}} onBlur={e=>{e.target.style.borderColor=C.soft}}/>
            </div>)}
          <p style={{fontSize:10,color:C.mute,margin:"14px 0"}}>Used solely to deliver your report. No data sharing.</p>

          <label style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",background:C.primarySoft,border:`1.5px solid ${C.primary}30`,borderRadius:8,marginBottom:16,cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.primaryGhost}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.primarySoft}}>
            <input type="checkbox" checked={sendToClient} onChange={e=>setSendToClient(e.target.checked)}
              style={{width:16,height:16,cursor:"pointer",accentColor:C.primary}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:C.primary,marginBottom:2}}>📧 Email me a copy of my results</div>
              <div style={{fontSize:10,color:C.sub,lineHeight:1.4}}>Receive your complete CRA compliance report with detailed breakdown and actionable recommendations</div>
            </div>
          </label>

          {submitStatus.error && <div style={{padding:"10px 14px",background:C.errSoft,border:`1px solid ${C.errBd}`,borderRadius:8,marginBottom:12}}>
            <span style={{fontSize:12,color:C.err,lineHeight:1.5}}>{submitStatus.error}</span>
          </div>}

          {submitStatus.success && <div style={{padding:"10px 14px",background:C.okSoft,border:`1px solid ${C.okBd}`,borderRadius:8,marginBottom:12,animation:"fadeIn .3s ease"}}>
            <span style={{fontSize:12,color:C.ok,lineHeight:1.5}}>✓ Email sent! Redirecting to results...</span>
          </div>}

          <button style={{fontFamily:ff,width:"100%",fontSize:14,fontWeight:600,background:submitStatus.loading?C.mute:C.primary,color:"#fff",border:"none",borderRadius:8,padding:"11px 0",cursor:(lead.name&&lead.email&&lead.company&&!submitStatus.loading)?"pointer":"default",opacity:(lead.name&&lead.email&&lead.company&&!submitStatus.loading)?1:.4,transition:"all .15s"}}
            disabled={!lead.name||!lead.email||!lead.company||submitStatus.loading}
            onClick={handleLeadSubmit}>
            {submitStatus.loading?"Sending...":"View report"}
          </button>
          <div style={{textAlign:"center",marginTop:8}}>
            <button style={{fontFamily:ff,background:"none",border:"none",color:C.mute,fontSize:11,cursor:"pointer",padding:4}} onClick={()=>setStep("results")}>Skip for now</button>
          </div>
        </Card></Appear>
      </div>
    </div>
  );

  /* ════ RESULTS ════ */
  if(step==="results"){
    const sectorL=SECTORS.find(s=>s.id===sector)?.label;
    const ptL=PTYPES.find(p=>p.id===pt)?.label;
    const scored=qs.filter(q=>mainAns[q.id]&&mainAns[q.id]>0);
    const naC=qs.filter(q=>mainAns[q.id]===0).length;
    const totApp=qs.length-naC;
    const qS={},qCf={};
    scored.forEach(q=>{
      const m=mainAns[q.id],rs=q.subs.filter(x=>subAns[x.id]&&subAns[x.id]>0),na=q.subs.filter(x=>subAns[x.id]===0).length,app=q.subs.length-na;
      qCf[q.id]=app>0?Math.round((rs.length/app)*100):0;
      if(rs.length>=3){const a=rs.reduce((s,x)=>s+subAns[x.id],0)/rs.length;qS[q.id]=Math.round(((m*.25+a*.75)/5)*100)}
      else if(rs.length>0){const a=rs.reduce((s,x)=>s+subAns[x.id],0)/rs.length;qS[q.id]=Math.round(((m*.4+a*.6)/5)*100)}
      else{qS[q.id]=Math.round((m/5)*100)}
    });
    const overall=scored.length?Math.round(scored.reduce((a,q)=>a+qS[q.id],0)/scored.length):0;
    const totSubsApp=scored.reduce((a,q)=>a+q.subs.length-q.subs.filter(x=>subAns[x.id]===0).length,0);
    const totSubsR=scored.reduce((a,q)=>a+q.subs.filter(x=>subAns[x.id]&&subAns[x.id]>0).length,0);
    const conf=totSubsApp>0?Math.round((totSubsR/totSubsApp)*100):0;
    const secS={};["A","B","C","D","E"].forEach(x=>{const r=scored.filter(q=>q.section===x);secS[x]=r.length?Math.round(r.reduce((a,q)=>a+qS[q.id],0)/r.length):null});
    const gaps=scored.filter(q=>qS[q.id]<50).sort((a,b)=>qS[a.id]-qS[b.id]);
    const strong=scored.filter(q=>qS[q.id]>=70).sort((a,b)=>qS[b.id]-qS[a.id]);

    const s26Q=["d1","d2","d3","d4","c2","c5"];
    const s26S=scored.filter(q=>s26Q.includes(q.id)),s26=s26S.length?Math.round(s26S.reduce((a,q)=>a+qS[q.id],0)/s26S.length):null;
    const d27S=scored.filter(q=>!s26Q.includes(q.id)),d27=d27S.length?Math.round(d27S.reduce((a,q)=>a+qS[q.id],0)/d27S.length):null;

    // Regulatory overlap mappings by sector
    const regOverlap = {
      healthcare: {label:"FDA Section 524B",map:{a1:85,a2:90,a3:70,a4:60,b1:80,b2:50,b3:65,b4:75,b5:40,c1:70,c2:30,c3:55,c4:25,c5:75,c6:50,d1:95,d2:80,d3:45,d4:40,e1:60,e2:35,e3:10}},
      iot: {label:"RED (2014/53/EU) Art. 3.3",map:{a1:40,a2:50,a3:30,a4:20,b1:60,b2:70,b3:50,b4:55,b5:30,c1:40,c2:20,c3:35,c4:60,c5:25,c6:30,d1:50,d2:40,d3:30,d4:25,e1:35,e2:45,e3:50}},
      industrial: {label:"IEC 62443",map:{a1:90,a2:85,a3:60,a4:50,b1:70,b2:80,b3:90,b4:85,b5:75,c1:60,c2:40,c3:80,c4:45,c5:70,c6:55,d1:65,d2:75,d3:50,d4:45,e1:70,e2:50,e3:40}},
      automotive: {label:"ISO 21434 / UNECE R155",map:{a1:95,a2:90,a3:75,a4:65,b1:85,b2:70,b3:75,b4:80,b5:60,c1:80,c2:50,c3:70,c4:40,c5:85,c6:70,d1:75,d2:85,d3:60,d4:55,e1:80,e2:60,e3:70}},
      financial: {label:"PCI-DSS v4.0",map:{a1:70,a2:75,a3:80,a4:70,b1:90,b2:85,b3:95,b4:90,b5:65,c1:75,c2:50,c3:85,c4:70,c5:60,c6:55,d1:80,d2:85,d3:50,d4:60,e1:65,e2:50,e3:45}},
      generic: {label:"ISO 27001",map:{a1:75,a2:70,a3:65,a4:60,b1:70,b2:65,b3:80,b4:75,b5:55,c1:60,c2:40,c3:75,c4:65,c5:70,c6:50,d1:70,d2:75,d3:45,d4:50,e1:65,e2:50,e3:55}}
    };
    const regData=regOverlap[sector]||regOverlap.generic;
    const regO=scored.length?Math.round(scored.reduce((a,q)=>a+(regData.map[q.id]||0),0)/scored.length):0;

    const aMap=[
      {c:"§(1)",l:"Risk-based design",q:["a1","a2"]},{c:"§(2)(a)",l:"No known vulns",q:["b1","d2"]},{c:"§(2)(b)",l:"Secure defaults",q:["b2"]},{c:"§(2)(c)",l:"Security updates",q:["c1","c2"]},
      {c:"§(2)(d)",l:"Auth & access",q:["b3"]},{c:"§(2)(e)",l:"Confidentiality",q:["b4"]},{c:"§(2)(f)",l:"Integrity",q:["b4"]},{c:"§(2)(g)",l:"Data minimization",q:["c4"]},
      {c:"§(2)(h-i)",l:"Availability",q:["b5"]},{c:"§(2)(j-k)",l:"Attack surface",q:["a2","b5"]},{c:"§(2)(l)",l:"Monitoring",q:["c3"]},{c:"§(2)(m)",l:"Data removal",q:["c4"]},
      {c:"PtII§1",l:"SBOM",q:["d1"]},{c:"PtII§2-3",l:"Vuln handling",q:["d2"]},{c:"PtII§4",l:"Public advisory",q:["d4"]},{c:"PtII§5-8",l:"CVD & updates",q:["d3","c1"]},
      {c:"Art.13(5)",l:"Supply chain",q:["a3"]},{c:"Art.13(7)",l:"Post-market",q:["c5"]},{c:"Art.13(10)",l:"Recall",q:["c6"]},{c:"Art.14",l:"ENISA reporting",q:["d3"]},
      {c:"AnnexII",l:"User info",q:["e2"]},{c:"AnnexVII",l:"Tech docs",q:["e1","a4"]},{c:"AnnexV/VIII",l:"Conformity",q:["e3"]},
    ].map(ax=>{const r=scored.filter(q=>ax.q.includes(q.id));return{...ax,sc:r.length?Math.round(r.reduce((a,q)=>a+qS[q.id],0)/r.length):null}});

    // Sector-specific insights
    const sectorInsights = {
      healthcare: [
        {condition: overall>=50, c:C.primary, t:"Healthcare: FDA 524B + CRA dual compliance achievable. Focus SBOM and ENISA workflows."},
        {condition: qS.d3<40, c:C.err, t:"Healthcare: CRA ENISA + CISA ICS-CERT + FDA triple reporting required. Pre-configure now."},
        {condition: qS.e3>=60, c:C.ok, t:"Strong conformity process. Leverage MDR documentation for CRA technical file overlap."}
      ],
      iot: [
        {condition: qS.b2<50, c:C.err, t:"IoT: Consumer devices frequently ship insecure-by-default. CRA enforcement will be strict here."},
        {condition: qS.c1>=60, c:C.ok, t:"Strong OTA update capability. Critical for IoT where physical access for patching is impractical."},
        {condition: overall<50, c:C.warn, t:"Consumer IoT faces high CRA scrutiny. Establish SBOM + vuln management immediately."}
      ],
      industrial: [
        {condition: qS.c2<50, c:C.warn, t:"ICS: 10-20 year operational life common. Ensure support period meets CRA minimum + realistic usage."},
        {condition: qS.a2>=60, c:C.ok, t:"Strong threat modeling. ICS requires both IT and OT threat coverage — maintain this rigor."},
        {condition: qS.d3<40, c:C.err, t:"Critical infrastructure: ENISA + national CERT + sector regulator. Triple reporting workflows needed."}
      ],
      automotive: [
        {condition: qS.b1>=60, c:C.ok, t:"Automotive: ISO 21434 + CRA alignment is working. Maintain integrated cybersecurity approach."},
        {condition: qS.c1<50, c:C.warn, t:"Vehicle OTA update gaps. CRA + UNECE R155 both require field update capability with rollback."},
        {condition: qS.d3>=60, c:C.ok, t:"Good disclosure readiness. Align CRA ENISA with type-approval authority notifications."}
      ],
      financial: [
        {condition: qS.b1>=60, c:C.ok, t:"PCI-DSS scanning foundation strong. CRA adds exploitability assessment beyond vulnerability discovery."},
        {condition: qS.d3<40, c:C.err, t:"FinTech: CRA + DORA dual reporting. ENISA for product vulns, national authority for operational incidents."},
        {condition: qS.b4>=70, c:C.ok, t:"Strong cryptographic posture. Maintain CBOM and prepare for post-quantum migration planning."}
      ],
      generic: [
        {condition: overall>=60, c:C.ok, t:"Solid foundation across CRA requirements. Focus on sector-specific regulations next."},
        {condition: qS.d3<40, c:C.warn, t:"ENISA reporting capability essential. First enforced obligation (Sep 2026) — build workflows now."}
      ]
    };

    const ins=[];
    // Add sector-specific insights
    (sectorInsights[sector]||sectorInsights.generic).forEach(si=>{if(si.condition)ins.push({c:si.c,t:si.t})});

    // Generic cross-cutting insights
    if(qS.d1>=60&&qS.d2<40)ins.push({c:C.warn,t:"SBOM generated but no continuous vulnerability monitoring — the inventory isn't driving ongoing security."});
    if(qS.b1>=60&&qS.c1<40)ins.push({c:C.warn,t:"Strong scanning but weak update mechanism — you find vulns but can't ship fixes efficiently."});
    if(qS.b3>=60&&qS.c3<40)ins.push({c:C.warn,t:"Good authentication but poor logging — unauthorized access attempts may go undetected."});
    if(qS.a1>=60&&qS.e1<40)ins.push({c:C.warn,t:"Risk assessment done but not in technical documentation — evidence unavailable for conformity."});
    if(qS.d3<30&&!ins.some(x=>x.t.includes("ENISA")))ins.push({c:C.err,t:"Vulnerability disclosure and ENISA reporting are the first enforced obligations (Sep 2026). Critical gap."});
    if(qS.d2>=60&&qS.d4<30)ins.push({c:C.warn,t:"Vulns handled internally but no public advisories. Part II §(4) requires disclosure of fixes."});
    if(qS.a4<30)ins.push({c:C.err,t:"Build pipeline security gap. Annex VII §2(c) requires documented, secured production processes."});
    if(qS.c6<30&&overall>=40)ins.push({c:C.warn,t:"No recall procedures. Art. 13(10) requires ability to withdraw non-conformant products."});
    if(overall>=60&&conf<40)ins.push({c:C.primary,t:`Score looks reasonable but only ${conf}% criteria rated. Complete more drill-downs for reliability.`});
    if(secS.D>=70&&secS.A>=60)ins.push({c:C.ok,t:"Strong vuln management + risk governance = solid compliance foundation."});

    // Class II (Critical) specific insights
    if(productClass==="II"){
      ins.unshift({c:C.warn,t:"⚠️ Class II (Critical): Third-party Notified Body conformity assessment required before CE marking (Art. 30). Budget 6-12 months for assessment process."});
      if(qS.e1<70)ins.push({c:C.err,t:"Class II: Notified Body will audit technical documentation comprehensively. Gaps in Annex VII documentation will delay conformity."});
      if(qS.a1<70||qS.a2<70)ins.push({c:C.err,t:"Class II: Rigorous risk assessment and threat modeling required for Notified Body review. Current maturity insufficient."});
      if(overall>=70)ins.push({c:C.ok,t:"Strong overall readiness. Focus on completing technical documentation to Notified Body standards."});
    } else if(productClass==="I"){
      ins.unshift({c:C.ok,t:"✓ Class I (Important): Self-assessment conformity via EU Declaration (Art. 28). No third-party audit required."});
    }

    const weakSubs=[];
    scored.forEach(q=>q.subs.forEach((x,idx)=>{const v=subAns[x.id];if(v&&v>0&&v<=2)weakSubs.push({text:x.text,q:q.title,sec:q.section,ref:q.ref,v})}));
    weakSubs.sort((a,b)=>a.v-b.v);

    let delay=0;
    const D=()=>(delay+=.04,delay);

    return <div style={{minHeight:"100vh",background:C.bg,fontFamily:ff}}>
      <style>{cssOnce}</style>
      <div ref={resultsRef} data-results style={{maxWidth:920,margin:"0 auto",padding:"48px 28px"}}>

        <Appear><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
          <div>
            <div style={{display:"flex",gap:5,marginBottom:8}}>
              <Pill color={SECTORS.find(s=>s.id===sector)?.color||C.primary} filled>CRA Readiness Report</Pill>
              <Pill color={SECTORS.find(s=>s.id===sector)?.color||C.dim}>{sectorL}</Pill>
              <Pill color={C.dim}>{ptL}</Pill>
              {productClass&&<Pill color={productClass==="II"?C.warn:C.primary}>Class {productClass}{productClass==="II"?" — Critical":""}</Pill>}
              {lead.company&&<Pill color={C.dim}>{lead.company}</Pill>}
            </div>
            <h1 style={{fontSize:24,fontWeight:800,color:C.ink,letterSpacing:"-.025em",margin:0}}>Compliance Gap Analysis</h1>
            <p style={{fontSize:11,color:C.mute,marginTop:3}}>
              {lead.device&&`${lead.device} · `}{new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} · EU 2024/2847
            </p>
          </div>
        </div></Appear>

        {/* Top 3 */}
        <div style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",gap:10,marginBottom:12}}>
          <Appear delay={D()}><Card style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
            <Ring pct={overall}/>
            <div style={{marginTop:8,padding:"4px 10px",borderRadius:20,background:sBg(overall),border:`1px solid ${sBd(overall)}`,fontSize:10,fontWeight:600,color:sC(overall)}}>{sLabel(overall)}</div>
          </Card></Appear>

          <Appear delay={D()}><Card>
            <Label>Assessment quality</Label>
            {[{l:"Questions answered",v:`${scored.length}/${totApp}`,p:totApp?Math.round((scored.length/totApp)*100):0},
              {l:"Criteria rated",v:`${totSubsR}/${totSubsApp}`,p:conf}].map((r,i)=>
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:C.sub}}>{r.l}</span><span style={{fontFamily:fm,fontWeight:600,fontSize:10}}>{r.v}</span>
                </div><Bar pct={r.p} animated/>
              </div>)}
            <Pill color={conf>=60?C.ok:conf>=30?C.warn:C.err}>{conf>=60?"High":conf>=30?"Moderate":"Low"} confidence — {conf}%</Pill>
          </Card></Appear>

          <Appear delay={D()}><Card>
            <Label>Deadline readiness</Label>
            {[{l:"Sep 2026 — Reporting",sc:s26,d:"SBOM, vuln handling, ENISA, monitoring"},
              {l:"Dec 2027 — Full compliance",sc:d27,d:"Product security, operations, conformity"}].map((d,i)=>
              <div key={i} style={{padding:"10px 12px",background:C.raised,borderRadius:8,marginBottom:6,border:`1px solid ${C.soft}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600}}>{d.l}</span>
                  {d.sc!==null&&<span style={{fontSize:15,fontWeight:700,color:sC(d.sc),fontFamily:fm}}>{d.sc}%</span>}
                </div>
                <div style={{fontSize:10,color:C.mute,marginBottom:4}}>{d.d}</div>
                {d.sc!==null&&<Bar pct={d.sc} animated/>}
              </div>)}
          </Card></Appear>
        </div>

        {/* Section bars */}
        <Appear delay={D()}><Card style={{marginBottom:12}}>
          <Label>Section breakdown</Label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {["A","B","C","D","E"].map(x=>{const sc=secS[x];if(sc===null)return null;const m=SEC[x];
              return <div key={x} style={{background:m.soft,borderRadius:8,padding:"12px 10px",borderTop:`3px solid ${sC(sc)}`,transition:"transform .15s"}}>
                <div style={{fontSize:18,fontWeight:700,color:sC(sc),fontFamily:fm}}>{sc}%</div>
                <div style={{fontSize:10,fontWeight:600,color:C.ink,marginTop:2}}>{m.label}</div>
              </div>})}
          </div>
        </Card></Appear>

        {/* Annex heatmap */}
        <Appear delay={D()}><Card style={{marginBottom:12}}>
          <Label>CRA clause coverage — 23 requirements mapped</Label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:4}}>
            {aMap.map((ax,i)=><HeatCell key={i} ax={ax}/>)}
          </div>
        </Card></Appear>

        {/* Insights */}
        {ins.length>0&&<Appear delay={D()}><Card style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Label>{SECTORS.find(s=>s.id===sector)?.label} insights</Label>
            <Pill color={SECTORS.find(s=>s.id===sector)?.color||C.dim}>{ins.length} findings</Pill>
          </div>
          {ins.map((x,i)=><div key={i} style={{padding:"10px 14px",borderLeft:`3px solid ${x.c}`,background:C.raised,borderRadius:"0 8px 8px 0",marginBottom:4,transition:"background .15s"}}>
            <span style={{fontSize:12,color:C.sub,lineHeight:1.65}}>{x.t}</span>
          </div>)}
        </Card></Appear>}

        {/* Regulatory Alignment */}
        <Appear delay={D()}><Card style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Label>{regData.label} overlap with CRA</Label>
            <span style={{fontSize:18,fontWeight:700,color:SECTORS.find(s=>s.id===sector)?.color||C.primary,fontFamily:fm}}>{regO}%</span>
          </div>
          <p style={{fontSize:11,color:C.mute,marginBottom:10,lineHeight:1.5}}>
            {sector==="healthcare"?"Existing FDA 524B work provides strong CRA foundation. Focus gaps: ENISA reporting, public disclosure.":
             sector==="iot"?"Radio Equipment Directive (RED) cybersecurity requirements now align with CRA. Leverage for dual compliance.":
             sector==="industrial"?"IEC 62443 industrial security standards overlap significantly. CRA adds SBOM and disclosure requirements.":
             sector==="automotive"?"ISO 21434 + UNECE R155 provide strong cybersecurity base. CRA adds EU market surveillance layer.":
             sector==="financial"?"PCI-DSS already covers many product security controls. CRA adds SBOM, ENISA reporting, support period.":
             "ISO 27001 ISMS provides process foundation. CRA requires product-specific attestation and vulnerability management."}
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
            {scored.map(q=>{const ov=regData.map[q.id];
              return <div key={q.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:C.raised,borderRadius:6}}>
                <span style={{fontSize:10,fontWeight:700,fontFamily:fm,minWidth:24,color:ov>=70?C.ok:ov>=40?C.warn:C.err}}>{ov}%</span>
                <span style={{fontSize:10.5,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.title}</span>
              </div>})}
          </div>
        </Card></Appear>

        {/* Gaps */}
        {gaps.length>0&&<Appear delay={D()}><Card style={{borderLeft:`3px solid ${C.err}`,marginBottom:12}}>
          <Label>Priority gaps — {gaps.length} below 50%</Label>
          {gaps.map(q=>{const m=SEC[q.section];const weak=q.subs.filter(x=>subAns[x.id]&&subAns[x.id]>0&&subAns[x.id]<=2);
            return <div key={q.id} style={{padding:"10px 12px",background:C.raised,borderRadius:8,border:`1px solid ${C.soft}`,marginBottom:4}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:600}}>{q.title}</span><Pill color={m.accent}>{m.label}</Pill>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:sC(qS[q.id]),fontFamily:fm}}>{qS[q.id]}%</span>
              </div>
              {weak.length>0&&<div style={{marginTop:2}}>
                {weak.slice(0,3).map((w,j)=><div key={j} style={{fontSize:11,color:C.sub,lineHeight:1.5,paddingLeft:10,borderLeft:`2px solid ${C.errBd}`,marginBottom:2}}>{w.text}</div>)}
              </div>}
              <Pill color={C.dim}>{q.ref}</Pill>
            </div>})}
        </Card></Appear>}

        {/* Actions */}
        {weakSubs.length>0&&<Appear delay={D()}><Card style={{marginBottom:12}}>
          <Label>Prioritized actions — {weakSubs.length} criteria at None/Initial</Label>
          {weakSubs.slice(0,10).map((x,i)=>{const m=SEC[x.sec];const lev=LEVELS.find(l=>l.v===x.v);
            return <div key={i} style={{display:"flex",gap:8,padding:"8px 10px",background:C.raised,borderRadius:6,marginBottom:3,alignItems:"flex-start"}}>
              <span style={{minWidth:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,fontFamily:fm,background:`${lev.c}10`,color:lev.c,border:`1px solid ${lev.c}20`,flexShrink:0}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11.5,color:C.ink,lineHeight:1.5,marginBottom:3}}>{x.text}</div>
                <div style={{display:"flex",gap:3}}><Pill color={m.accent}>{x.q}</Pill><Pill color={C.dim}>{x.ref}</Pill></div>
              </div>
            </div>})}
          {weakSubs.length>10&&<div style={{fontSize:10,color:C.mute,textAlign:"center",marginTop:4}}>+{weakSubs.length-10} additional items</div>}
        </Card></Appear>}

        {/* Strengths */}
        {strong.length>0&&<Appear delay={D()}><Card style={{borderLeft:`3px solid ${C.ok}`,marginBottom:12}}>
          <Label>Strengths — {strong.length} at 70%+</Label>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {strong.map(q=><Pill key={q.id} color={C.ok}>{q.title} — {qS[q.id]}%</Pill>)}
          </div>
        </Card></Appear>}

        {/* Full scores */}
        <Appear delay={D()}><Card style={{marginBottom:12}}>
          <Label>All question scores</Label>
          {qs.map(q=>{const sc=qS[q.id];const isNA=mainAns[q.id]===0;const skip=mainAns[q.id]===undefined;const m=SEC[q.section];
            return <div key={q.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.soft}`,opacity:isNA||skip?.35:1}}>
              <span style={{width:6,height:6,borderRadius:3,background:m.accent,flexShrink:0}}/>
              <span style={{flex:1,fontSize:11.5,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.title}</span>
              {!isNA&&!skip&&<div style={{width:50}}><Bar pct={sc} h={3}/></div>}
              <span style={{fontSize:11,fontWeight:600,fontFamily:fm,minWidth:30,textAlign:"right",color:isNA?C.mute:skip?C.mute:sC(sc)}}>{isNA?"N/A":skip?"—":`${sc}%`}</span>
            </div>})}
        </Card></Appear>

        {/* CTA */}
        <Appear delay={D()}><Card style={{textAlign:"center",background:`linear-gradient(135deg,${C.ink} 0%,#2a3654 100%)`,borderColor:"transparent",color:"#fff"}}>
          <h3 style={{fontSize:18,fontWeight:700,margin:"0 0 8px",color:"#fff"}}>Automate your CRA compliance evidence</h3>
          <p style={{fontSize:12.5,color:"#a8b8d0",maxWidth:440,margin:"0 auto 18px",lineHeight:1.6}}>
            Complira scans your repos, generates Annex I-traceable documentation, and maintains SBOMs through the support period.
          </p>
          <div style={{display:"flex",justifyContent:"center",gap:8}}>
            <a href="https://calendly.com/venkata-complira/30min" target="_blank" rel="noopener noreferrer" style={{fontFamily:ff,fontSize:13,fontWeight:600,background:C.primary,color:"#fff",border:"none",borderRadius:8,padding:"11px 24px",cursor:"pointer",boxShadow:"0 2px 12px rgba(61,90,241,.3)",textDecoration:"none",display:"inline-block"}}>Schedule a walkthrough</a>
            <button onClick={downloadPDF} style={{fontFamily:ff,fontSize:13,fontWeight:600,background:"rgba(255,255,255,.1)",color:"#c8d4e8",border:`1px solid rgba(255,255,255,.15)`,borderRadius:8,padding:"11px 20px",cursor:"pointer"}}>Download report</button>
          </div>
        </Card></Appear>

        <div style={{textAlign:"center",marginTop:14,paddingBottom:40}}>
          <button style={{fontFamily:ff,background:"none",border:"none",color:C.mute,fontSize:11,cursor:"pointer"}}
            onClick={()=>{setStep("landing");setSector(null);setPt(null);setQi(0);setMainAns({});setSubAns({});setNotes({});setShowSubs({});setLead({name:"",email:"",company:"",role:"",device:""});}}>Retake assessment</button>
        </div>
      </div>
    </div>;
  }
  return null;
}

/* Heatmap cell with hover */
function HeatCell({ax}){
  const [h,setH]=useState(false);
  return <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
    display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:h?C.hover:C.raised,borderRadius:6,cursor:"default",
    transition:"all .15s",transform:h?"scale(1.02)":"none",
  }}>
    <span style={{fontSize:12,fontWeight:700,fontFamily:fm,minWidth:26,color:ax.sc!==null?sC(ax.sc):C.mute}}>{ax.sc??"—"}</span>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:10.5,fontWeight:500,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ax.l}</div>
      <div style={{fontSize:8,fontFamily:fm,color:C.mute}}>{ax.c}</div>
    </div>
  </div>;
}
