FROM node:10 as build

ENV PKG_TARGET=node10-alpine-x64
RUN yarn global add pkg
RUN cd /tmp && touch noop.js && pkg --targets "${PKG_TARGET}" --output /tmp/noop noop.js 

WORKDIR /app
COPY ./package.json ./yarn.lock /app/
RUN yarn install

ADD . /app
RUN pkg --config package.json --targets "${PKG_TARGET}" --output config-builder ./bin/config-builder 

FROM alpine
WORKDIR /config
RUN apk add --no-cache libstdc++
COPY --from=build /app/config-builder /usr/local/bin/config-builder
ENTRYPOINT ["/usr/local/bin/config-builder"]