import React, { createContext, useContext, useMemo, useState } from "react";

type BreadcrumbContextValue = {
  title?: string;
  setTitle: (title?: string) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(
  undefined,
);

export const BreadcrumbProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [title, setTitle] = useState<string | undefined>(undefined);

  const value = useMemo(() => ({ title, setTitle }), [title]);

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

/* eslint-disable-next-line react-refresh/only-export-components */
export function useBreadcrumb() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumb must be used within a BreadcrumbProvider");
  }
  return ctx;
}
