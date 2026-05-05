'use client';

import { useEffect } from 'react';
import { useConversationStore } from '@/store/conversationStore';

export function ThemeSync() {
  const isDarkMode = useConversationStore((state) => state.isDarkMode);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      html.classList.remove('light');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  return null;
}
