FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

COPY src/ /backend/src/

EXPOSE 7349 7350 7351

ENTRYPOINT ["/bin/sh", "-ecx", "/nakama/nakama migrate up --database.address ${DATABASE_URL} && exec /nakama/nakama --name nakama1 --database.address ${DATABASE_URL} --logger.level DEBUG --runtime.path /backend/src --runtime.js_entrypoint index.js"]