import { SVGProps } from "react";
const RdcPointer = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
  </svg>
);
export default RdcPointer;
