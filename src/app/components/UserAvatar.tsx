// src/app/components/UserAvatar.tsx
import { useState, useEffect } from "react";
import { getActiveTitle } from "../data/userStore";

const STAMP_COUNT = 4;

interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { outer: "w-6 h-6",   emojiSize: "text-[12px]" },
  md: { outer: "w-7 h-7",   emojiSize: "text-[14px]" },
  lg: { outer: "w-10 h-10", emojiSize: "text-[20px]" },
};

export function UserAvatar({ size = "md", className = "" }: UserAvatarProps) {
  const [emoji, setEmoji] = useState<string | null>(null);

  const load = () => {
    const saved = localStorage.getItem("user_active_title");
    if (saved) {
      setEmoji(getActiveTitle(STAMP_COUNT).emoji);
    } else {
      setEmoji(null);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener("user_title_changed", load);
    return () => window.removeEventListener("user_title_changed", load);
  }, []);

  const { outer, emojiSize } = SIZE_MAP[size];

  return (
    <div className={`${outer} rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 ${className}`}>
      {emoji ? (
        <span className={`${emojiSize} leading-none select-none`}>{emoji}</span>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[55%] h-[55%] text-gray-400">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      )}
    </div>
  );
}
