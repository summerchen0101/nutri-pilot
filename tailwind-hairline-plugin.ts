import plugin from 'tailwindcss/plugin';

/** pointer: fine → theme.borderWidth.hairline；coarse → 1px（見 docs/09-ui-design.md） */
export const hairlineBorderPlugin = plugin(({ addBase, addUtilities, theme }) => {
  const hairlineWidth = theme('borderWidth.hairline');
  if (typeof hairlineWidth !== 'string') {
    throw new Error('tailwind theme.extend.borderWidth.hairline must be a string');
  }

  addBase({
    '@media (pointer: coarse)': {
      ':root': {
        '--hairline-border-shorthand': '1px solid hsl(var(--border))',
      },
    },
  });

  const coarseOnePx = {
    '@media (pointer: coarse)': {
      borderWidth: '1px',
    },
  };

  const coarseTopOnePx = {
    '@media (pointer: coarse)': {
      borderTopWidth: '1px',
    },
  };

  const coarseBottomOnePx = {
    '@media (pointer: coarse)': {
      borderBottomWidth: '1px',
    },
  };

  const coarseLeftOnePx = {
    '@media (pointer: coarse)': {
      borderLeftWidth: '1px',
    },
  };

  const coarseRightOnePx = {
    '@media (pointer: coarse)': {
      borderRightWidth: '1px',
    },
  };

  addUtilities({
    '.border-hairline': {
      borderWidth: hairlineWidth,
      ...coarseOnePx,
    },
    '.border-t-hairline': {
      borderTopWidth: hairlineWidth,
      ...coarseTopOnePx,
    },
    '.border-b-hairline': {
      borderBottomWidth: hairlineWidth,
      ...coarseBottomOnePx,
    },
    '.border-l-hairline': {
      borderLeftWidth: hairlineWidth,
      ...coarseLeftOnePx,
    },
    '.border-r-hairline': {
      borderRightWidth: hairlineWidth,
      ...coarseRightOnePx,
    },
    '.divide-y-hairline > :not([hidden]) ~ :not([hidden])': {
      borderTopWidth: hairlineWidth,
      '@media (pointer: coarse)': {
        borderTopWidth: '1px',
      },
    },
  });
});
