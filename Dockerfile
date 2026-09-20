FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/themes/package.json packages/themes/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/themes packages/themes
COPY packages/types packages/types
COPY prisma prisma
RUN pnpm db:generate && pnpm --filter @ggv/config build && pnpm --filter @ggv/themes build && pnpm --filter @ggv/types build && pnpm --filter @ggv/api build && pnpm prune --prod

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
