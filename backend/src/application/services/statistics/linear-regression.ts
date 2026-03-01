/**
 * OLS Linear Regression using the Normal Equation: beta = (X'X)^(-1) X'Y
 *
 * Designed for small feature sets (P <= 5) and small datasets (N <= 100).
 * Uses cofactor expansion for matrix inversion.
 * Pure functions, no side effects, no external dependencies.
 */

export interface RegressionResult {
  coefficients: number[];
  rSquared: number;
  intercept: number;
}

/**
 * Fit an OLS linear regression model.
 * @param X - Feature matrix (N x P), each row is a sample
 * @param Y - Target vector (N x 1)
 * @param addIntercept - Whether to prepend a column of 1s (default: true)
 * @returns Coefficients, intercept, and R-squared
 */
export function linearRegression(
  X: readonly (readonly number[])[],
  Y: readonly number[],
  addIntercept = true,
): RegressionResult {
  const n = X.length;

  if (n === 0 || Y.length === 0) {
    return { coefficients: [], rSquared: 0, intercept: 0 };
  }
  if (n !== Y.length) {
    throw new Error(`X rows (${n}) must match Y length (${Y.length})`);
  }

  // Add intercept column if requested
  const augX = addIntercept
    ? X.map(row => [1, ...row])
    : X.map(row => [...row]);

  const p = augX[0].length;

  // Need at least p samples for the system to be determined
  if (n < p) {
    return { coefficients: new Array(addIntercept ? p - 1 : p).fill(0), rSquared: 0, intercept: 0 };
  }

  // X'X  (p x p)
  const XtX = matMul(transpose(augX), augX);

  // X'Y  (p x 1)
  const XtY = matVecMul(transpose(augX), Y);

  // beta = (X'X)^(-1) X'Y
  const XtXInv = invertMatrix(XtX);
  if (!XtXInv) {
    // Singular matrix — cannot invert
    return { coefficients: new Array(addIntercept ? p - 1 : p).fill(0), rSquared: 0, intercept: 0 };
  }

  const beta = matVecMul(XtXInv, XtY);

  // R-squared calculation
  const yMean = Y.reduce((s, v) => s + v, 0) / n;
  const ssTot = Y.reduce((s, v) => s + (v - yMean) ** 2, 0);

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    let predicted = 0;
    for (let j = 0; j < p; j++) {
      predicted += augX[i][j] * beta[j];
    }
    ssRes += (Y[i] - predicted) ** 2;
  }

  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  if (addIntercept) {
    return {
      intercept: beta[0],
      coefficients: beta.slice(1),
      rSquared,
    };
  }

  return {
    intercept: 0,
    coefficients: beta,
    rSquared,
  };
}

// ---- Matrix helpers ----

function transpose(A: readonly (readonly number[])[]): number[][] {
  if (A.length === 0) return [];
  const rows = A.length;
  const cols = A[0].length;
  const result: number[][] = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = A[i][j];
    }
  }
  return result;
}

function matMul(
  A: readonly (readonly number[])[],
  B: readonly (readonly number[])[],
): number[][] {
  const aRows = A.length;
  const aCols = A[0].length;
  const bCols = B[0].length;
  const result: number[][] = [];

  for (let i = 0; i < aRows; i++) {
    result[i] = [];
    for (let j = 0; j < bCols; j++) {
      let sum = 0;
      for (let k = 0; k < aCols; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function matVecMul(
  A: readonly (readonly number[])[],
  v: readonly number[],
): number[] {
  return A.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}

/**
 * Invert a square matrix using cofactor expansion.
 * Returns null if the matrix is singular (det ~= 0).
 */
function invertMatrix(A: readonly (readonly number[])[]): number[][] | null {
  const n = A.length;

  if (n === 1) {
    if (Math.abs(A[0][0]) < 1e-12) return null;
    return [[1 / A[0][0]]];
  }

  if (n === 2) {
    return invert2x2(A);
  }

  if (n === 3) {
    return invert3x3(A);
  }

  // General case: Gauss-Jordan elimination for n > 3
  return invertGaussJordan(A);
}

function invert2x2(A: readonly (readonly number[])[]): number[][] | null {
  const [a, b] = [A[0][0], A[0][1]];
  const [c, d] = [A[1][0], A[1][1]];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return [
    [d * invDet, -b * invDet],
    [-c * invDet, a * invDet],
  ];
}

function invert3x3(A: readonly (readonly number[])[]): number[][] | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = A;

  const det =
    a * (e * i - f * h) -
    b * (d * i - f * g) +
    c * (d * h - e * g);

  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

function invertGaussJordan(A: readonly (readonly number[])[]): number[][] | null {
  const n = A.length;
  // Create augmented matrix [A | I]
  const aug: number[][] = A.map((row, i) => {
    const newRow = [...row];
    for (let j = 0; j < n; j++) {
      newRow.push(i === j ? 1 : 0);
    }
    return newRow;
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) return null; // Singular

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract inverse from augmented matrix
  return aug.map(row => row.slice(n));
}
