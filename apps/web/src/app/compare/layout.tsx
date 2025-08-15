import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Runs",
};

const CompareLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <>{children}</>;
};

export default CompareLayout;
