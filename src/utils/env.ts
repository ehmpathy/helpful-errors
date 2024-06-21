const SHOULD_EXPAND_ERROR = process.env.ERROR_EXPAND === 'true';

export const getEnvOptions = (): { expand: boolean } => ({
  expand: SHOULD_EXPAND_ERROR,
});
