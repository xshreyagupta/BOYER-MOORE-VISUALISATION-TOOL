import { Fragment } from "react";
import "./ExecutionResultPanel.css";

// PHASE 11 -- renders whatever executeSource() returned: which run status
// it finished in, the runtime error (with source line/column) when there is
// one, the returned value, and a snapshot of the final variables. Renders
// nothing when there's no result yet (student hasn't pressed RUN).

const STATUS_LABELS = Object.freeze({
  completed: "COMPLETED",
  "runtime-error": "RUNTIME ERROR",
  "step-limit": "STEP LIMIT REACHED",
  invalid: "DIDN'T RUN -- FIX VALIDATION ERRORS",
});

function formatValue(value) {
  if (value === null || value === undefined) return "--";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ExecutionResultPanel({ result }) {
  if (!result) return null;

  const { status, result: returnValue, steps, finalVariables, error, diagnostics } = result;

  const isCompleted = status === "completed";
  const variableEntries = Object.entries(finalVariables ?? {});

  return (
    <div className={`execution-panel ${isCompleted ? "execution-panel--completed" : "execution-panel--error"}`}>
      <div className="execution-panel__head">
        <span className="execution-panel__status">{STATUS_LABELS[status] ?? status}</span>
        {typeof steps === "number" && (
          <span className="execution-panel__steps">
            {steps} step{steps === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {error && (
        <>
          <p className="execution-panel__message">{error.studentMessage ?? error.message}</p>
          {error.line != null && (
            <span className="execution-panel__location">
              Line {error.line}
              {error.column != null ? `, Column ${error.column}` : ""}
            </span>
          )}
        </>
      )}

      {status === "invalid" && Array.isArray(diagnostics) && diagnostics.length > 0 && (
        <ul className="execution-panel__diagnostics">
          {diagnostics.map((d, i) => (
            <li
              key={i}
              className={`execution-panel__diagnostic execution-panel__diagnostic--${d.severity}`}
            >
              Line {d.line}: {d.studentMessage ?? d.message}
            </li>
          ))}
        </ul>
      )}

      {isCompleted && (
        <div className="execution-panel__result">Returned: {formatValue(returnValue)}</div>
      )}

      {variableEntries.length > 0 && (
        <dl className="execution-panel__vars">
          {variableEntries.map(([name, value]) => (
            <Fragment key={name}>
              <dt>{name}</dt>
              <dd>{formatValue(value)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}
