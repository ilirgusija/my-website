import type { ReactElement, ReactNode } from "react";

declare global {
  type NextPageWithLayout = {
    (props: any): ReactElement;
    getLayout?: (page: ReactElement) => ReactNode;
  };
}