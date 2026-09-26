import { clamp } from "./format";

export type GoalRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  progress_mode: "value" | "milestones";
  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "in_progress" | "completed";
  completed_at: string | null;
  created_at: string;
  milestones_total?: number;
  milestones_done?: number;
};

export type GoalStatus = "in_progress" | "completed" | "overdue";

export function goalProgress(g: Pick<GoalRow, "progress_mode" | "target_value" | "current_value" | "status"> & {
  milestones_total?: number;
  milestones_done?: number;
}): number {
  if (g.status === "completed") return 100;
  if (g.progress_mode === "milestones") {
    const t = Number(g.milestones_total || 0);
    return t > 0 ? clamp((Number(g.milestones_done || 0) / t) * 100) : 0;
  }
  const target = Number(g.target_value) || 0;
  return target > 0 ? clamp((Number(g.current_value) / target) * 100) : 0;
}

export function goalStatus(g: Pick<GoalRow, "status" | "deadline">, today: string): GoalStatus {
  if (g.status === "completed") return "completed";
  if (g.deadline && g.deadline.slice(0, 10) < today) return "overdue";
  return "in_progress";
}

export const GOAL_SELECT = `
  SELECT g.*,
    (SELECT COUNT(*) FROM goal_milestones m WHERE m.goal_id = g.id) AS milestones_total,
    (SELECT COUNT(*) FROM goal_milestones m WHERE m.goal_id = g.id AND m.is_done = 1) AS milestones_done
  FROM goals g`;

export function decorateGoal(g: GoalRow, today: string) {
  return {
    ...g,
    milestones_total: Number(g.milestones_total || 0),
    milestones_done: Number(g.milestones_done || 0),
    progress: goalProgress(g),
    computed_status: goalStatus(g, today),
  };
}
