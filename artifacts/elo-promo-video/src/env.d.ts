/// <reference types="vite/client" />

declare module '@assets/*' {
  const value: string;
  export default value;
}
