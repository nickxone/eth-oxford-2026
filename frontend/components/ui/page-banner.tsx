"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PageBannerProps = {
  image: string;
  heightClassName?: string;
  className?: string;
};

export function PageBanner({
  image,
  heightClassName = "h-28",
  className,
}: PageBannerProps) {
  return (
    <div
      className={cn(
        "relative left-1/2 w-screen -translate-x-1/2 border-b border-[#e4e9f0]",
        className
      )}
    >   
      <div  
        className={cn("relative w-full bg-cover bg-center", heightClassName)}
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 backdrop-blur-[2px]" />
      </div>
    </div>
  );
}
