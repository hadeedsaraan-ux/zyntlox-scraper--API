# Specify the base Docker image. You can read more about
# the images from https://crawlee.dev/docs/guides/docker-images
FROM apify/actor-node:20

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm --quiet set progress=false \
    && npm install --omit=dev --second-level-error-handling

# Copy all source files
COPY . ./

# Run the actor
CMD ["npm", "start"]
