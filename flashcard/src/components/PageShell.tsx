import type { ReactNode } from 'react';
import { Container } from '@mantine/core';
import type { MantineSize } from '@mantine/core';

/**
 * Page root for every flashcard page.
 *
 * - `centered`: viewport-locked, content vertically centered (Dashboard).
 * - `locked`:   viewport-locked, content top-aligned, inner element
 *               (e.g. the review card) handles its own scrolling (Review).
 * - `top`:      min-height viewport, content top-aligned, body scrolls
 *               naturally if content overflows (Edit, BatchAdd).
 *
 * iOS safe-area padding and `100svh` (not `100vh` — Safari's address-bar
 * dance breaks `vh` math) are handled here, once.
 */

type ScrollMode = 'centered' | 'top' | 'locked';

interface PageShellProps {
  children: ReactNode;
  scroll?: ScrollMode;
  size?: MantineSize;
  maw?: number | string;
}

export default function PageShell({
  children,
  scroll = 'top',
  size = 'sm',
  maw,
}: PageShellProps) {
  return (
    <Container
      size={size}
      maw={maw}
      px="md"
      w="100%"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: scroll === 'centered' ? 'center' : undefined,
        overflowY: scroll === 'top' ? 'auto' : 'hidden',
        overscrollBehavior: 'contain',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </Container>
  );
}
