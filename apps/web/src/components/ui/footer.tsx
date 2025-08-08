import React from "react";
import Image from "next/image";
import Link from "next/link";

const HomeFooter = () => {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mx-auto px-2.5">
        <div
          data-slot="separator-root"
          className="!bg-secondary w-full !h-px"
        />

        <footer className="flex md:flex-row flex-col justify-between items-center gap-4 py-2">
          <ul className="flex items-center gap-5 md:gap-4 max-w-max text-sm">
            {[
              {
                title: "Contact Us",
                url: "https://bento.me/gluex-protocol",
                target: "_blank",
              },
              {
                title: "Blog",
                url: "https://mirror.xyz/gluex.eth",
                target: "_blank",
              },
              {
                title: "Careers",
                url: "https://www.linkedin.com/company/gluex-protocol/jobs",
                target: "_blank",
              },
              {
                title: "Legal",
                url: "/legal",
              },
              {
                title: "Brand Kit",
                url: "/brand-kit",
              },
            ].map((item) => (
              <li
                key={item.url}
                className="text-secondary hover:text-primary whitespace-nowrap transition-all"
              >
                <Link
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  href={item.url}
                  target={item.target}
                  rel="noopener noreferrer nofollow"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>

        <div className="relative flex bg-cover mt-2.5 sm:mt-6 pt-10 pb-12">
          <Image
            src={"/brand/logo-full-dull.svg"}
            alt="GlueX Logo"
            className="opacity-75 text-border-secondary w-full"
            width={1080}
            height={620}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-background via-background/75 to-transparent pointer-events-none"
            style={{
              zIndex: 1,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default HomeFooter;
