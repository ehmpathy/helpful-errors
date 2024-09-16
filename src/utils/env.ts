const SHOULD_EXPAND_ERROR = process.env.ERROR_EXPAND !== 'false'; // true by default

export const getEnvOptions = (): { expand: boolean } => ({
  expand: SHOULD_EXPAND_ERROR,
});
