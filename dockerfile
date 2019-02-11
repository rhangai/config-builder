FROM node:10 as build

ENV PKG_TARGET=node10-alpine-x64
RUN yarn global add pkg
RUN cd /tmp && touch noop.js && pkg --targets "${PKG_TARGET}" --output /tmp/noop noop.js 

ADD . /app
WORKDIR /app
RUN yarn install
RUN pkg --config package.json --targets "${PKG_TARGET}" --output config-builder ./bin/config-builder 

FROM alpine
COPY --from=build /app/config-builder /usr/local/bin/config-builder
RUN apk add --no-cache libstdc++
WORKDIR /config
ENTRYPOINT ["/usr/local/bin/config-builder"]