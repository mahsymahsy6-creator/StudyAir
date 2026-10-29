import type { Subject, StudyUnit } from "@/types/database";
import { addDays, format } from "date-fns";

export interface SampleCourse {
  id: string;
  name: string;
  description: string;
  color: string;
  daysUntilExam: number;
  units: {
    title: string;
    estimated_minutes: number;
    cognitive_load: "LOW" | "MEDIUM" | "HIGH";
  }[];
}

export const SAMPLE_COURSES: SampleCourse[] = [
  {
    id: "course-dist-sys",
    name: "Distributed Systems & Cloud Architecture",
    description: "Consensus algorithms, microservices, fault tolerance, and distributed storage.",
    color: "#3b82f6",
    daysUntilExam: 18,
    units: [
      {
        title: "Raft Consensus Algorithm & Leader Election",
        estimated_minutes: 90,
        cognitive_load: "HIGH",
      },
      {
        title: "Consistent Hashing & Partitioning Strategies",
        estimated_minutes: 60,
        cognitive_load: "MEDIUM",
      },
      {
        title: "CAP Theorem, PACELC & Eventual Consistency",
        estimated_minutes: 45,
        cognitive_load: "LOW",
      },
      {
        title: "Distributed Transactions: 2PC vs Saga Orchestration",
        estimated_minutes: 75,
        cognitive_load: "HIGH",
      },
      {
        title: "Vector Clocks and Lamport Timestamps",
        estimated_minutes: 60,
        cognitive_load: "MEDIUM",
      },
    ],
  },
  {
    id: "course-neuro-phys",
    name: "Human Physiology & Neurobiology",
    description: "Cellular neurophysiology, hemodynamic regulation, and endocrine pathways.",
    color: "#10b981",
    daysUntilExam: 24,
    units: [
      {
        title: "Action Potential Kinetics & Voltage-Gated Ion Channels",
        estimated_minutes: 75,
        cognitive_load: "HIGH",
      },
      {
        title: "Cardiac Cycle, Hemodynamics & Frank-Starling Law",
        estimated_minutes: 90,
        cognitive_load: "HIGH",
      },
      {
        title: "Renin-Angiotensin-Aldosterone System (RAAS)",
        estimated_minutes: 60,
        cognitive_load: "MEDIUM",
      },
      {
        title: "Synaptic Neurotransmitters & Receptor Mechanisms",
        estimated_minutes: 45,
        cognitive_load: "LOW",
      },
      {
        title: "Glomerular Filtration Rate (GFR) Regulation",
        estimated_minutes: 60,
        cognitive_load: "MEDIUM",
      },
    ],
  },
  {
    id: "course-ai-transformers",
    name: "Deep Learning & Transformer Architectures",
    description: "Neural network backprop, attention mechanisms, and model evaluation.",
    color: "#8b5cf6",
    daysUntilExam: 14,
    units: [
      {
        title: "Scaled Dot-Product & Multi-Head Self-Attention",
        estimated_minutes: 90,
        cognitive_load: "HIGH",
      },
      {
        title: "Backpropagation Math & Computational Graph Gradients",
        estimated_minutes: 75,
        cognitive_load: "HIGH",
      },
      {
        title: "Regularization: LayerNorm, Dropout & Weight Decay",
        estimated_minutes: 45,
        cognitive_load: "MEDIUM",
      },
      {
        title: "Positional Encodings: Sinusoidal vs RoPE",
        estimated_minutes: 60,
        cognitive_load: "MEDIUM",
      },
      {
        title: "Metrics: Cross-Entropy, Perplexity & BLEU",
        estimated_minutes: 30,
        cognitive_load: "LOW",
      },
    ],
  },
];

export function generateCourseData(course: SampleCourse): {
  subject: Subject;
  units: StudyUnit[];
} {
  const timestamp = Date.now();
  const subjectId = `subj-${course.id}-${timestamp}`;
  const examDate = format(addDays(new Date(), course.daysUntilExam), "yyyy-MM-dd");

  const totalMin = course.units.reduce((acc, u) => acc + u.estimated_minutes, 0);

  const subject: Subject = {
    id: subjectId,
    user_id: "user-1",
    title: course.name,
    exam_date: examDate,
    color_hex: course.color,
    total_estimated_minutes: totalMin,
    created_at: new Date().toISOString(),
  };

  const units: StudyUnit[] = course.units.map((u, idx) => ({
    id: `su-${course.id}-${idx}-${timestamp}`,
    subject_id: subjectId,
    title: u.title,
    estimated_minutes: u.estimated_minutes,
    cognitive_load: u.cognitive_load,
    sort_order: idx + 1,
    is_completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
  }));

  return { subject, units };
}
