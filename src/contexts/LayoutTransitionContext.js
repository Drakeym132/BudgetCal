import { createContext } from 'react';

export const LayoutTransitionContext = createContext({
  layoutMode: 'default',
  isTransitioning: false,
});
