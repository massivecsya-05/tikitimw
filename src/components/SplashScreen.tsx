import { motion } from "framer-motion";

const LETTERS = "TikitiMW".split("");

export const SplashScreen = () => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeInOut" }}
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#F97316] to-[#EA580C]"
  >
    <div className="flex" aria-label="TikitiMW">
      {LETTERS.map((letter, i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
          className={`text-4xl md:text-5xl font-display font-extrabold ${i >= 6 ? "text-amber-200" : "text-white"}`}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  </motion.div>
);
