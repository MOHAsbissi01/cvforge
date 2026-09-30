import { Link } from "react-router-dom";

const steps = [
  { path: "/import", label: "Start" },
  { path: "/builder", label: "Edit" },
  { path: "/review", label: "Check" },
  { path: "/preview", label: "Export" },
] as const;

export function FlowSteps({
  current,
}: {
  current: (typeof steps)[number]["path"];
}) {
  return (
    <nav className="flow-steps" aria-label="CV creation steps">
      {steps.map((step, index) => (
        <Link
          key={step.path}
          to={step.path}
          className={current === step.path ? "active" : ""}
          aria-current={current === step.path ? "step" : undefined}
        >
          <span>{index + 1}</span> {step.label}
        </Link>
      ))}
    </nav>
  );
}
