// Memoised section-visibility flags derived from the
// `mainMenuOptions` prop (which is forwarded to the ui-state store as
// the array of enum identifiers the consumer wants visible).
//
// The MainMenu component branches on three sections: action items
// (Open / Export / Clear), external link items (GitHub), and the
// version footer. Each lights up when at least one of its matching
// identifiers is present.
//
// Extracted from MainMenu.tsx under QUA4-09. Updated under FEA4-03 to
// drop the Discord reference from the rationale comment.

import { useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';

interface SectionVisibility {
  actions: boolean;
  links: boolean;
  version: boolean;
}

export const useSectionVisibility = (): SectionVisibility => {
  const mainMenuOptions = useUiStateStore((state) => {
    return state.mainMenuOptions;
  });

  return useMemo(() => {
    return {
      actions: Boolean(
        mainMenuOptions.find((opt) => {
          return opt.includes('ACTION') || opt.includes('EXPORT');
        })
      ),
      links: Boolean(
        mainMenuOptions.find((opt) => {
          return opt.includes('LINK');
        })
      ),
      version: Boolean(mainMenuOptions.includes('VERSION'))
    };
  }, [mainMenuOptions]);
};
