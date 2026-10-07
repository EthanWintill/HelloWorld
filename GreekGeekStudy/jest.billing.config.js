// Billing logic tests run without native Expo modules or a simulator.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/services/__tests__/*.test.ts', '**/context/__tests__/RevenueCatContext.test.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      presets: ['@babel/preset-typescript'],
      plugins: ['@babel/plugin-transform-modules-commonjs', '@babel/plugin-transform-react-jsx'],
    }],
  },
}
