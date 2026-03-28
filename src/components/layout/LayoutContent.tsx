'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { AuthProvider } from '@/lib/auth';
import { useSettingsStore } from '@/lib/store';

function SettingsInitializer({ children }: { children: React.ReactNode }) {
  const { refreshSettings } = useSettingsStore();
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);
  return <>{children}</>;
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SettingsInitializer>
          {children}
        </SettingsInitializer>
      </AuthProvider>
    </ThemeProvider>
  );
}
