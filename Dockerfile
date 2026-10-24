FROM apify/actor-node-playwright-chrome:20

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed dependencies successfully"

COPY --chown=myuser:myuser . ./

ENV APIFY_DISABLE_OUTDATED_WARNING=1

CMD ["npm", "start"]
