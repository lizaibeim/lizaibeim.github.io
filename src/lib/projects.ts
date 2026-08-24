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
      "What is the Meta Project Aria collaboration?",
      "How does CoLA use smart glasses?",
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
      "Beyond capture and synchronization, the toolkit provides interactive pipeline components for sensor fusion, behavioral modeling, and visualization, so that a recorded session can be carried through to analysis without leaving the platform.",
      "It has been used in collaboration with Life Campus on a project funded by the Novo Nordisk Foundation. The toolkit paper was presented at LAK 2025 in Dublin and received the Best Short Paper Award.",
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
    ],
    suggestions: [
      "What can the OpenMMLA toolkit collect?",
      "What was the Life Campus collaboration?",
      "What did the LAK 2025 paper win?",
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
      "The work was carried out during a research assistant position at the University of Copenhagen, from June 2023 to February 2024. It covered the sociometric badges and the AprilTag spatial tracking, along with the early data collection and processing workflows that held the pieces together.",
      "mBox later evolved into OpenMMLA, which carries the same intent forward as a reusable toolkit. The field report on the platform was presented at LAK 2024 in Kyoto.",
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
      "How did the sociometric badges work?",
      "Why did mBox become OpenMMLA?",
      "What was the AprilTag tracking for?",
    ],
  },
  {
    id: "motionmatching",
    name: "MotionMatching",
    category: "System // C# & Unity",
    tagline: "A real-time motion matching system on Unity implemented in C#.",
    role: "Implementation",
    body: [
      "MotionMatching is a real-time motion matching system built on Unity and implemented in C#.",
      "It sits outside the research line as earlier, exploratory work, and has no associated publication. The source is on GitHub.",
    ],
    tech: ["Unity", "C#"],
    links: [
      {
        label: "lizaibeim/motion-matching",
        href: "https://github.com/lizaibeim/motion-matching",
        kind: "code",
      },
    ],
    publications: [],
    suggestions: [
      "What is MotionMatching built with?",
      "Is this part of the doctoral research?",
      "Where can I find the code?",
    ],
  },
  {
    id: "casperffg",
    name: "CasperFFG",
    category: "Earlier Work // Blockchain",
    tagline:
      "An undergraduate capstone project exploring Casper FFG consensus with a Python-based simulated blockchain implementation.",
    period: "2019",
    role: "Capstone project",
    body: [
      "CasperFFG is a Python implementation of the Casper FFG consensus mechanism combined with Proof of Work, running on a simulated blockchain.",
      "It was the capstone project for the Bachelor of Science in Information Technology at the Hong Kong Polytechnic University, completed in 2019. There is no associated publication; the source is on GitHub.",
    ],
    tech: ["Python", "Blockchain"],
    links: [
      {
        label: "lizaibeim/casper-ffg",
        href: "https://github.com/lizaibeim/casper-ffg",
        kind: "code",
      },
    ],
    publications: [],
    suggestions: [
      "What does the CasperFFG implementation do?",
      "Which degree was this capstone for?",
      "How does it relate to the current research?",
    ],
  },
];

// lookup used by the project detail route; an unknown or missing id falls
// through to undefined so the caller can render its own not-found state.
export const getProject = (id: string | undefined): Project | undefined =>
  PROJECTS.find((project) => project.id === id);
