
import { useState } from "react";
import { ALGORITHMS } from "../../../engine/index.js";
import { getPseudocodePlaceholder } from "../../../practice/pseudocodePlaceholders.js";
import PracticeSetup from "./PracticeSetup.jsx";
import PracticeNav, { PRACTICE_SECTIONS } from "./PracticeNav.jsx";
import WritePseudocode from "./WritePseudocode.jsx";
import RulebookPanel from "./rulebook/RulebookPanel.jsx";
import TestYourself from "./TestYourself.jsx";
import InteractiveSimulator from "./InteractiveSimulator.jsx";
import "./PracticeLab.css";

export default function PracticeLab() {
  const [algorithm, setAlgorithm] = useState(ALGORITHMS.FULL);
  const [section, setSection] = useState(PRACTICE_SECTIONS.WRITE);

  // Keep a separate pseudocode buffer for each selected algorithm.
  const [codeByAlgorithm, setCodeByAlgorithm] = useState({});
  const code =
    codeByAlgorithm[algorithm] ?? getPseudocodePlaceholder(algorithm);

  // Inputs used by RUN MY PSEUDOCODE.
  const [text, setText] = useState("ABABABA");
  const [pattern, setPattern] = useState("ABA");

  function handleAlgorithmChange(next) {
    setAlgorithm(next);
  }

  function handleCodeChange(next) {
    setCodeByAlgorithm((prev) => ({ ...prev, [algorithm]: next }));
  }

  function handleReset() {
    setCodeByAlgorithm((prev) => ({
      ...prev,
      [algorithm]: getPseudocodePlaceholder(algorithm),
    }));
  }

  function handlePracticeLink(linkAlgorithm) {
    if (linkAlgorithm) setAlgorithm(linkAlgorithm);
    setSection(PRACTICE_SECTIONS.WRITE);
  }

  return (
    <div className="practice-lab">
      <PracticeSetup
        algorithm={algorithm}
        onAlgorithmChange={handleAlgorithmChange}
      />

      <PracticeNav section={section} onSectionChange={setSection} />

      {section === PRACTICE_SECTIONS.RULEBOOK && (
        <RulebookPanel onPracticeLink={handlePracticeLink} />
      )}

      {section === PRACTICE_SECTIONS.WRITE && (
        <WritePseudocode
          algorithm={algorithm}
          code={code}
          onChange={handleCodeChange}
          onReset={handleReset}
          text={text}
          pattern={pattern}
          onTextChange={setText}
          onPatternChange={setPattern}
        />
      )}

      
{section === PRACTICE_SECTIONS.TEST && (
  <TestYourself algorithm={algorithm} />
)}


      {section === PRACTICE_SECTIONS.SIMULATOR && (
        <InteractiveSimulator
          algorithm={algorithm}
          text={text}
          pattern={pattern}
          onTextChange={setText}
          onPatternChange={setPattern}
        />
      )}
    </div>
  );
}
