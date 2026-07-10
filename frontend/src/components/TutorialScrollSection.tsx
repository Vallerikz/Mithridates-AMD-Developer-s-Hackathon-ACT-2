"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

const panels = [
  {
    title: "Start a Live Session",
    desc: "Launch the engine to begin a new real-time fact-checking session directly from your browser.",
    img: "/step1.png"
  },
  {
    title: "Connect the Stream",
    desc: "Share your browser tab to instantly pipe any live audio into our local transcription pipeline.",
    img: "/step2.png",
    credit: "Source: Nikhil Kamath - Elon Musk: A Different Conversation"
  },
  {
    title: "Watch the Truth Unfold",
    desc: "Claims are cross-referenced in real-time. Keep the PiP overlay open to stay informed in any tab.",
    img: "/step3.png",
    credit: "Source: Nikhil Kamath - Elon Musk: A Different Conversation"
  },
  {
    title: "Distilled Knowledge",
    desc: "End the session to receive a beautifully crafted summary report of all findings.",
    img: "/step4.png",
    credit: "Source: Nikhil Kamath - Elon Musk: A Different Conversation"
  }
];

export function TutorialScrollSection() {
  const targetRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);

  return (
    <section ref={targetRef} className="relative h-[400vh] bg-white w-full border-t border-slate-100">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div style={{ x }} className="flex w-[400vw]">
          {panels.map((panel, i) => (
            <div key={i} className="relative flex h-screen w-screen items-center justify-center px-6 md:px-12">
              
              <div className="max-w-6xl w-full flex flex-col md:flex-row items-center gap-12 md:gap-24">
                
                {/* Image Placeholder */}
                <div className="flex-1 w-full flex flex-col items-center">
                  <div className="w-full aspect-video bg-slate-50 rounded-3xl overflow-hidden relative shadow-sm border border-slate-200 flex items-center justify-center">
                    {panel.img ? (
                      <Image
                        src={panel.img}
                        alt={panel.title}
                        fill
                        className="object-contain p-2 md:p-4"
                      />
                    ) : (
                      <span className="text-slate-400 font-medium tracking-wide">Image Placeholder (Replace in code)</span>
                    )}
                  </div>
                  {/* Optional Source Credit */}
                  {panel.credit && (
                    <div className="mt-4 text-xs text-slate-400 font-medium tracking-wide text-center">
                      {panel.credit}
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 flex flex-col items-start text-left">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold tracking-wide uppercase mb-6 border border-slate-200">
                    Step {i + 1}
                  </div>
                  <h3 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                    {panel.title}
                  </h3>
                  <p className="text-lg md:text-xl text-slate-500 font-light leading-relaxed max-w-lg">
                    {panel.desc}
                  </p>
                </div>
                
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
