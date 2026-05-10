/**
 * Safe math expression evaluator for salt intake calculations.
 * Supports +, -, *, / with correct operator precedence.
 * No eval() — uses a simple two-pass tokenizer.
 */

/**
 * Parse and evaluate a simple arithmetic expression.
 * Returns the numeric result, or null if the input is invalid.
 *
 * Examples: "2.5" → 2.5, "5.2×0.1" → 0.52, "2+3*0.5" → 3.5
 */
export function evalExpression(raw: string): number | null {
  const s = raw
    .replace(/\u00d7/g, "*") // × → *
    .replace(/\u00f7/g, "/") // ÷ → /
    .replace(/\s+/g, "")     // strip whitespace
    .replace(/^\./, "0.");   // leading dot → 0.

  if (s.length === 0) return null;

  // Only allow digits, dot, and operators
  if (!/^[\d.+\-*/]+$/.test(s)) return null;

  // Reject consecutive operators or trailing/leading operators (except leading digit/dot)
  if (/[+\-*/]{2,}/.test(s)) return null;
  if (/[+\-*/]$/.test(s)) return null;
  if (/^[+*/]/.test(s)) return null;

  // Tokenize into numbers and operators
  const tokens = s.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens || tokens.length === 0) return null;

  // Parse into numbers and operators
  const nums: number[] = [];
  const ops: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) {
      // Expect a number
      const n = Number(tokens[i]);
      if (!Number.isFinite(n)) return null;
      nums.push(n);
    } else {
      // Expect an operator
      if (!"+-*/".includes(tokens[i])) return null;
      ops.push(tokens[i]);
    }
  }

  // Validate structure
  if (nums.length !== ops.length + 1) return null;

  // First pass: evaluate * and /
  const addNums: number[] = [nums[0]];
  const addOps: string[] = [];

  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === "*" || ops[i] === "/") {
      const left = addNums.pop()!;
      const right = nums[i + 1];
      if (ops[i] === "/" && right === 0) return null;
      addNums.push(ops[i] === "*" ? left * right : left / right);
    } else {
      addOps.push(ops[i]);
      addNums.push(nums[i + 1]);
    }
  }

  // Second pass: evaluate + and -
  let result = addNums[0];
  for (let i = 0; i < addOps.length; i++) {
    if (addOps[i] === "+") {
      result += addNums[i + 1];
    } else {
      result -= addNums[i + 1];
    }
  }

  if (!Number.isFinite(result) || result < 0) return null;

  // Round to 3 decimal places to avoid floating-point noise
  return Math.round(result * 1000) / 1000;
}

/**
 * Returns true if the input contains an arithmetic operator,
 * indicating it's an expression rather than a plain number.
 */
export function isExpression(raw: string): boolean {
  const s = raw
    .replace(/\u00d7/g, "*")
    .replace(/\u00f7/g, "/")
    .replace(/\s+/g, "");
  // Contains at least one operator that is not a leading minus
  return /[\d.][+\-*/]/.test(s);
}
