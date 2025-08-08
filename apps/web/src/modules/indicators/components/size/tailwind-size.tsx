import React, { memo } from "react"

import { environment } from "~/config"

const TailwindSizeIndicator: React.FC = () => {
  if (environment.NEXT_PUBLIC_ENVIRONMENT !== "LOCAL") {
    return null
  }

  return (
    <div className="center fixed right-1.5 top-1.5 z-[1000] size-8 rounded-full bg-gray-700/50 p-3 text-xs text-white">
      <div className="block sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden lg:hidden xl:hidden 2xl:hidden">sm</div>
      <div className="hidden md:block lg:hidden xl:hidden 2xl:hidden">md</div>
      <div className="hidden lg:block xl:hidden 2xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  )
}

export default memo(TailwindSizeIndicator)
