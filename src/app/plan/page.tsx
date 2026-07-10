import { PlanWorkspace } from "@/components/plan/plan-workspace";

export default function PlanPage() {
  // 幅の制約はステップごとに異なる(②はフル幅)ため、PlanWorkspace側で付ける。
  return <PlanWorkspace />;
}
