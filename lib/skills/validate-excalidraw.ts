export type ExcalidrawValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateExcalidraw(_payload: unknown): ExcalidrawValidationResult {
  return { valid: true, errors: [] };
}
