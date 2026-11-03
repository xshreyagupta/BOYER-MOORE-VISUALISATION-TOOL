// PHASE 11 -- Runtime data structures for the pseudocode interpreter.
//
// Pure data structures only -- no AST walking here (see
// expressionEvaluator.js / statementExecutor.js) and no React. Kept
// separate so interpreter.js, expressionEvaluator.js, and
// statementExecutor.js can all share the same variable/array model without
// circular imports.

export class Scope {
  constructor(parent = null, label = "block") {
    this.parent = parent;
    this.label = label;
    this.vars = new Map();
  }

  has(name) {
    if (this.vars.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }

  get(name) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    return undefined;
  }

  owner(name) {
    if (this.vars.has(name)) return this;
    return this.parent ? this.parent.owner(name) : null;
  }

  declare(name, value) {
    this.vars.set(name, value);
  }

  assign(name, value) {
    const owner = this.owner(name);
    (owner ?? this).vars.set(name, value);
  }

  snapshot() {
    const chain = [];
    let s = this;

    while (s) {
      chain.push(s);
      s = s.parent;
    }

    const out = {};

    for (let i = chain.length - 1; i >= 0; i--) {
      for (const [k, v] of chain[i].vars) {
        out[k] = displayValue(v);
      }
    }

    return out;
  }
}

export class RuntimeArray {
  constructor({ length = null, isString = false } = {}) {
    this.entries = new Map();
    this.length = length;
    this.isString = isString;
  }

  static fromString(str) {
    const arr = new RuntimeArray({
      length: str.length,
      isString: true,
    });

    for (let i = 0; i < str.length; i++) {
      arr.entries.set(i, str[i]);
    }

    return arr;
  }

  has(index) {
    return this.entries.has(index);
  }

  get(index) {
    return this.entries.get(index);
  }

  set(index, value) {
    this.entries.set(index, value);

    if (this.length === null || index >= this.length) {
      this.length = index + 1;
    }
  }
}

export function isRuntimeArray(value) {
  return value instanceof RuntimeArray;
}

export function displayValue(value) {
  if (value instanceof RuntimeArray) {
    return value.isString
      ? [...value.entries.values()].join("")
      : Object.fromEntries(value.entries);
  }

  return value;
}

export function isNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}