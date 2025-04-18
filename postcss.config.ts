import type { Plugin } from 'postcss';

const config = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    require('cssnano')({ preset: 'default' })
  ] as Plugin[],
};

export default config;
