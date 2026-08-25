// the single source of truth for project content: the cards on the one-page
// site, the project detail pages, and the starter questions the agent offers.
//
// the ids below ("cola", "openmmla", "mbox", "motionmatching", "casperffg") are
// also the scope keys the worker validates a page-scoped question against, so
// this list and the worker's list must stay in sync. adding or renaming a
// project here means updating worker/worker.js in the same change.

export type ProjectLinkKind = "code" | "site" | "paper" | "preprint";

export interface ProjectLink {
  label: string;
  href: string;
  kind: ProjectLinkKind;
}

export interface ProjectPublication {
  title: string;
  authors: string;
  venue: string;
  year: number;
  href?: string;
  note?: string;
}

export interface Project {
  id: "cola" | "openmmla" | "mbox" | "motionmatching" | "casperffg";
  name: string;
  category: string;
  tagline: string;
  period?: string;
  role?: string;
  body: string[];
  tech?: string[];
  links: ProjectLink[];
  publications: ProjectPublication[];
  suggestions: string[];
}

export const PROJECTS: Project[] = [
  {
    id: "cola",
    name: "CoLA",
    category: "Platform // Wearable & AI",
    tagline:
      "A wearable multimodal AI platform for egocentric sensing, real-time behavioral analysis, and interactive facilitation in collaborative learning settings.",
    period: "Nov 2025 — Jan 2026",
    role: "Design and implementation",
    body: [
      "CoLA is a wearable multimodal AI platform for egocentric sensing, real-time behavioral analysis, and interactive facilitation in collaborative learning settings. Rather than observing a group from a fixed camera in the corner of a room, it works from the learners' own point of view.",
      "It was developed during a visiting research stay at Hiroshima City University between November 2025 and January 2026. The work prototyped an egocentric multimodal sensing setup built from mobile devices, embedded sensors, and smart glasses, and added an interactive AI facilitator that turns the incoming signals into real-time collaborative learning analytics.",
      "A research collaboration with Meta Project Aria was established around the platform, supported by a Meta Project Aria Research Partnership and hardware grant in 2026.",
    ],
    tech: ["Smart glasses", "Embedded sensors", "Mobile devices", "Multimodal AI"],
    links: [{ label: "ucph-cola.org", href: "https://ucph-cola.org", kind: "site" }],
    // the system paper is still being written, so nothing is listed here yet
    publications: [],
    suggestions: [
      "What does CoLA sense, and how?",
      "How does the AI facilitator work?",
      "What runs on the device versus the server?",
    ],
  },
  {
    id: "openmmla",
    name: "OpenMMLA",
    category: "Toolkit // IoT & Analytics",
    tagline:
      "An open-source IoT toolkit for multimodal data collection, synchronization, and analytics across real-world collaborative environments.",
    period: "Feb 2024 — present",
    role: "Design and development",
    body: [
      "OpenMMLA is an open-source IoT toolkit for multimodal data collection, synchronization, and analytics across real-world collaborative environments. It is the working platform of the doctoral research at the University of Copenhagen, designed and developed from February 2024 onward.",
      "Beyond capture and synchronization, the toolkit provides interactive pipeline components for sensor fusion, behavioral modeling, and visualization, so that a recorded session can be carried through to analysis without leaving the platform. Three pipelines ship ready to use: an audio analyzer that identifies and transcribes speakers, a multi-camera AprilTag positioning system, and a video frame analyzer that pairs a vision-language model with an LLM to label what each person is doing.",
      "It has been used in collaboration with Life Campus on a project funded by the Novo Nordisk Foundation. The toolkit paper was presented at LAK 2025 in Dublin and received the Best Short Paper Award; its evaluation put indoor positioning at roughly 8 cm of average error and reported an 18.5% diarization error rate on a noisy four-person meeting.",
    ],
    tech: ["IoT", "Sensor fusion", "Data synchronization", "Visualization"],
    links: [
      { label: "ucph-ccs/OpenMMLA", href: "https://github.com/ucph-ccs/OpenMMLA", kind: "code" },
    ],
    publications: [
      {
        title: "OpenMMLA: an IoT-based Multimodal Data Collection Toolkit for Learning Analytics",
        authors: "Z. Li, S. Yamaguchi, D. Spikol",
        venue: "LAK 2025",
        year: 2025,
        href: "https://doi.org/10.1145/3706468.3706525",
        note: "Best Short Paper Award",
      },
      {
        title:
          "Designing for Transparency: Gaze-Augmented Collaborative Action Recognition with Vision-Language Models",
        authors: "Z. Li, V. Holm-Janas, S. Yamaguchi, D. Spikol",
        venue: "ICALT 2026",
        year: 2026,
        note: "Accepted — DOI pending",
      },
    ],
    suggestions: [
      "What can the OpenMMLA toolkit collect?",
      "How accurate is the indoor positioning?",
      "How would I run it in my own lab?",
    ],
  },
  {
    id: "mbox",
    name: "mBox",
    category: "Prototype // Multimodal Sensing",
    tagline:
      "An early multimodal sensing prototype featuring sociometric badges, audio pipelines, and AprilTag-based spatial tracking that later evolved into OpenMMLA.",
    period: "Jun 2023 — Feb 2024",
    role: "Prototyping and development",
    body: [
      "mBox is an early multimodal sensing prototype built around sociometric badges, audio pipelines, and AprilTag-based spatial tracking. It was the first attempt at an open platform for collecting multimodal data from collocated group work.",
      "The work was carried out during a research assistant position at the University of Copenhagen, from June 2023 to February 2024. It covered the sociometric badges and the AprilTag spatial tracking, along with the early data collection and processing workflows that held the pieces together. The field report traces five design cycles, from a first Bluetooth badge built on the Arduino Nicla Vision board to a Wi-Fi platform whose speaker recognition reached roughly 85% accuracy in a hackathon trial.",
      "mBox later evolved into OpenMMLA, which carries the same intent forward as a reusable toolkit. The field report on the platform was presented at LAK 2024 in Kyoto; it treats cost as a design constraint throughout, at about 100 USD per badge and between 35 and 1000 USD per base station.",
    ],
    tech: ["Sociometric badges", "AprilTag", "Audio analysis"],
    links: [
      { label: "ucph-ccs/mbox-uber", href: "https://github.com/ucph-ccs/mbox-uber", kind: "code" },
    ],
    publications: [
      {
        title: "Field report for Platform mBox: Designing an Open MMLA Platform",
        authors: "Z. Li, M. T. Jensen, A. Nolte, D. Spikol",
        venue: "LAK 2024",
        year: 2024,
        href: "https://doi.org/10.1145/3636555.3636872",
      },
    ],
    suggestions: [
      "What was inside a sociometric badge?",
      "How did it track where people stood?",
      "Why did mBox become OpenMMLA?",
    ],
  },
  {
    id: "motionmatching",
    name: "MotionMatching",
    category: "System // C# & Unity",
    tagline: "A real-time motion matching system on Unity implemented in C#.",
    period: "2020 — 2021",
    role: "Design and implementation",
    body: [
      "MotionMatching is a real-time motion matching animation system built on Unity and implemented in C#. Rather than authoring an animation state machine and wiring its transitions by hand, it keeps a database of motion-capture frames and, at a fixed short interval, searches for the frame whose pose and near-future trajectory best fit what the player is asking the character to do.",
      "He built it during DADIU 2020, the Danish national academy for digital interactive entertainment. Motion captured with a Rokoko suit is baked at fifty samples per second into a pose and trajectory database; at run time a prediction model turns controller input into the coming second of movement, a cheap trajectory-only pass narrows the database to twenty candidates, and only those pay for the full pose comparison before the winning clip is blended in. An optional PCA path trades matching accuracy for search speed on slower machines.",
      "The system works at locomotion scope — idle turns, walking, running, acceleration, deceleration, stopping — and was documented in a short unpublished technical report written at DIKU in January 2021. Its measurements come from a single machine and a single observer, and its own verdict is that matching is generally satisfactory while transitions between clips still need tuning.",
    ],
    tech: ["Unity", "C#", "Motion capture", "PCA"],
    links: [
      {
        label: "lizaibeim/motion-matching",
        href: "https://github.com/lizaibeim/motion-matching",
        kind: "code",
      },
    ],
    publications: [],
    suggestions: [
      "How does the pose search actually work?",
      "What is motion matching, as a technique?",
      "Where can I find the code?",
    ],
  },
  {
    id: "casperffg",
    name: "CasperFFG",
    category: "Earlier Work // Blockchain",
    tagline:
      "A Casper FFG consensus module, with a hybrid Proof-of-Work block-production mode, on a Python blockchain simulation platform built from scratch.",
    period: "2019",
    role: "Design and implementation",
    body: [
      "CasperFFG is an implementation of Casper FFG — the proof-of-stake finality gadget, with checkpoint voting, supermajority links and both slashing conditions — written in Python and deployed onto a blockchain simulation platform.",
      "It was his capstone project at the Hong Kong Polytechnic University, completed in 2019 for the Bachelor of Science in Information Technology. The platform was written from scratch: a modular Python simulator holding one module per consensus algorithm, with an HTTP interface on every node, meant for comparing consensus algorithms and capturing the network traffic each one produces. By the end it carried PBFT, DPoS, Casper and Proof of Work.",
      "The module treats every fifth block as a checkpoint, has each validator vote from its highest justified checkpoint to each new one, and justifies a checkpoint once more than two thirds of the validators agree — slashing any validator that votes twice at one height or casts a vote surrounding its own earlier ones. Block production runs either round-robin or as a Proof-of-Work nonce search, which is what makes the deployment hybrid. The capstone report is unpublished, and its evaluation is a functional walkthrough rather than a benchmark: no throughput or latency was measured.",
    ],
    tech: ["Python", "Flask", "Blockchain"],
    links: [
      {
        label: "lizaibeim/casper-ffg",
        href: "https://github.com/lizaibeim/casper-ffg",
        kind: "code",
      },
    ],
    publications: [],
    suggestions: [
      "What is Casper FFG, as a protocol?",
      "How does the finality mechanism work here?",
      "What does the simulation actually run?",
    ],
  },
];

// lookup used by the project detail route; an unknown or missing id falls
// through to undefined so the caller can render its own not-found state.
export const getProject = (id: string | undefined): Project | undefined =>
  PROJECTS.find((project) => project.id === id);
