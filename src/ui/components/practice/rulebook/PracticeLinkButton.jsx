import "./PracticeLinkButton.css";

// PHASE 9, requirement 25 -- "[ PRACTICE THIS ]" links at the end of
// relevant sections. Clicking hands off to the existing Write Pseudocode
// tab (see PracticeLab.jsx's onPracticeLink) -- it does NOT implement any
// validation/execution itself, it's just navigation.
export default function PracticeLinkButton({ label, onClick }) {
  return (
    <button type="button" className="practice-link-btn" onClick={onClick}>
      {label} &rarr;
    </button>
  );
}
