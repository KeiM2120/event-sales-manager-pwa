import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { SectionTabs } from "../components/SectionTabs";

type ManagementSection = "products" | "bundles" | "inventory" | "events" | "expenses";

const sections: Array<{ value: ManagementSection; label: string }> = [
  { value: "products", label: "商品" },
  { value: "bundles", label: "セット" },
  { value: "inventory", label: "在庫" },
  { value: "events", label: "イベント" },
  { value: "expenses", label: "経費" },
];

const emptyBodies: Record<ManagementSection, string> = {
  products: "商品は頒布物ごとに管理します",
  bundles: "セットは複数商品の組み合わせです",
  inventory: "在庫はイベント別に管理します",
  events: "イベント日とシリーズを管理します",
  expenses: "交通費や印刷費を記録します",
};

export function ManagementPage() {
  const [section, setSection] = useState<ManagementSection>("products");
  const label = sections.find((item) => item.value === section)?.label ?? "管理";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">管理</h1>
      <SectionTabs value={section} items={sections} onChange={setSection} />
      <EmptyState title={label} body={emptyBodies[section]} />
    </div>
  );
}
