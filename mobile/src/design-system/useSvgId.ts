import { useId } from "react";

/**
 * Id único para <Defs> de SVG. Na web, telas empilhadas ficam no mesmo documento; ids repetidos
 * fariam um degradê apontar para o SVG escondido de outra tela.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
