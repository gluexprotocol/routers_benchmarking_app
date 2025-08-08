"use client";

import React from "react";
import Image, { StaticImageData } from "next/image";
import clsx from "clsx";

interface LogoProps {
  background?: "transparent" | "white" | "black" | "salmon" | "verde";
  logo?: "dark" | "light" | "full_dark" | "full_light" | "verde" | "full_verde";
  className?: string;
  imageClassName?: string;
}

const Logo: React.FC<LogoProps> = ({
  background: b,
  logo: l,
  className,
  imageClassName,
}) => {
  const background = React.useMemo(() => {
    switch (b) {
      case "transparent":
        return "bg-transparent";
      case "white":
        return "bg-gluex-gris";
      case "black":
        return "bg-gluex-negro";
      case "salmon":
        return "bg-gluex-salmon";
      case "verde":
        return "bg-gluex-verde";
      default:
        return "bg-gluex-salmon";
    }
  }, [b]);

  const logo = React.useMemo(() => {
    switch (l) {
      case "dark":
        return "/brand/logo-dark.svg";
      case "light":
        return "/brand/logo-light.svg";
      case "verde":
        return "/brand/logo-verde.svg";
      case "full_dark":
        return "/brand/logo-full-dark.svg";
      case "full_light":
        return "/brand/logo-full-light.svg";
      case "full_verde":
        return "/brand/logo-full-verde.svg";
      default:
        return "/brand/logo-full-light.svg";
    }
  }, [l]);

  return (
    <div className={clsx("w-full center", className, background)}>
      <Image
        src={logo}
        className={clsx("", imageClassName)}
        alt="GlueX logo"
        priority
        width={l === "dark" || l === "light" ? 60 : 228}
        height={l === "dark" || l === "light" ? 60 : 28}
      />
    </div>
  );
};

export default React.memo(Logo);
