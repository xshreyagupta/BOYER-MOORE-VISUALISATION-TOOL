import "./Theory.css";

const TEXT = "ABCBDAB";
const PATTERN = "BDA";

const NAIVE_STEPS = [
  {
    label: "Alignment 0",
    offset: 0,
    comparisons: [{ j: 0, textIdx: 0, result: "mismatch" }],
    shiftNote: "A ≠ B, so shift the pattern right by 1.",
  },
  {
    label: "Alignment 1",
    offset: 1,
    comparisons: [
      { j: 0, textIdx: 1, result: "match" },
      { j: 1, textIdx: 2, result: "mismatch" },
    ],
    shiftNote: "B matches, but C ≠ D. Shift right by 1.",
  },
  {
    label: "Alignment 2",
    offset: 2,
    comparisons: [{ j: 0, textIdx: 2, result: "mismatch" }],
    shiftNote: "C ≠ B. Shift right by 1.",
  },
  {
    label: "Alignment 3",
    offset: 3,
    comparisons: [
      { j: 0, textIdx: 3, result: "match" },
      { j: 1, textIdx: 4, result: "match" },
      { j: 2, textIdx: 5, result: "match" },
    ],
    shiftNote: "All characters match. Pattern found at index 3.",
  },
];

const BM_STEPS = [
  {
    label: "Alignment 0",
    offset: 0,
    comparisons: [{ j: 2, textIdx: 2, result: "mismatch" }],
    shiftNote: "C ≠ A. C does not occur in BDA, so Bad Character shift = 3.",
  },
  {
    label: "Alignment 3",
    offset: 3,
    comparisons: [
      { j: 2, textIdx: 5, result: "match" },
      { j: 1, textIdx: 4, result: "match" },
      { j: 0, textIdx: 3, result: "match" },
    ],
    shiftNote: "Checked right-to-left: A, D, B all match. Pattern found at index 3.",
  },
];

function AlignmentRow({ label, offset, comparisons }) {
  const resultAt = {};
  for (const comparison of comparisons) resultAt[comparison.textIdx] = comparison.result;

  return (
    <div className="theory__demo">
      <p className="theory__step-header">{label}</p>
      <div className="theory__demo-row">
        <span className="theory__demo-label">text</span>
        <div className="theory__chars">
          {Array.from(TEXT, (char, i) => (
            <span
              key={i}
              className={`theory__char${resultAt[i] ? ` theory__char--${resultAt[i]}` : ""}`}
            >
              {char}
            </span>
          ))}
        </div>
      </div>
      <div className="theory__demo-row">
        <span className="theory__demo-label">pattern</span>
        <div className="theory__chars">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`gap-${i}`} className="theory__char theory__char--gap">·</span>
          ))}
          {Array.from(PATTERN, (char, j) => {
            const textIndex = offset + j;
            const result = resultAt[textIndex];
            return (
              <span
                key={j}
                className={`theory__char${result ? ` theory__char--${result}` : ""}`}
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ComplexityTable({ title, subtitle, rows, conclusion }) {
  return (
    <div className="theory__complexity-block">
      <p className="theory__step-header">{title}</p>
      {subtitle && <p className="theory__complexity-subtitle">{subtitle}</p>}
      <div className="theory__table-wrap">
        <table className="theory__complexity-table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Pseudocode / Operation</th>
              <th>Worst-Case Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.line}>
                <td>{row.line}</td>
                <td><code>{row.op}</code></td>
                <td>{row.worst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {conclusion && (
        <div className="theory__complexity-conclusion">
          <strong>Worst-case total:</strong> {conclusion}
        </div>
      )}
    </div>
  );
}

const NAIVE_ROWS = [
  { line: "1", op: "s = 0", worst: "1" },
  { line: "2", op: "while s <= n - m", worst: "n − m + 2 checks" },
  { line: "3", op: "j = 0", worst: "n − m + 1" },
  { line: "4", op: "while j < m", worst: "At most (n − m + 1)(m + 1) checks" },
  { line: "5", op: "if text[s + j] == pattern[j]", worst: "At most (n − m + 1)m comparisons" },
  { line: "6", op: "j = j + 1", worst: "At most (n − m + 1)m" },
  { line: "7", op: "s = s + 1", worst: "n − m + 1" },
  { line: "8", op: "if j == m: report match", worst: "n − m + 1" },
];

const BC_PREP_ROWS = [
  { line: "P1", op: "for i = 0 to m - 1", worst: "m + 1 loop-condition checks" },
  { line: "P2", op: "last[pattern[i]] = i", worst: "m writes" },
];

const BC_SEARCH_ROWS = [
  { line: "1", op: "last = buildLastOccurrenceTable(pattern)", worst: "O(m) preprocessing" },
  { line: "2", op: "s = 0", worst: "1" },
  { line: "3", op: "while s <= n - m", worst: "n − m + 2 checks" },
  { line: "4", op: "j = m - 1", worst: "n − m + 1" },
  { line: "5", op: "while j >= 0 and pattern[j] == text[s + j]", worst: "At most (n − m + 1)m comparisons" },
  { line: "6", op: "j = j - 1", worst: "At most (n − m + 1)m" },
  { line: "7", op: "if j < 0: report match", worst: "n − m + 1" },
  { line: "8", op: "badCharacterShift = max(1, j - last[text[s + j]])", worst: "At most n − m + 1" },
  { line: "9", op: "s = s + badCharacterShift", worst: "At most n − m + 1" },
];

const GS_PREP_ROWS = [
  { line: "P1", op: "shift = new Array(m + 1).fill(0); bpos = new Array(m + 1).fill(0)", worst: "O(m) array initialization" },
  { line: "P2", op: "i = m; j = m + 1; bpos[i] = j", worst: "1" },
  { line: "P3", op: "while i > 0", worst: "m + 1 condition checks" },
  { line: "P4", op: "while j <= m and pattern[i - 1] != pattern[j - 1]", worst: "O(m) total across the border-position loop (amortized)" },
  { line: "P5", op: "i = i - 1; j = j - 1; bpos[i] = j", worst: "m iterations" },
  { line: "P6", op: "for i = 0 to m: if shift[i] == 0 then shift[i] = j", worst: "O(m) second pass" },
];

const GS_SEARCH_ROWS = [
  { line: "1", op: "{shift, bpos} = buildGoodSuffixTable(pattern)", worst: "O(m) preprocessing" },
  { line: "2", op: "s = 0", worst: "1" },
  { line: "3", op: "while s <= n - m", worst: "n − m + 2 checks" },
  { line: "4", op: "j = m - 1", worst: "n − m + 1" },
  { line: "5", op: "while j >= 0 and pattern[j] == text[s + j]", worst: "At most (n − m + 1)m comparisons" },
  { line: "6", op: "j = j - 1", worst: "At most (n − m + 1)m" },
  { line: "7", op: "if j < 0: report match", worst: "n − m + 1" },
  { line: "8", op: "goodSuffixShift = shift[j + 1]", worst: "At most n − m + 1" },
  { line: "9", op: "s = s + goodSuffixShift", worst: "At most n − m + 1" },
];

const FULL_PREP_ROWS = [
  { line: "P1", op: "last = buildLastOccurrenceTable(pattern)", worst: "O(m)" },
  { line: "P2", op: "{shift, bpos} = buildGoodSuffixTable(pattern)", worst: "O(m)" },
];

const FULL_SEARCH_ROWS = [
  { line: "1", op: "s = 0", worst: "1" },
  { line: "2", op: "while s <= n - m", worst: "n − m + 2 checks" },
  { line: "3", op: "j = m - 1", worst: "At most n − m + 1" },
  { line: "4", op: "while j >= 0 and pattern[j] == text[s + j]", worst: "At most (n − m + 1)m comparisons" },
  { line: "5", op: "j = j - 1", worst: "At most (n − m + 1)m" },
  { line: "6", op: "if j < 0: report match; s = s + shift[0]", worst: "At most n − m + 1" },
  { line: "7", op: "badCharacterShift = max(1, j - last[text[s + j]])", worst: "At most n − m + 1" },
  { line: "8", op: "goodSuffixShift = shift[j + 1]", worst: "At most n − m + 1" },
  { line: "9", op: "s = s + max(badCharacterShift, goodSuffixShift)", worst: "At most n − m + 1" },
];

const TAKEAWAYS = [
  ["Preprocessing", "None", "Bad Character table: O(m)", "Good Suffix table: O(m)", "Both tables: O(m) total"],
  ["Worst-case search", "O(nm)", "O(nm)", "O(nm)", "O(nm) for the straightforward version shown, without a Galil-rule optimization"],
  ["Main idea", "Try every alignment; shift by 1", "Use last occurrence of mismatched text character", "Use a matched suffix to choose a safe shift", "Use the maximum of both safe shifts"],
];

export default function Theory() {
  return (
    <div className="theory">
      <section className="theory__section">
        <span className="theory__section-label">Section A</span>
        <h2 className="theory__section-title">Conceptual Comparison</h2>
        <div className="theory__cols">
          <div className="theory__col-card">
            <h4>Naive String Matching</h4>
            <ul>
              <li>Checks every possible alignment from <code>0</code> to <code>n - m</code>.</li>
              <li>Compares characters left-to-right.</li>
              <li>Shifts by exactly one position after each attempt.</li>
              <li>No preprocessing is needed.</li>
            </ul>
          </div>
          <div className="theory__col-card">
            <h4>Boyer–Moore</h4>
            <ul>
              <li>Compares characters right-to-left.</li>
              <li>Uses Bad Character and Good Suffix rules to choose a safe shift.</li>
              <li>Preprocesses the pattern before searching.</li>
              <li>Often skips alignments, but is not always faster.</li>
            </ul>
          </div>
        </div>
        <div className="theory__prose" style={{ marginTop: 16 }}>
          <p><strong>Bad Character:</strong> use the last occurrence of the mismatched text character in the pattern to calculate a safe shift.</p>
          <p><strong>Good Suffix:</strong> if a suffix matched before the mismatch, shift to align another occurrence of that suffix or a matching pattern prefix.</p>
          <p><strong>Complete Boyer–Moore:</strong> calculate both shifts and use the larger safe shift. Preprocessing costs depend on the pattern length <code>m</code>; search costs depend on text length <code>n</code> and pattern length <code>m</code>.</p>
          <div className="theory__note">
            <strong>Complexity note:</strong> the tables below use the straightforward algorithms without the Galil optimization. For that implementation, use the safe worst-case search bound O(nm); do not assume a linear worst-case comparison bound.
          </div>
        </div>
      </section>

      <section className="theory__section">
        <span className="theory__section-label">Section B</span>
        <h2 className="theory__section-title">Visual Example — text: “{TEXT}”, pattern: “{PATTERN}”</h2>
        <div className="theory__cols">
          <div>
            <p className="theory__step-header">Naive Search — checks every alignment</p>
            {NAIVE_STEPS.map((step) => (
              <div key={step.label}>
                <AlignmentRow {...step} />
                <p className="theory__shift-arrow">{step.shiftNote}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="theory__step-header">Boyer–Moore — skips alignments</p>
            {BM_STEPS.map((step) => (
              <div key={step.label}>
                <AlignmentRow {...step} />
                <p className="theory__shift-arrow">{step.shiftNote}</p>
              </div>
            ))}
            <div className="theory__note" style={{ marginTop: 12 }}>
              The Bad Character rule skips alignments 1 and 2 and jumps to alignment 3.
            </div>
          </div>
        </div>
        <div className="theory__legend">
          <div className="theory__legend-item"><span className="theory__legend-swatch theory__legend-swatch--match" />Match</div>
          <div className="theory__legend-item"><span className="theory__legend-swatch theory__legend-swatch--mismatch" />Mismatch</div>
        </div>
      </section>

      <section className="theory__section">
        <span className="theory__section-label">Section C</span>
        <h2 className="theory__section-title">When Is Naive Better vs. Boyer–Moore?</h2>
        <p className="theory__prose" style={{ marginBottom: 16 }}>
          The better choice depends on pattern length, where the match occurs, and how much preprocessing costs.
          These examples compare character comparisons; Boyer–Moore also has preprocessing overhead.
        </p>

        <div className="theory__cols">
          <div className="theory__col-card">
            <h4 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
              Scenario 1 — Naive can be better
            </h4>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)", margin: "0 0 8px" }}>
              <strong>Text:</strong> <code>HELLO WORLD</code>
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              <strong>Pattern:</strong> <code>HE</code>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                Naive: 2 comparisons
              </span>
              <span style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                BM search: 2 comparisons + preprocessing
              </span>
            </div>
            <ul>
              <li>The pattern matches immediately at index 0.</li>
              <li>Both algorithms make two character comparisons here.</li>
              <li>Naive avoids building the Bad Character and Good Suffix tables.</li>
            </ul>
            <div style={{ marginTop: 14, padding: "9px 11px", background: "var(--amber-soft)", borderLeft: "3px solid var(--amber)", borderRadius: 4, fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>
              <strong>Takeaway:</strong> For a very short pattern or an early match, Naive may be the simpler and faster practical choice because it has no preprocessing cost.
            </div>
          </div>

          <div className="theory__col-card">
            <h4 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
              Scenario 2 — Boyer–Moore can be better
            </h4>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)", margin: "0 0 8px" }}>
              <strong>Text:</strong> <code>XXXXXXXXXXXXXXXXABCD</code>
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              <strong>Pattern:</strong> <code>ABCD</code>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                Naive: 20 comparisons
              </span>
              <span style={{ background: "var(--match-soft)", border: "1px solid var(--match)", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                BM search: 8 comparisons
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink-faint)", margin: "0 0 12px" }}>
              Illustrative count for this example, excluding Boyer–Moore preprocessing.
            </p>
            <ul>
              <li>Naive checks the first pattern character at each alignment, so it takes 16 failed comparisons before the final 4-character match.</li>
              <li>Boyer–Moore checks from the right and can skip several alignments when the text character is not in the pattern.</li>
            </ul>
            <div style={{ marginTop: 14, padding: "9px 11px", background: "var(--match-soft)", borderLeft: "3px solid var(--match)", borderRadius: 4, fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>
              <strong>Takeaway:</strong> Boyer–Moore can win on longer patterns when its shift rules skip multiple alignments.
            </div>
          </div>
        </div>

        <div className="theory__note" style={{ marginTop: 16 }}>
          <strong>Important:</strong> These are examples, not guarantees. Actual speed depends on the text, pattern, alphabet, implementation, and preprocessing overhead. Boyer–Moore does not always outperform Naive.
        </div>
      </section>

      <section className="theory__section">
        <span className="theory__section-label">Section D</span>
        <h2 className="theory__section-title">Worst-Case Time Complexity</h2>
        <p className="theory__complexity-subtitle">Let <code>n</code> be the text length and <code>m</code> be the pattern length. Each table shows only worst-case total cost.</p>

        <div className="theory__code-block"><code>{[
          "naive_search(text, pattern):",
          "  1: s = 0",
          "  2: while s <= n - m",
          "  3:   j = 0",
          "  4:   while j < m",
          "  5:     if text[s + j] == pattern[j]",
          "  6:       j = j + 1",
          "         else: break",
          "  7:   s = s + 1",
          "  8:   if j == m: report match",
        ].join("\n")}</code></div>
        <ComplexityTable
          title="1. Naive String Matching"
          rows={NAIVE_ROWS}
          conclusion="(n − m + 1)m = O(nm)"
        />

        <div className="theory__code-block" style={{ marginTop: 20 }}><code>{[
          "buildLastOccurrenceTable(pattern):",
          "  for i = 0 to m - 1:",
          "    last[pattern[i]] = i",
          "",
          "bad_character_search(text, pattern):",
          "  last = buildLastOccurrenceTable(pattern)",
          "  s = 0",
          "  while s <= n - m:",
          "    j = m - 1",
          "    while j >= 0 and pattern[j] == text[s + j]:",
          "      j = j - 1",
          "    if j < 0: report match",
          "    else: badCharacterShift = max(1, j - last[text[s + j]])",
          "    s = s + badCharacterShift",
        ].join("\n")}</code></div>
        <ComplexityTable
          title="2. Bad Character — preprocessing"
          rows={BC_PREP_ROWS}
          conclusion="O(m)"
        />
        <ComplexityTable
          title="Bad Character — search"
          rows={BC_SEARCH_ROWS}
          conclusion="(n − m + 1)m + O(n − m + 1) = O(nm)"
        />

        <div className="theory__code-block" style={{ marginTop: 20 }}><code>{[
          "buildGoodSuffixTable(pattern):",
          "  initialize shift[0..m] and bpos[0..m]",
          "  i = m; j = m + 1; bpos[i] = j",
          "  while i > 0:",
          "    while j <= m and pattern[i - 1] != pattern[j - 1]:",
          "      shift[j] = j - i; j = bpos[j]",
          "    i = i - 1; j = j - 1; bpos[i] = j",
          "  fill remaining zero entries in shift using bpos",
          "",
          "good_suffix_search(text, pattern):",
          "  {shift, bpos} = buildGoodSuffixTable(pattern)",
          "  s = 0",
          "  while s <= n - m:",
          "    j = m - 1",
          "    while j >= 0 and pattern[j] == text[s + j]:",
          "      j = j - 1",
          "    if j < 0: report match; s = s + shift[0]",
          "    else: s = s + shift[j + 1]",
        ].join("\n")}</code></div>
        <ComplexityTable
          title="3. Good Suffix — preprocessing"
          rows={GS_PREP_ROWS}
          conclusion="O(m)"
        />
        <ComplexityTable
          title="Good Suffix — search"
          rows={GS_SEARCH_ROWS}
          conclusion="(n − m + 1)m + O(n − m + 1) = O(nm)"
        />

        <div className="theory__code-block" style={{ marginTop: 20 }}><code>{[
          "boyer_moore(text, pattern):",
          "  last = buildLastOccurrenceTable(pattern)",
          "  {shift, bpos} = buildGoodSuffixTable(pattern)",
          "  s = 0",
          "  while s <= n - m:",
          "    j = m - 1",
          "    while j >= 0 and pattern[j] == text[s + j]:",
          "      j = j - 1",
          "    if j < 0:",
          "      report match; s = s + shift[0]",
          "    else:",
          "      bc = max(1, j - last[text[s + j]])",
          "      gs = shift[j + 1]",
          "      s = s + max(bc, gs)",
        ].join("\n")}</code></div>
        <ComplexityTable
          title="4. Complete Boyer–Moore — preprocessing"
          rows={FULL_PREP_ROWS}
          conclusion="O(m) + O(m) = O(m)"
        />
        <ComplexityTable
          title="Complete Boyer–Moore — search"
          rows={FULL_SEARCH_ROWS}
          conclusion="At most (n − m + 1)m character comparisons, so O(nm)"
        />
        <div className="theory__complexity-conclusion">
          <strong>Complete Boyer–Moore total:</strong> O(m) preprocessing + O(nm) search = O(nm).
        </div>
      </section>

      <section className="theory__section">
        <span className="theory__section-label">Section E</span>
        <h2 className="theory__section-title">Key Takeaways</h2>
        <div className="theory__table-wrap">
          <table className="theory__comparison-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th>Naive</th>
                <th>Bad Character</th>
                <th>Good Suffix</th>
                <th>Complete Boyer–Moore</th>
              </tr>
            </thead>
            <tbody>
              {TAKEAWAYS.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => <td key={i}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="theory__note" style={{ marginTop: 14 }}>
          Use <strong>Search</strong> to compare runs and <strong>Preprocessing Tables</strong> to explore how the pattern tables are built.
        </div>
      </section>
    </div>
  );
}
