"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function PremiumScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll progress within this container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Using a micro-slope workaround (0.01 differences) to prevent Framer Motion's flat-segment interpolation bug.
  
  // Block 1
  const opacity1 = useTransform(scrollYProgress, [0, 0.12, 0.22, 1], [1, 0.99, 0, 0.01]);
  const y1 = useTransform(scrollYProgress,       [0, 0.12, 0.22, 1], [0, -0.1, -40, -40.1]);
  const scale1 = useTransform(scrollYProgress,   [0, 0.12, 0.22, 1], [1, 1.001, 1.05, 1.051]);

  // Block 2
  const opacity2 = useTransform(scrollYProgress, [0, 0.12, 0.22, 0.34, 0.44, 1], [0.01, 0.02, 1, 0.99, 0, 0.01]);
  const y2 = useTransform(scrollYProgress,       [0, 0.12, 0.22, 0.34, 0.44, 1], [40.1, 40, 0, -0.1, -40, -40.1]);
  const scale2 = useTransform(scrollYProgress,   [0, 0.12, 0.22, 0.34, 0.44, 1], [0.95, 0.951, 1, 1.001, 1.05, 1.051]);

  // Block 3
  const opacity3 = useTransform(scrollYProgress, [0, 0.34, 0.44, 0.56, 0.66, 1], [0.01, 0.02, 1, 0.99, 0, 0.01]);
  const y3 = useTransform(scrollYProgress,       [0, 0.34, 0.44, 0.56, 0.66, 1], [40.1, 40, 0, -0.1, -40, -40.1]);
  const scale3 = useTransform(scrollYProgress,   [0, 0.34, 0.44, 0.56, 0.66, 1], [0.95, 0.951, 1, 1.001, 1.05, 1.051]);

  // Block 4
  const opacity4 = useTransform(scrollYProgress, [0, 0.56, 0.66, 0.78, 0.88, 1], [0.01, 0.02, 1, 0.99, 0, 0.01]);
  const y4 = useTransform(scrollYProgress,       [0, 0.56, 0.66, 0.78, 0.88, 1], [40.1, 40, 0, -0.1, -40, -40.1]);
  const scale4 = useTransform(scrollYProgress,   [0, 0.56, 0.66, 0.78, 0.88, 1], [0.95, 0.951, 1, 1.001, 1.05, 1.051]);

  // Block 5
  const opacity5 = useTransform(scrollYProgress, [0, 0.78, 0.88, 1], [0.01, 0.02, 1, 0.99]);
  const y5 = useTransform(scrollYProgress,       [0, 0.78, 0.88, 1], [40.1, 40, 0, -0.1]);
  const scale5 = useTransform(scrollYProgress,   [0, 0.78, 0.88, 1], [0.95, 0.951, 1, 1.001]);

  return (
    <div ref={containerRef} className="h-[300vh] w-full relative -mt-[65vh]">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden pt-[40vh]">
        
        {/* Ambient aesthetic glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-[60vw] max-w-[600px] h-[400px] bg-gradient-to-tr from-amber-100 to-slate-50 rounded-full blur-3xl opacity-40"></div>
        </div>

        {/* Text 1 */}
        <motion.div key="block-1" style={{ opacity: opacity1, y: y1, scale: scale1 }} className="absolute text-center px-4 w-full">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Instant <br className="md:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
              AI Fact-Checking
            </span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-500 font-light tracking-wide max-w-2xl mx-auto">
            Listen to any live speech or podcast. We verify the claims instantly before misinformation spreads.
          </p>
        </motion.div>

        {/* Text 2 */}
        <motion.div key="block-2" style={{ opacity: opacity2, y: y2, scale: scale2 }} className="absolute text-center px-4 w-full">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Unobtrusive <br className="md:hidden" />
            <span className="text-black">Picture-in-Picture</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-500 font-light tracking-wide max-w-2xl mx-auto">
            Pop out the feed. Browse other tabs while truth flows seamlessly over your screen in a floating window.
          </p>
        </motion.div>

        {/* Text 3 */}
        <motion.div key="block-3" style={{ opacity: opacity3, y: y3, scale: scale3 }} className="absolute text-center px-4 w-full">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-400">Contextual Summaries</span><br /> on Demand.
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-500 font-light tracking-wide max-w-2xl mx-auto">
            At the end of the session, get a beautifully distilled report of every truth, lie, and nuance.
          </p>
        </motion.div>

        {/* Text 4 */}
        <motion.div key="block-4" style={{ opacity: opacity4, y: y4, scale: scale4 }} className="absolute text-center px-4 w-full">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Neutralize <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-rose-700">Misinformation</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-500 font-light tracking-wide max-w-2xl mx-auto">
            Detect bias, false claims, and logical fallacies in real-time with comprehensive evidence.
          </p>
        </motion.div>

        {/* Text 5 */}
        <motion.div key="block-5" style={{ opacity: opacity5, y: y5, scale: scale5 }} className="absolute text-center px-4 w-full">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Secure & <span className="text-black">Blazing Fast</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-500 font-light tracking-wide max-w-2xl mx-auto">
            Inference powered by cutting-edge AI architecture. Scalable, accurate, and uncompromising.
          </p>
        </motion.div>
        
      </div>
    </div>
  );
}
