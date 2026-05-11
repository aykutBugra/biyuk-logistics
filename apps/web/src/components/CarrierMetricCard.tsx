"use client";

import type { ReactNode } from "react";
import CustomerMetricCard from "@/components/CustomerMetricCard";

type CarrierMetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: "blue" | "emerald" | "violet" | "amber";
};

export default function CarrierMetricCard(props: CarrierMetricCardProps) {
  return <CustomerMetricCard {...props} />;
}
