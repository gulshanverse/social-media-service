export const appConfig = {
  name: 'College Confession',
  handle: '@ggv_confessions',
  maxConfessionLength: 1000,
  submissionRateLimit: Number(process.env.SUBMISSION_RATE_LIMIT ?? 5),
  submissionRateWindowSeconds: Number(process.env.SUBMISSION_RATE_WINDOW_SECONDS ?? 3600),
};
