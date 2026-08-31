import { Fragment, type ReactElement, type ReactNode } from "react";

type ChildrenProps = Readonly<{
  children?: ReactNode;
}>;

function noop(): void {}

export function Link({ children }: ChildrenProps): ReactElement {
  return <Fragment>{children ?? null}</Fragment>;
}

export function Router({ children }: ChildrenProps): ReactElement {
  return <Fragment>{children ?? null}</Fragment>;
}

export function ServerRouter({ children }: ChildrenProps): ReactElement {
  return <Fragment>{children ?? null}</Fragment>;
}

export function useRouter_UNSTABLE(): {
  readonly back: () => void;
  readonly hash: "";
  readonly path: "/";
  readonly prefetch: () => void;
  readonly push: () => void;
  readonly query: "";
  readonly replace: () => void;
} {
  return {
    back: noop,
    hash: "",
    path: "/",
    prefetch: noop,
    push: noop,
    query: "",
    replace: noop,
  };
}
