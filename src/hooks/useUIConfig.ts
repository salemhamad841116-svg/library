import { useState, useEffect, useCallback } from 'react';
import { UIRootConfig, UIElementConfig, UIFilterConfig } from '../types/ui';
import { getPublishedUIConfig } from '../services/uiStorage';

export function useUIConfig() {
  const [config, setConfig] = useState<UIRootConfig>(getPublishedUIConfig());

  // Listen for storage changes to hot-reload if admin publishes from another tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ais_note_ui_config') {
        setConfig(getPublishedUIConfig());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getElementsByLocation = useCallback((location: string): UIElementConfig[] => {
    return config.elements
      .filter(el => el.location === location && el.isVisible && el.status === 'published')
      .sort((a, b) => a.order - b.order);
  }, [config.elements]);

  const getElementById = useCallback((id: string): UIElementConfig | undefined => {
    return config.elements.find(el => el.id === id && el.isVisible && el.status === 'published');
  }, [config.elements]);

  const getActiveFilters = useCallback((): UIFilterConfig[] => {
    return config.filters
      .filter(f => f.isActive)
      .sort((a, b) => a.order - b.order);
  }, [config.filters]);

  return {
    config,
    refreshConfig: () => setConfig(getPublishedUIConfig()),
    getElementsByLocation,
    getElementById,
    getActiveFilters
  };
}
