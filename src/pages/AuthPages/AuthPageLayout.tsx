import React from "react";

import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:block relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/carousel/carousel-01.png"
              alt="Auth Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
          </div>

          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            <h1 className="text-5xl font-bold text-white tracking-wide drop-shadow-2xl">
              Tescam Tesca
            </h1>


            <div className="absolute right-6 bottom-6 z-50">
              <ThemeTogglerTwo />
            </div>
          </div>

          <div className="absolute right-6 bottom-6 z-50">
            <ThemeTogglerTwo />
          </div>
        </div>
      </div>
    </div>
  );
}
