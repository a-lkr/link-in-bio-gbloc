import { useEffect } from 'react';
import { loadProfileFont } from '@/lib/profile-fonts';

export function useProfileFont(font: string | null | undefined) {
  useEffect(() => {
    loadProfileFont(font);
  }, [font]);
}
